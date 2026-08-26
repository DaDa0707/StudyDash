import { describe, expect, it } from "vitest";

import {
  calendarDayDiff,
  describeDueDate,
  endOfDayInZone,
  endOfThisWeek,
  endOfToday,
  formatDueDate,
  isoWeekday,
  zonedDateKey,
  zonedTimeKey,
  zonedToUtc,
} from "@/lib/deadline";

const TOKYO = "Asia/Tokyo";
const NY = "America/New_York";

/** JST の日時から Date を作る */
const jst = (iso: string) => new Date(`${iso}+09:00`);

describe("zonedDateKey / zonedTimeKey", () => {
  it("タイムゾーンごとの暦日を返す", () => {
    // UTC では 8/24 23:00、JST では 8/25 08:00
    const instant = new Date("2026-08-24T23:00:00Z");
    expect(zonedDateKey(instant, TOKYO)).toBe("2026-08-25");
    expect(zonedDateKey(instant, "UTC")).toBe("2026-08-24");
  });

  it("時刻を HH:MM で返し、0時台を24時としない", () => {
    expect(zonedTimeKey(jst("2026-08-25T00:05:00"), TOKYO)).toBe("00:05");
    expect(zonedTimeKey(jst("2026-08-25T23:59:00"), TOKYO)).toBe("23:59");
  });
});

describe("calendarDayDiff", () => {
  it("同じ暦日なら 0", () => {
    expect(
      calendarDayDiff(jst("2026-08-25T01:00:00"), jst("2026-08-25T23:00:00"), TOKYO),
    ).toBe(0);
  });

  it("翌日なら 1（経過時間が24時間未満でも）", () => {
    expect(
      calendarDayDiff(jst("2026-08-25T23:00:00"), jst("2026-08-26T07:00:00"), TOKYO),
    ).toBe(1);
  });

  it("月をまたいでも数えられる", () => {
    expect(
      calendarDayDiff(jst("2026-08-30T10:00:00"), jst("2026-09-02T10:00:00"), TOKYO),
    ).toBe(3);
  });

  it("過去なら負になる", () => {
    expect(
      calendarDayDiff(jst("2026-08-25T10:00:00"), jst("2026-08-23T10:00:00"), TOKYO),
    ).toBe(-2);
  });

  it("タイムゾーンによって差が変わる", () => {
    const from = new Date("2026-08-24T23:00:00Z"); // JST 8/25 08:00 / UTC 8/24 23:00
    const to = new Date("2026-08-25T12:00:00Z"); // JST 8/25 21:00 / UTC 8/25 12:00
    expect(calendarDayDiff(from, to, TOKYO)).toBe(0);
    expect(calendarDayDiff(from, to, "UTC")).toBe(1);
  });
});

describe("zonedToUtc / endOfDayInZone", () => {
  it("JST の日時を正しい瞬間に変換する", () => {
    expect(zonedToUtc("2026-08-25", "09:00", TOKYO)?.toISOString()).toBe(
      "2026-08-25T00:00:00.000Z",
    );
  });

  it("日付のみの締切はその日の 23:59 を指す", () => {
    expect(endOfDayInZone("2026-08-25", TOKYO)?.toISOString()).toBe(
      "2026-08-25T14:59:00.000Z",
    );
  });

  it("夏時間のあるタイムゾーンでも往復する", () => {
    // 米東部の夏時間期間中（UTC-4）
    const summer = zonedToUtc("2026-07-15", "12:00", NY);
    expect(summer?.toISOString()).toBe("2026-07-15T16:00:00.000Z");
    expect(zonedTimeKey(summer!, NY)).toBe("12:00");

    // 冬時間期間中（UTC-5）
    const winter = zonedToUtc("2026-01-15", "12:00", NY);
    expect(winter?.toISOString()).toBe("2026-01-15T17:00:00.000Z");
    expect(zonedTimeKey(winter!, NY)).toBe("12:00");
  });

  it("不正な入力は null", () => {
    expect(zonedToUtc("", "09:00", TOKYO)).toBeNull();
    expect(zonedToUtc("2026-13-99", "09:00", TOKYO)).toBeNull();
  });
});

