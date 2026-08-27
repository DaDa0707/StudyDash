import "server-only";

import type Stripe from "stripe";

import { normalizeStripeStatus, toSubscriptionUpdate } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe/client";

/**
 * Stripe のサブスクリプションを subscriptions テーブルへ反映する（§9）。
 *
 * subscriptions は本人でも書き込めない（RLS に INSERT/UPDATE ポリシーが無い）。
 * ここだけが service_role で書き込む。呼び出し元は
 *   1) 署名検証済みの Webhook
 *   2) 決済直後の復帰（Webhook 到着待ちの取りこぼし対策 / §10.2 手順6）
 * に限ること。
 */

/** Stripe のサブスクリプションから期間終了日時を取り出す */
function periodEndOf(subscription: Stripe.Subscription): Date | null {
  // 期間はサブスクリプション明細（items）側に載る
  const seconds = subscription.items.data[0]?.current_period_end;
  return typeof seconds === "number" ? new Date(seconds * 1000) : null;
}

/** metadata から所有ユーザーを特定する。無ければ customer_id で引き当てる。 */
async function resolveUserId(subscription: Stripe.Subscription): Promise<string | null> {
  const fromMetadata = subscription.metadata?.user_id;
  if (typeof fromMetadata === "string" && fromMetadata !== "") return fromMetadata;

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;

  if (!customerId) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("customer_id", customerId)
    .maybeSingle();

  return data?.user_id ?? null;
}

export async function applySubscription(
  subscription: Stripe.Subscription,
  now: Date = new Date(),
): Promise<{ applied: boolean; userId: string | null }> {
  const userId = await resolveUserId(subscription);
  if (!userId) return { applied: false, userId: null };

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : (subscription.customer?.id ?? null);

  const update = toSubscriptionUpdate({
    status: normalizeStripeStatus(subscription.status),
    currentPeriodEnd: periodEndOf(subscription),
    now,
  });

  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({
      provider: "stripe",
      customer_id: customerId,
      subscription_id: subscription.id,
      ...update,
    })
    .eq("user_id", userId);

  if (error) throw new Error(`subscriptions の更新に失敗しました: ${error.message}`);

  // profiles.plan は表示用キャッシュ。権限判定には使わない（§7）。
  await admin.from("profiles").update({ plan: update.entitlement }).eq("id", userId);

  return { applied: true, userId };
}

/**
 * ユーザーの最新の課金状態を Stripe から取り直して反映する。
 * 決済から戻った直後、Webhook より先に画面が開いた場合に使う（§10.2 手順6）。
 */
export async function syncSubscriptionForUser(userId: string): Promise<void> {
  const admin = createAdminClient();

  const { data } = await admin
    .from("subscriptions")
    .select("customer_id, subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data?.customer_id && !data?.subscription_id) return;

  const stripe = getStripe();

  if (data.subscription_id) {
    const subscription = await stripe.subscriptions.retrieve(data.subscription_id);
    await applySubscription(subscription);
    return;
  }

  const list = await stripe.subscriptions.list({
    customer: data.customer_id!,
    status: "all",
    limit: 1,
  });

  const latest = list.data[0];
  if (latest) await applySubscription(latest);
}

/** Checkout 完了時に customer / subscription を利用者へ紐付ける */
export async function linkCheckoutSession(session: Stripe.Checkout.Session): Promise<void> {
  const userId =
    session.client_reference_id ??
    (typeof session.metadata?.user_id === "string" ? session.metadata.user_id : null);

  if (!userId) return;

  const customerId =
    typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null);

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription?.id ?? null);

  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({ provider: "stripe", customer_id: customerId, subscription_id: subscriptionId })
    .eq("user_id", userId);

  if (subscriptionId) {
    const stripe = getStripe();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await applySubscription(subscription);
  }
}
