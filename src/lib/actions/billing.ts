"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { errorState, successState, type FormState } from "@core/form";
import { publicEnv } from "@/lib/env";
import { getStripe, isStripeConfigured } from "@/lib/stripe/client";
import { priceIdFor, type BillingInterval } from "@/lib/stripe/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * 購入と契約管理（§10.2）。
 *
 * カード情報はアプリで一切受け取らない。Stripe のホスト画面へ誘導する（§9）。
 */

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function isInterval(value: unknown): value is BillingInterval {
  return value === "monthly" || value === "yearly";
}

export async function startCheckoutAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isStripeConfigured) {
    return errorState("決済の準備が整っていません。しばらくお待ちください");
  }

  const interval = formData.get("interval");
  if (!isInterval(interval)) {
    return errorState("プランを選び直してください");
  }

  const priceId = priceIdFor(interval);
  if (!priceId) {
    return errorState("プランの設定が見つかりませんでした");
  }

  const { supabase, user } = await currentUser();
  const stripe = getStripe();

  // 既存の顧客がいれば使い回す（重複した顧客レコードを作らない）
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let url: string | null = null;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: existing?.customer_id ?? undefined,
      customer_email: existing?.customer_id ? undefined : (user.email ?? undefined),
      // Webhook 側で利用者を特定するための紐付け
      client_reference_id: user.id,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
      success_url: `${publicEnv.siteUrl}/pro?checkout=success`,
      cancel_url: `${publicEnv.siteUrl}/pro?checkout=canceled`,
      allow_promotion_codes: true,
    });

    url = session.url;
  } catch (error) {
    console.error("checkout session creation failed", error);
    return errorState("決済ページを開けませんでした。時間をおいてお試しください");
  }

  if (!url) {
    return errorState("決済ページを開けませんでした");
  }

  redirect(url);
}

/** 契約内容の確認・解約（Stripe のカスタマーポータル） */
export async function openBillingPortalAction(
  _prevState: FormState,
  _formData: FormData,
): Promise<FormState> {
  if (!isStripeConfigured) {
    return errorState("決済の準備が整っていません");
  }

  const { supabase, user } = await currentUser();

  const { data } = await supabase
    .from("subscriptions")
    .select("customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data?.customer_id) {
    return errorState("契約情報が見つかりませんでした");
  }

  const stripe = getStripe();
  let url: string;

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: data.customer_id,
      return_url: `${publicEnv.siteUrl}/pro`,
    });
    url = session.url;
  } catch (error) {
    console.error("billing portal session creation failed", error);
    return errorState("管理画面を開けませんでした。時間をおいてお試しください");
  }

  redirect(url);
}

/**
 * 開発用：Stripe を設定せずに Pro の見え方を確認するための切り替え。
 * 本番では動かないよう NODE_ENV で閉じている。
 */
export async function toggleProForDevAction(
  _prevState: FormState,
  _formData: FormData,
): Promise<FormState> {
  if (process.env.NODE_ENV === "production") {
    return errorState("この操作は開発環境でのみ使えます");
  }

  const { supabase, user } = await currentUser();

  const { data } = await supabase
    .from("subscriptions")
    .select("entitlement")
    .eq("user_id", user.id)
    .maybeSingle();

  const next = data?.entitlement === "pro" ? "free" : "pro";

  // subscriptions は本人でも書き込めないため service_role を使う
  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({ entitlement: next, status: null, current_period_end: null })
    .eq("user_id", user.id);
  await admin.from("profiles").update({ plan: next }).eq("id", user.id);

  revalidatePath("/", "layout");
  return successState(`開発用：プランを ${next === "pro" ? "Pro" : "Free"} に切り替えました`);
}
