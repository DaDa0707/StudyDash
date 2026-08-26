import { describe, expect, it } from "vitest";

import {
  DEFAULT_PERIOD_TIMES,
  PERIODS,
  findCurrentOrNextClass,
  findSlotConflicts,
  formatTime,
  formatTimeRange,
  formatTimeUntil,
  groupByWeekday,
  parseTimeToMinutes,
  zonedWeekdayAndMinutes,
} from "@/lib/timetable";

const TOKYO = "Asia/Tokyo";

/** JST の曜日・時刻から Date を作る。2026-08-24 は月曜。 */
function jst(weekdayOffset: number, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const day = 24 + weekdayOffset; // 8/24(月) を起点
  const utcHour = h - 9;
  const base = Date.UTC(2026, 7, day, utcHour, m);
  return new Date(base);
}

const session = (
  id: string,
  weekday: number,
  period: number,
  start: string,
  end: string,
) => ({ id, weekday, period, start_time: `${start}:00`, end_time: `${end}:00` });

describe("parseTimeToMinutes", () => {
  it("HH:MM と HH:MM:SS を解釈する", () => {
    expect(parseTimeToMinutes("09:00")).toBe(540);
    expect(parseTimeToMinutes("09:00:00")).toBe(540);
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });

  it("不正な値は null を返す", () => {
    expect(parseTimeToMinutes("")).toBeNull();
    expect(parseTimeToMinutes("9時")).toBeNull();
    expect(parseTimeToMinutes("25:00")).toBeNull();
    expect(parseTimeToMinutes("10:60")).toBeNull();
  });
});

describe("formatTime / formatTimeRange", () => {
  it("秒を落として表示する", () => {
    expect(formatTime("09:00:00")).toBe("09:00");
    expect(formatTimeRange("08:50:00", "09:40:00")).toBe("08:50–09:40");
  });

  it("解釈できない値はそのまま返す", () => {
    expect(formatTime("不明")).toBe("不明");
  });
});

describe("zonedWeekdayAndMinutes", () => {
  it("JST の曜日と時刻を取り出す（1=月）", () => {
    expect(zonedWeekdayAndMinutes(jst(0, "09:30"), TOKYO)).toEqual({
      weekday: 1,
      minutes: 570,
    });
  });

  it("日曜は 7 になる", () => {
    expect(zonedWeekdayAndMinutes(jst(6, "12:00"), TOKYO).weekday).toBe(7);
  });

  it("タイムゾーンで曜日がまたぐ場合を扱う", () => {
    // JST 月曜 00:30 は UTC では日曜 15:30
    const instant = jst(0, "00:30");
    expect(zonedWeekdayAndMinutes(instant, TOKYO).weekday).toBe(1);
    expect(zonedWeekdayAndMinutes(instant, "UTC").weekday).toBe(7);
  });

  it("深夜0時台を 24 時ではなく 0 時として扱う", () => {
    expect(zonedWeekdayAndMinutes(jst(0, "00:10"), TOKYO).minutes).toBe(10);
  });
});

