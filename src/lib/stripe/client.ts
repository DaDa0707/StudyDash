import "server-only";

import Stripe from "stripe";

/**
 * Stripe クライアント（サーバー専用）。
 * 秘密鍵はクライアントへ渡さない（§14.1）。
 */

export const stripeEnv = {
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  priceMonthly: process.env.STRIPE_PRICE_MONTHLY,
  priceYearly: process.env.STRIPE_PRICE_YEARLY,
} as const;

/** Stripe の設定が揃っているか。未設定なら Pro ページは「準備中」を出す。 */
export const isStripeConfigured = Boolean(
  stripeEnv.secretKey && stripeEnv.priceMonthly && stripeEnv.priceYearly,
);

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeEnv.secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY が設定されていません。.env.example を参考に設定してください。",
    );
  }

  // apiVersion は指定せず、SDK が固定しているバージョンに従う
  cached ??= new Stripe(stripeEnv.secretKey, { typescript: true });
  return cached;
}
