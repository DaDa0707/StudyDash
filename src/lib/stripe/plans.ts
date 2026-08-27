import "server-only";

import { getStripe, isStripeConfigured, stripeEnv } from "@/lib/stripe/client";

/** §10.2「月額/年額プランを選択」 */
export type BillingInterval = "monthly" | "yearly";

export interface BillingPlan {
  interval: BillingInterval;
  label: string;
  priceId: string;
  /** 例: ￥480 */
  priceText: string;
  /** 年額のときの月あたり換算。月額プランでは null */
  monthlyEquivalent: string | null;
}

export function priceIdFor(interval: BillingInterval): string | undefined {
  return interval === "monthly" ? stripeEnv.priceMonthly : stripeEnv.priceYearly;
}

function formatAmount(amount: number, currency: string): string {
  // JPY は最小単位が円そのもの。他通貨は 1/100 単位。
  const zeroDecimal = currency.toLowerCase() === "jpy";
  const value = zeroDecimal ? amount : amount / 100;

  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: zeroDecimal ? 0 : 2,
  }).format(value);
}

/**
 * 価格は Stripe を正とする。
 * 仕様書 §6 のとおり金額はコードに固定せず、ダッシュボードの設定を読み出す。
 */
export async function listBillingPlans(): Promise<BillingPlan[]> {
  if (!isStripeConfigured) return [];

  const stripe = getStripe();
  const targets: { interval: BillingInterval; label: string; priceId: string }[] = [
    { interval: "monthly", label: "月額", priceId: stripeEnv.priceMonthly! },
    { interval: "yearly", label: "年額", priceId: stripeEnv.priceYearly! },
  ];

  const plans = await Promise.all(
    targets.map(async ({ interval, label, priceId }) => {
      const price = await stripe.prices.retrieve(priceId);
      const amount = price.unit_amount;
      if (amount === null) return null;

      const currency = price.currency;

      return {
        interval,
        label,
        priceId,
        priceText: formatAmount(amount, currency),
        monthlyEquivalent:
          interval === "yearly" ? `月あたり ${formatAmount(Math.round(amount / 12), currency)}` : null,
      } satisfies BillingPlan;
    }),
  );

  return plans.filter((plan): plan is BillingPlan => plan !== null);
}