describe("findCurrentOrNextClass（§5.1 次の授業）", () => {
  const monday1 = session("a", 1, 1, "08:50", "09:40");
  const monday3 = session("b", 1, 3, "10:50", "11:40");
  const friday5 = session("c", 5, 5, "13:30", "14:20");

  it("授業がなければ null", () => {
    expect(findCurrentOrNextClass([], jst(0, "09:00"), TOKYO)).toBeNull();
  });

  it("同じ日の次の授業を返す", () => {
    const result = findCurrentOrNextClass([monday1, monday3], jst(0, "09:45"), TOKYO);
    expect(result?.session.id).toBe("b");
    expect(result?.inProgress).toBe(false);
    expect(result?.minutesUntilStart).toBe(65);
  });

  it("授業中はその授業を inProgress で返す", () => {
    const result = findCurrentOrNextClass([monday1, monday3], jst(0, "09:00"), TOKYO);
    expect(result?.session.id).toBe("a");
    expect(result?.inProgress).toBe(true);
    expect(result?.minutesUntilStart).toBe(0);
  });

  it("終了ちょうどは授業中に含めない", () => {
    const result = findCurrentOrNextClass([monday1, monday3], jst(0, "09:40"), TOKYO);
    expect(result?.session.id).toBe("b");
    expect(result?.inProgress).toBe(false);
  });

  it("開始ちょうどは授業中として扱う", () => {
    const result = findCurrentOrNextClass([monday1], jst(0, "08:50"), TOKYO);
    expect(result?.inProgress).toBe(true);
  });

  it("その日の授業が終わったら次の曜日の授業を返す", () => {
    const result = findCurrentOrNextClass([monday1, monday3, friday5], jst(0, "18:00"), TOKYO);
    expect(result?.session.id).toBe("c");
    // 月曜18:00 → 金曜13:30 は 3日と19.5時間
    expect(result?.minutesUntilStart).toBe(3 * 1440 + 19 * 60 + 30);
  });

  it("週をまたいで翌週の授業を返す", () => {
    // 金曜の授業後 → 次は翌週の月曜1限
    const result = findCurrentOrNextClass([monday1, friday5], jst(4, "15:00"), TOKYO);
    expect(result?.session.id).toBe("a");
    expect(result?.minutesUntilStart).toBe(2 * 1440 + 17 * 60 + 50);
  });

  it("日曜の夜からでも翌日の授業を見つける", () => {
    const result = findCurrentOrNextClass([monday1], jst(6, "23:00"), TOKYO);
    expect(result?.session.id).toBe("a");
    expect(result?.minutesUntilStart).toBe(9 * 60 + 50);
  });

  it("同じ授業が1週間後になる場合も返せる", () => {
    const result = findCurrentOrNextClass([monday1], jst(0, "10:00"), TOKYO);
    expect(result?.session.id).toBe("a");
    expect(result?.minutesUntilStart).toBe(7 * 1440 - (70));
  });

  it("時刻が壊れている行は無視する", () => {
    const broken = { ...session("x", 1, 2, "00:00", "00:00"), start_time: "不明" };
    const result = findCurrentOrNextClass([broken, monday3], jst(0, "09:45"), TOKYO);
    expect(result?.session.id).toBe("b");
  });

  it("タイムゾーンが違えば結果も変わる", () => {
    // JST 月曜 08:00 = UTC 日曜 23:00
    const instant = jst(0, "08:00");
    expect(findCurrentOrNextClass([monday1], instant, TOKYO)?.minutesUntilStart).toBe(50);
    expect(findCurrentOrNextClass([monday1], instant, "UTC")?.minutesUntilStart).toBe(
      9 * 60 + 50,
    );
  });
});

describe("formatTimeUntil", () => {
  it("分・時間・日で表す", () => {
    expect(formatTimeUntil(0)).toBe("まもなく");
    expect(formatTimeUntil(15)).toBe("あと15分");
    expect(formatTimeUntil(60)).toBe("あと1時間");
    expect(formatTimeUntil(150)).toBe("あと2時間30分");
    expect(formatTimeUntil(1440)).toBe("明日");
    expect(formatTimeUntil(1440 * 3)).toBe("3日後");
  });
});

describe("findSlotConflicts（§5.1 重複は警告のみ）", () => {
  const existing = [session("a", 1, 1, "08:50", "09:40"), session("b", 2, 1, "08:50", "09:40")];

  it("同一曜日・同一時限を検出する", () => {
    const hits = findSlotConflicts(existing, { weekday: 1, period: 1 });
    expect(hits.map((s) => s.id)).toEqual(["a"]);
  });

  it("曜日か時限が違えば検出しない", () => {
    expect(findSlotConflicts(existing, { weekday: 1, period: 2 })).toEqual([]);
    expect(findSlotConflicts(existing, { weekday: 3, period: 1 })).toEqual([]);
  });

  it("編集中の授業は自分自身を重複としない", () => {
    expect(findSlotConflicts(existing, { weekday: 1, period: 1 }, "a")).toEqual([]);
  });
});

describe("groupByWeekday", () => {
  it("7曜日すべてのキーを持ち、時限順に並ぶ", () => {
    const grouped = groupByWeekday([
      session("c", 1, 3, "10:50", "11:40"),
      session("a", 1, 1, "08:50", "09:40"),
      session("d", 5, 2, "09:50", "10:40"),
    ]);

    expect([...grouped.keys()]).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(grouped.get(1)?.map((s) => s.id)).toEqual(["a", "c"]);
    expect(grouped.get(5)?.map((s) => s.id)).toEqual(["d"]);
    expect(grouped.get(2)).toEqual([]);
  });

  it("同一時限は開始時刻順に並ぶ", () => {
    const grouped = groupByWeekday([
      session("late", 1, 1, "09:00", "09:50"),
      session("early", 1, 1, "08:00", "08:50"),
    ]);
    expect(grouped.get(1)?.map((s) => s.id)).toEqual(["early", "late"]);
  });
});

describe("時限の既定値", () => {
  it("1〜12限すべてに既定時刻がある", () => {
    expect(PERIODS).toHaveLength(12);
    for (const period of PERIODS) {
      const times = DEFAULT_PERIOD_TIMES[period];
      expect(times).toBeDefined();
      const start = parseTimeToMinutes(times.start);
      const end = parseTimeToMinutes(times.end);
      expect(start).not.toBeNull();
      expect(end).not.toBeNull();
      expect(end!).toBeGreaterThan(start!);
    }
  });
});