describe("describeDueDate（§5.2 期限表示）", () => {
  const now = jst("2026-08-25T10:00:00");

  it("過ぎた締切は期限切れとして強調する", () => {
    const result = describeDueDate(jst("2026-08-25T09:59:00"), now, TOKYO, false);
    expect(result.label).toBe("期限切れ");
    expect(result.tone).toBe("overdue");
    expect(result.emphasize).toBe(true);
  });

  it("同じ日なら今日", () => {
    const result = describeDueDate(jst("2026-08-25T23:59:00"), now, TOKYO, false);
    expect(result.label).toBe("今日");
    expect(result.tone).toBe("today");
    expect(result.emphasize).toBe(true);
  });

  it("翌日なら明日", () => {
    const result = describeDueDate(jst("2026-08-26T09:00:00"), now, TOKYO, false);
    expect(result.label).toBe("明日");
    expect(result.tone).toBe("tomorrow");
    expect(result.emphasize).toBe(false);
  });

  it("それ以降は あとN日", () => {
    expect(describeDueDate(jst("2026-08-27T09:00:00"), now, TOKYO, false).label).toBe(
      "あと2日",
    );
    expect(describeDueDate(jst("2026-09-01T09:00:00"), now, TOKYO, false).label).toBe(
      "あと7日",
    );
  });

  it("深夜に翌朝の締切を「今日」と誤表示しない", () => {
    // 経過時間は9時間だが、暦日は翌日なので「明日」
    const late = jst("2026-08-25T23:00:00");
    const result = describeDueDate(jst("2026-08-26T08:00:00"), late, TOKYO, false);
    expect(result.label).toBe("明日");
  });

  it("朝に同日夜の締切は「今日」のまま", () => {
    const morning = jst("2026-08-25T07:00:00");
    expect(describeDueDate(jst("2026-08-25T22:00:00"), morning, TOKYO, false).label).toBe(
      "今日",
    );
  });

  it("時刻指定があれば時刻を返し、日付のみなら null", () => {
    expect(describeDueDate(jst("2026-08-26T16:30:00"), now, TOKYO, false).timeText).toBe(
      "16:30",
    );
    expect(describeDueDate(jst("2026-08-26T23:59:00"), now, TOKYO, true).timeText).toBeNull();
  });

  it("ユーザーのタイムゾーンで判定する", () => {
    const instant = new Date("2026-08-25T20:00:00Z"); // JST 8/26 05:00 / UTC 8/25 20:00
    const base = new Date("2026-08-25T10:00:00Z"); // JST 8/25 19:00 / UTC 8/25 10:00
    expect(describeDueDate(instant, base, TOKYO, false).label).toBe("明日");
    expect(describeDueDate(instant, base, "UTC", false).label).toBe("今日");
  });
});

describe("endOfToday / endOfThisWeek / isoWeekday", () => {
  it("isoWeekday は 1=月 … 7=日", () => {
    expect(isoWeekday(jst("2026-08-24T12:00:00"), TOKYO)).toBe(1); // 月
    expect(isoWeekday(jst("2026-08-30T12:00:00"), TOKYO)).toBe(7); // 日
  });

  it("endOfToday はその日の終わりを指す", () => {
    const end = endOfToday(jst("2026-08-25T10:00:00"), TOKYO);
    expect(zonedDateKey(end, TOKYO)).toBe("2026-08-25");
    expect(zonedTimeKey(end, TOKYO)).toBe("23:59");
  });

  it("endOfThisWeek は今週日曜の終わりを指す", () => {
    // 2026-08-25 は火曜 → 今週日曜は 8/30
    const end = endOfThisWeek(jst("2026-08-25T10:00:00"), TOKYO);
    expect(zonedDateKey(end, TOKYO)).toBe("2026-08-30");
  });

  it("日曜なら今週の終わりは当日", () => {
    const end = endOfThisWeek(jst("2026-08-30T10:00:00"), TOKYO);
    expect(zonedDateKey(end, TOKYO)).toBe("2026-08-30");
  });
});

describe("formatDueDate", () => {
  it("ユーザーのタイムゾーンで日付を出す", () => {
    const instant = new Date("2026-08-24T23:00:00Z");
    expect(formatDueDate(instant, TOKYO)).toContain("8月25日");
    expect(formatDueDate(instant, "UTC")).toContain("8月24日");
  });
});
