import { describe, expect, it } from "vitest";

import {
  GRACE_DAYS,
  effectiveEntitlement,
  entitlementFromSubscription,
  normalizeStripeStatus,
  toSubscriptionUpdate,
} from "../billing";
import { PLAN_LIMITS, planComparison } from "../entitlements";

const now = new Date("2026-08-25T10:00:00Z");
const daysFromNow = (days: number) =>
  new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

describe("entitlementFromSubscription（§7 権限は課金状態から導く）", () => {
  it("有効な状態は Pro", () => {
    for (const status of ["active", "trialing", "past_due"] as const) {
      expect(entitlementFromSubscription(status, daysFromNow(10), now)).toBe("pro");
    }
  });

  it("終了・未払い・未完了は Free", () => {
    for (const status of ["canceled", "unpaid", "incomplete"] as const) {
      expect(entitlementFromSubscription(status, daysFromNow(10), now)).toBe("free");
    }
  });

  it("状態が無ければ Free", () => {
    expect(entitlementFromSubscription(null, null, now)).toBe("free");
  });

  it("期間終了直後は猶予のあいだ Pro のまま", () => {
    expect(entitlementFromSubscription("active", daysFromNow(-1), now)).toBe("pro");
    expect(entitlementFromSubscription("active", daysFromNow(-GRACE_DAYS + 0.5), now)).toBe(
      "pro",
    );
  });

  it("猶予を超えたら Free に落ちる（Webhook 取りこぼしの保険）", () => {
    expect(entitlementFromSubscription("active", daysFromNow(-GRACE_DAYS - 1), now)).toBe(
      "free",
    );
  });

  it("期間終了が未設定なら状態だけで判断する", () => {
    expect(entitlementFromSubscription("active", null, now)).toBe("pro");
  });
});

describe("effectiveEntitlement（保存値と課金状態の厳しいほうを採る）", () => {
  it("保存値が free なら課金状態に関わらず Free", () => {
    expect(
      effectiveEntitlement(
        { entitlement: "free", status: "active", currentPeriodEnd: daysFromNow(10) },
        now,
      ),
    ).toBe("free");
  });

  it("保存値が pro で課金も有効なら Pro", () => {
    expect(
      effectiveEntitlement(
        { entitlement: "pro", status: "active", currentPeriodEnd: daysFromNow(10) },
        now,
      ),
    ).toBe("pro");
  });

  it("保存値が pro でも課金が切れていれば Free", () => {
    expect(
      effectiveEntitlement(
        { entitlement: "pro", status: "canceled", currentPeriodEnd: daysFromNow(10) },
        now,
      ),
    ).toBe("free");
  });

  it("Webhook 取りこぼしで古いまま残った pro を Free に落とす", () => {
    expect(
      effectiveEntitlement(
        {
          entitlement: "pro",
          status: "active",
          currentPeriodEnd: daysFromNow(-GRACE_DAYS - 1),
        },
        now,
      ),
    ).toBe("free");
  });

  it("課金情報が無い手動付与は保存値を尊重する", () => {
    expect(
      effectiveEntitlement({ entitlement: "pro", status: null, currentPeriodEnd: null }, now),
    ).toBe("pro");
  });
});

describe("toSubscriptionUpdate", () => {
  it("DB へ書ける形に整え、entitlement も同時に決める", () => {
    const end = daysFromNow(30);
    expect(toSubscriptionUpdate({ status: "active", currentPeriodEnd: end, now })).toEqual({
      status: "active",
      current_period_end: end.toISOString(),
      entitlement: "pro",
    });
  });

  it("解約時は entitlement を free にする", () => {
    expect(
      toSubscriptionUpdate({ status: "canceled", currentPeriodEnd: null, now }),
    ).toEqual({ status: "canceled", current_period_end: null, entitlement: "free" });
  });
});

describe("normalizeStripeStatus", () => {
  it("既知の状態はそのまま通す", () => {
    expect(normalizeStripeStatus("active")).toBe("active");
    expect(normalizeStripeStatus("past_due")).toBe("past_due");
  });

  it("incomplete_expired は incomplete に寄せる", () => {
    expect(normalizeStripeStatus("incomplete_expired")).toBe("incomplete");
  });

  it("未知の状態は null（権限を与えない側に倒す）", () => {
    expect(normalizeStripeStatus("paused")).toBeNull();
    expect(normalizeStripeStatus("")).toBeNull();
    expect(entitlementFromSubscription(normalizeStripeStatus("paused"), null, now)).toBe(
      "free",
    );
  });
});

describe("planComparison（§6 の表が PLAN_LIMITS からずれない）", () => {
  const rows = planComparison();
  const find = (feature: string) => rows.find((row) => row.feature === feature);

  it("上限値が表に反映されている", () => {
    expect(find("未完了の課題")?.free).toBe(`${PLAN_LIMITS.free.openAssignments}件まで`);
    expect(find("未完了のTodo")?.free).toBe(`${PLAN_LIMITS.free.openTodos}件まで`);
    expect(find("学習履歴")?.free).toBe(`直近${PLAN_LIMITS.free.studyHistoryDays}日`);
  });

  it("Pro 側は上限なしと出る", () => {
    expect(find("未完了の課題")?.pro).toBe("無制限");
    expect(find("未完了のTodo")?.pro).toBe("無制限");
    expect(find("学習履歴")?.pro).toBe("全期間");
  });

  it("中心体験は両プランで使える（§6 課金設計のルール）", () => {
    expect(find("時間割")).toEqual({
      feature: "時間割",
      free: "利用できる",
      pro: "利用できる",
    });
    expect(find("勉強タイマー")?.free).toBe("利用できる");
  });

  it("Pro 限定機能は Free 側が利用できないと出る", () => {
    expect(find("CSVエクスポート")?.free).toBe("利用できない");
    expect(find("CSVエクスポート")?.pro).toBe("利用できる");
  });
});
