import type Stripe from "stripe";

import { getStripe, isStripeConfigured, stripeEnv } from "@/lib/stripe/client";
import { applySubscription, linkCheckoutSession } from "@/lib/stripe/sync";

/**
 * Stripe Webhook（§9「支払いWebhookは署名検証を行い、成功後にentitlementを更新する」）。
 *
 * 署名検証には生のリクエストボディが要るため request.text() で受け取る。
 * 検証に通らないリクエストは一切処理しない。
 */

export async function POST(request: Request) {
  if (!isStripeConfigured || !stripeEnv.webhookSecret) {
    return new Response("stripe not configured", { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("missing signature", { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      stripeEnv.webhookSecret,
    );
  } catch {
    // 署名が合わない＝送信元を信用できない。内容は一切見ない。
    return new Response("invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await linkCheckoutSession(event.data.object);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await applySubscription(event.data.object);
        break;

      default:
        // 購読していないイベントは受け取るだけにする
        break;
    }
  } catch (error) {
    console.error("stripe webhook handling failed", event.type, error);
    // 5xx を返すと Stripe が再送してくれる
    return new Response("handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
