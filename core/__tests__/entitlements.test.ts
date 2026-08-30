import { describe, expect, it } from "vitest";

import {
  can,
  checkQuota,
  isPro,
  limitOf,
  limitsFor,
  studyHistoryFloor,
} from "../entitlements";

describe("プラン上限（仕様書 §6）", () => {
  it("Free の上限が仕様どおりである", () => {
    const free = limitsFor("free");
    expect(free.openAssignments).toBe(20);
    expect(free.openTodos).toBe(30);
    expect(free.studyHistoryDays).toBe(7);
    expect(free.csvExport).toBe(false);
    expect(free.advancedAnalytics).toBe(false);
    expect(free.dashboardCustomization).toBe(false);
  });

  it("Pro は件数上限を持たない", () => {
    const pro = limitsFor("pro");
    expect(pro.openAssignments).toBeNull();
    expect(pro.openTodos).toBeNull();
    expect(pro.studyHistoryDays).toBeNull();
  });

  it("Pro 限定機能は Free で無効になる", () => {
    for (const feature of [
      "advancedAnalytics",
      "customThemes",
      "dashboardCustomization",
      "csvExport",
    ] as const) {
      expect(can("free", feature)).toBe(false);
      expect(can("pro", feature)).toBe(true);
    }
  });

  it("中心体験（タイマー・時間割）に上限を課していない", () => {
    // §6「無料版を試用版にしすぎない」: 上限は課題/Todo/履歴/通知/装飾に限る
    const free = limitsFor("free");
    expect(Object.keys(free)).not.toContain("timetable");
    expect(Object.keys(free)).not.toContain("timer");
  });

  it("isPro が entitlement を正しく判定する", () => {
    expect(isPro("pro")).toBe(true);
    expect(isPro("free")).toBe(false);
  });
});

describe("checkQuota（§12 A-06 Free上限到達時の挙動）", () => {
  it("上限未満なら追加を許可し、残数を返す", () => {
    const result = checkQuota("free", "openAssignments", 19);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
    expect(result.shouldUpsell).toBe(false);
  });

  it("上限ちょうどで追加を止め、Pro案内を出す", () => {
    const result = checkQuota("free", "openAssignments", 20);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.shouldUpsell).toBe(true);
  });

  it("上限を超えて保持している場合も残数を負にしない", () => {
    const result = checkQuota("free", "openTodos", 35);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("Pro は件数に関わらず許可し、案内を出さない", () => {
    const result = checkQuota("pro", "openTodos", 10_000);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBeNull();
    expect(result.remaining).toBeNull();
    expect(result.shouldUpsell).toBe(false);
  });
});

describe("studyHistoryFloor", () => {
  it("Free は7日前を下限にする", () => {
    const now = new Date("2026-08-25T10:00:00Z");
    const floor = studyHistoryFloor("free", now);
    expect(floor?.toISOString()).toBe("2026-08-18T10:00:00.000Z");
  });

  it("Pro は下限を持たない", () => {
    expect(studyHistoryFloor("pro", new Date("2026-08-25T10:00:00Z"))).toBeNull();
  });

  it("基準の Date を破壊しない", () => {
    const now = new Date("2026-08-25T10:00:00Z");
    studyHistoryFloor("free", now);
    expect(now.toISOString()).toBe("2026-08-25T10:00:00.000Z");
  });
});

describe("limitOf", () => {
  it("通知タイミング数が Free は1、Pro は複数である（§6）", () => {
    expect(limitOf("free", "notificationTimings")).toBe(1);
    expect(limitOf("pro", "notificationTimings")).toBeGreaterThan(1);
  });
});
