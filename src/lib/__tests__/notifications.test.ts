import { describe, expect, it } from "vitest";

import { limitOf } from "@/lib/entitlements";
import {
  REMINDER_OPTIONS,
  clampReminderOffsets,
  dueBuckets,
  isQuietHours,
  reminderLabel,
  shouldNotify,
} from "@/lib/notifications";

const TOKYO = "Asia/Tokyo";
const jst = (iso: string) => new Date(`${iso}+09:00`);

describe("clampReminderOffsets（§6 Free は1つ / Pro は複数）", () => {
  it("Free は1つに絞られる", () => {
    const limit = limitOf("free", "notificationTimings");
    expect(clampReminderOffsets([0, 60, 1440], limit)).toHaveLength(1);
  });

  it("早く知らせるタイミングを優先して残す", () => {
    expect(clampReminderOffsets([0, 60, 1440], 1)).toEqual([1440]);
    expect(clampReminderOffsets([0, 60, 1440], 2)).toEqual([1440, 60]);
  });

  it("Pro の上限までは残る", () => {
    const limit = limitOf("pro", "notificationTimings");
    expect(clampReminderOffsets([0, 60, 180, 1440, 2880], limit)).toHaveLength(5);
  });

  it("上限なしなら全部残す", () => {
    expect(clampReminderOffsets([0, 60, 1440], null)).toEqual([1440, 60, 0]);
  });

  it("重複と不正な値を落とす", () => {
    expect(clampReminderOffsets([60, 60, -10, Number.NaN], null)).toEqual([60]);
  });

  it("空なら空", () => {
    expect(clampReminderOffsets([], 1)).toEqual([]);
  });
});

describe("reminderLabel", () => {
  it("既定の選択肢は日本語ラベルを持つ", () => {
    expect(reminderLabel(0)).toBe("締切の時刻");
    expect(reminderLabel(1440)).toBe("前日");
    expect(REMINDER_OPTIONS.every((option) => option.label.length > 0)).toBe(true);
  });

  it("未知の値でも表示できる", () => {
    expect(reminderLabel(45)).toBe("45分前");
  });
});

describe("isQuietHours", () => {
  const quiet = { enabled: true, start: "22:00", end: "07:00" };

  it("無効なら常に false", () => {
    expect(isQuietHours(jst("2026-08-25T23:00:00"), TOKYO, { ...quiet, enabled: false })).toBe(
      false,
    );
  });

  it("日付をまたぐ時間帯を扱う", () => {
    expect(isQuietHours(jst("2026-08-25T23:00:00"), TOKYO, quiet)).toBe(true);
    expect(isQuietHours(jst("2026-08-25T02:00:00"), TOKYO, quiet)).toBe(true);
    expect(isQuietHours(jst("2026-08-25T12:00:00"), TOKYO, quiet)).toBe(false);
  });

  it("境界は開始を含み終了を含まない", () => {
    expect(isQuietHours(jst("2026-08-25T22:00:00"), TOKYO, quiet)).toBe(true);
    expect(isQuietHours(jst("2026-08-25T07:00:00"), TOKYO, quiet)).toBe(false);
    expect(isQuietHours(jst("2026-08-25T06:59:00"), TOKYO, quiet)).toBe(true);
  });

  it("日中の時間帯（またがない）も扱える", () => {
    const daytime = { enabled: true, start: "09:00", end: "17:00" };
    expect(isQuietHours(jst("2026-08-25T10:00:00"), TOKYO, daytime)).toBe(true);
    expect(isQuietHours(jst("2026-08-25T20:00:00"), TOKYO, daytime)).toBe(false);
  });

  it("ユーザーのタイムゾーンで判定する", () => {
    const instant = new Date("2026-08-25T14:00:00Z"); // JST 23:00 / UTC 14:00
    expect(isQuietHours(instant, TOKYO, quiet)).toBe(true);
    expect(isQuietHours(instant, "UTC", quiet)).toBe(false);
  });

  it("開始と終了が同じなら判定しない", () => {
    expect(
      isQuietHours(jst("2026-08-25T23:00:00"), TOKYO, {
        enabled: true,
        start: "22:00",
        end: "22:00",
      }),
    ).toBe(false);
  });
});

describe("dueBuckets（F-08 アプリ内通知）", () => {
  const now = jst("2026-08-25T10:00:00");
  const item = (id: string, due: string, status = "not_started") => ({
    id,
    due_at: jst(due).toISOString(),
    status,
  });

  const rows = [
    item("overdue1", "2026-08-24T10:00:00"),
    item("overdue2", "2026-08-23T10:00:00"),
    item("soon", "2026-08-25T18:00:00"),
    item("tomorrow", "2026-08-26T12:00:00"),
    item("far", "2026-09-10T12:00:00"),
    item("done", "2026-08-24T10:00:00", "done"),
  ];

  it("完了済みは対象外", () => {
    const { overdue, upcoming } = dueBuckets(rows, [2880], now);
    expect([...overdue, ...upcoming].map((r) => r.id)).not.toContain("done");
  });

  it("期限切れを古い順に返す", () => {
    expect(dueBuckets(rows, [1440], now).overdue.map((r) => r.id)).toEqual([
      "overdue2",
      "overdue1",
    ]);
  });

  it("設定した最長のタイミングを窓にする", () => {
    // 前日（1440分）→ 26日12:00 は 26時間先なので入らない
    expect(dueBuckets(rows, [1440], now).upcoming.map((r) => r.id)).toEqual(["soon"]);
    // 2日前（2880分）→ 入る
    expect(dueBuckets(rows, [2880], now).upcoming.map((r) => r.id)).toEqual([
      "soon",
      "tomorrow",
    ]);
  });

  it("タイミング未設定なら期限切れだけ出す", () => {
    const { overdue, upcoming } = dueBuckets(rows, [], now);
    expect(overdue).toHaveLength(2);
    expect(upcoming).toEqual([]);
  });

  it("壊れた締切は無視する", () => {
    const broken = [{ id: "x", due_at: "不明", status: "not_started" }];
    expect(dueBuckets(broken, [1440], now)).toEqual({ overdue: [], upcoming: [] });
  });
});

describe("shouldNotify", () => {
  const base = {
    remindersEnabled: true,
    counts: { overdue: 1, upcoming: 0 },
    now: jst("2026-08-25T12:00:00"),
    timeZone: TOKYO,
    quiet: { enabled: false, start: "22:00", end: "07:00" },
  };

  it("通知が有効で対象があれば出す", () => {
    expect(shouldNotify(base)).toBe(true);
  });

  it("通知が無効なら出さない", () => {
    expect(shouldNotify({ ...base, remindersEnabled: false })).toBe(false);
  });

  it("対象が無ければ出さない", () => {
    expect(shouldNotify({ ...base, counts: { overdue: 0, upcoming: 0 } })).toBe(false);
  });

  it("静かな時間帯には出さない", () => {
    expect(
      shouldNotify({
        ...base,
        now: jst("2026-08-25T23:00:00"),
        quiet: { enabled: true, start: "22:00", end: "07:00" },
      }),
    ).toBe(false);
  });
});
