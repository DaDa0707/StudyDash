/**
 * 課金状態から権限を導く（仕様書 §7 / §9）。純粋関数のみ。
 *
 * 権限の正は subscriptions テーブル。ここはその行をどう解釈するかだけを決める。
 * DB アクセスや Stripe 呼び出しは含めない。
 */

import type { PlanType, SubscriptionStatus } from "@/types/database";

/** この状態のあいだは Pro を使える。past_due は決済再試行中の猶予。 */
const PRO_STATUSES: readonly SubscriptionStatus[] = ["active", "trialing", "past_due"];

/**
 * 期間終了後に権限を残す猶予日数。
 * Webhook を取りこぼしても Pro が永久に残らないようにするための保険。
 */
export const GRACE_DAYS = 3;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 課金状態だけから導いた権限 */
export function entitlementFromSubscription(
  status: SubscriptionStatus | null,
  currentPeriodEnd: Date | null,
  now: Date,
): PlanType {
  if (!status || !PRO_STATUSES.includes(status)) return "free";

  if (currentPeriodEnd && now.getTime() > currentPeriodEnd.getTime() + GRACE_DAYS * MS_PER_DAY) {
    return "free";
  }

  return "pro";
}

export interface SubscriptionSnapshot {
  entitlement: PlanType;
  status: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
}

/**
 * 実際に適用する権限。
 *
 * 保存済みの entitlement と、課金状態から導いた権限のうち**制限が強いほう**を採る。
 * 課金情報を持たない行（運営による手動付与など）は保存値をそのまま尊重する。
 */
export function effectiveEntitlement(
  subscription: SubscriptionSnapshot,
  now: Date,
): PlanType {
  if (subscription.entitlement !== "pro") return "free";

  // Stripe 等の課金レコードが無い＝手動付与。保存値を信じる。
  if (!subscription.status) return "pro";

  return entitlementFromSubscription(
    subscription.status,
    subscription.currentPeriodEnd,
    now,
  );
}

/** 決済プロバイダから受け取った状態を DB に書ける形へ整える */
export function toSubscriptionUpdate(input: {
  status: SubscriptionStatus | null;
  currentPeriodEnd: Date | null;
  now: Date;
}): { status: SubscriptionStatus | null; current_period_end: string | null; entitlement: PlanType } {
  return {
    status: input.status,
    current_period_end: input.currentPeriodEnd?.toISOString() ?? null,
    entitlement: entitlementFromSubscription(input.status, input.currentPeriodEnd, input.now),
  };
}

/** Stripe の subscription.status を DB の enum に落とす。未知の値は null。 */
export function normalizeStripeStatus(status: string): SubscriptionStatus | null {
  const known: readonly SubscriptionStatus[] = [
    "incomplete",
    "trialing",
    "active",
    "past_due",
    "canceled",
    "unpaid",
  ];

  if ((known as readonly string[]).includes(status)) {
    return status as SubscriptionStatus;
  }

  // incomplete_expired / paused など。権限は与えない側に倒す。
  return status === "incomplete_expired" ? "incomplete" : null;
}
