import { Check, Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { BillingPortalButton, PlanPicker, type PlanOption } from "@/components/billing/plan-picker";
import { DevPlanToggle } from "@/components/billing/dev-plan-toggle";
import { formatDueDate } from "@/lib/deadline";
import { isPro, planComparison } from "@/lib/entitlements";
import { getEntitlement } from "@/lib/entitlements.server";
import { isStripeConfigured } from "@/lib/stripe/client";
import { listBillingPlans } from "@/lib/stripe/plans";
import { syncSubscriptionForUser } from "@/lib/stripe/sync";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Pro" };

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProPage({ searchParams }: PageProps<"/pro">) {
  const [params, supabase] = await Promise.all([searchParams, createClient()]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const checkout = single(params.checkout);

  /**
   * §10.2 手順6「再読込せず可能なら即時にPro機能を解放」。
   * 決済から戻った直後は Webhook がまだ届いていないことがあるため、
   * ここで Stripe から取り直して反映する。
   */
  if (checkout === "success" && user && isStripeConfigured) {
    try {
      await syncSubscriptionForUser(user.id);
    } catch (error) {
      console.error("post-checkout sync failed", error);
    }
  }

  const [entitlement, plans] = await Promise.all([
    getEntitlement(),
    isStripeConfigured ? listBillingPlans() : Promise.resolve([]),
  ]);

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user!.id)
    .maybeSingle();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user!.id)
    .single();

  const timezone = profile?.timezone ?? "Asia/Tokyo";
  const pro = isPro(entitlement);
  const comparison = planComparison();

  const planOptions: PlanOption[] = plans.map((plan) => ({
    interval: plan.interval,
    label: plan.label,
    priceText: plan.priceText,
    monthlyEquivalent: plan.monthlyEquivalent,
  }));

  return (
    <div className="space-y-8">
      <header className="text-center">
        <span
          aria-hidden
          className="inline-flex size-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400"
        >
          <Sparkles className="size-6" />
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          {pro ? "StudyDash Pro を利用中" : "StudyDash Pro"}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {pro
            ? "上限なしで使えます。いつでも解約できます。"
            : "上限の解除、科目別の分析、通知とテーマのカスタマイズ。"}
        </p>
      </header>

      {checkout === "canceled" ? (
        <p role="status" className="rounded-lg bg-muted px-3 py-2.5 text-center text-sm">
          決済を中止しました。いつでもやり直せます。
        </p>
      ) : null}

      {checkout === "success" && pro ? (
        <p
          role="status"
          className="rounded-lg bg-emerald-500/10 px-3 py-2.5 text-center text-sm text-emerald-700 dark:text-emerald-400"
        >
          ありがとうございます。Proの機能が使えるようになりました。
        </p>
      ) : null}

      {pro && subscription?.current_period_end ? (
        <p className="rounded-xl bg-card p-4 text-sm ring-1 ring-foreground/10">
          次回更新日：{formatDueDate(new Date(subscription.current_period_end), timezone)}
          {subscription.status === "past_due" ? (
            <span className="mt-1 block text-destructive">
              お支払いを確認できていません。支払い方法をご確認ください。
            </span>
          ) : null}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">できることの違い</h2>

        <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
          <table className="w-full text-sm">
            <caption className="sr-only">FreeとProの機能比較</caption>
            <thead>
              <tr className="bg-muted/50">
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  機能
                </th>
                <th scope="col" className="px-2 py-2 text-left font-medium">
                  Free
                </th>
                <th scope="col" className="px-2 py-2 text-left font-medium">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {comparison.map((row) => (
                <tr key={row.feature} className="bg-card">
                  <th scope="row" className="px-3 py-2.5 text-left font-normal">
                    {row.feature}
                  </th>
                  <td className="px-2 py-2.5 text-xs text-muted-foreground">{row.free}</td>
                  <td className="px-2 py-2.5 text-xs font-medium">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          時間割・課題・Todo・タイマーという中心の機能は、無料のままずっと使えます。
        </p>
      </section>

      {pro ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">契約の管理</h2>
          {isStripeConfigured ? (
            <BillingPortalButton />
          ) : (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              決済の設定が未完了のため、管理画面を開けません。
            </p>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">プランを選ぶ</h2>

          {planOptions.length > 0 ? (
            <PlanPicker plans={planOptions} />
          ) : (
            <div className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  決済の準備中です。Stripe の設定（価格ID・秘密鍵）を入れると、
                  ここに月額/年額プランが表示されます。
                </span>
              </p>
            </div>
          )}
        </section>
      )}

      {process.env.NODE_ENV !== "production" ? (
        <section className="space-y-2 border-t pt-6">
          <h2 className="text-xs font-semibold text-muted-foreground">開発用</h2>
          <p className="text-xs text-muted-foreground">
            Stripe を設定せずに Pro の見え方を確認するための切り替えです。本番では動きません。
          </p>
          <DevPlanToggle isPro={pro} />
        </section>
      ) : null}
    </div>
  );
}
