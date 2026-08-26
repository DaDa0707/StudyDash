import { describe, expect, it } from "vitest";

import { startOfDaysAgo, startOfThisWeek, startOfToday } from "@/lib/deadline";
import {
  finishedOnly,
  inRange,
  sumByDay,
  sumBySubject,
  totalSeconds,
  type CompletedSession,
} from "@/lib/study-stats";

const TOKYO = "Asia/Tokyo";
const jst = (iso: string) => new Date(`${iso}+09:00`);

const rec = (
  startedAt: string,
  durationSec: number | null,
  subjectId: string | null = "math",
): CompletedSession => ({
  subject_id: subjectId,
  started_at: jst(startedAt).toISOString(),
  ended_at: durationSec === null ? null : jst(startedAt).toISOString(),
  duration_sec: durationSec,
});

describe("finishedOnly", () => {
  it("実行中のセッションを履歴から除く", () => {
    const rows = [rec("2026-08-25T10:00:00", 600), rec("2026-08-25T12:00:00", null)];
    expect(finishedOnly(rows)).toHaveLength(1);
  });
});

describe("totalSeconds", () => {
  it("合計する", () => {
    expect(totalSeconds([rec("2026-08-25T10:00:00", 600), rec("2026-08-25T12:00:00", 900)])).toBe(
      1500,
    );
  });

  it("空なら 0、負値は 0 として扱う", () => {
    expect(totalSeconds([])).toBe(0);
    expect(totalSeconds([rec("2026-08-25T10:00:00", -100)])).toBe(0);
  });
});

describe("inRange（今日・今週の集計 / §4.2）", () => {
  const now = jst("2026-08-25T15:00:00"); // 火曜

  const rows = [
    rec("2026-08-25T09:00:00", 1800), // 今日
    rec("2026-08-25T14:00:00", 600), // 今日
    rec("2026-08-24T20:00:00", 3600), // 昨日（月曜、今週内）
    rec("2026-08-23T20:00:00", 1200), // 一昨日（日曜、先週）
  ];

  it("今日の分だけを取り出す", () => {
    const today = inRange(rows, startOfToday(now, TOKYO), now);
    expect(totalSeconds(today)).toBe(2400);
  });

  it("今週（月曜始まり）の分を取り出す", () => {
    const week = inRange(rows, startOfThisWeek(now, TOKYO), now);
    expect(totalSeconds(week)).toBe(2400 + 3600);
  });

  it("直近7日の下限で絞れる（§6 Free の学習履歴）", () => {
    const recent = inRange(rows, startOfDaysAgo(now, TOKYO, 7), now);
    expect(recent).toHaveLength(4);
    const narrow = inRange(rows, startOfDaysAgo(now, TOKYO, 1), now);
    expect(narrow).toHaveLength(3);
  });

  it("開始時刻が壊れている行は除く", () => {
    const broken = [{ ...rec("2026-08-25T09:00:00", 600), started_at: "不明" }];
    expect(inRange(broken, startOfToday(now, TOKYO), now)).toEqual([]);
  });
});

describe("sumByDay（F-07 日別）", () => {
  it("暦日ごとに合計し、新しい日から並べる", () => {
    const daily = sumByDay(
      [
        rec("2026-08-25T09:00:00", 1800),
        rec("2026-08-25T14:00:00", 600),
        rec("2026-08-24T20:00:00", 3600),
      ],
      TOKYO,
    );

    expect(daily).toEqual([
      { date: "2026-08-25", seconds: 2400 },
      { date: "2026-08-24", seconds: 3600 },
    ]);
  });

  it("タイムゾーンで日付の区切りが変わる", () => {
    // JST 8/25 07:00 = UTC 8/24 22:00
    const rows = [rec("2026-08-25T07:00:00", 600)];
    expect(sumByDay(rows, TOKYO)[0].date).toBe("2026-08-25");
    expect(sumByDay(rows, "UTC")[0].date).toBe("2026-08-24");
  });
});

describe("sumBySubject（F-07 科目別）", () => {
  it("科目ごとに合計し、多い順に並べる", () => {
    const totals = sumBySubject([
      rec("2026-08-25T09:00:00", 600, "math"),
      rec("2026-08-25T10:00:00", 1800, "english"),
      rec("2026-08-25T11:00:00", 300, "math"),
    ]);

    expect(totals).toEqual([
      { subjectId: "english", seconds: 1800 },
      { subjectId: "math", seconds: 900 },
    ]);
  });

  it("科目未選択は null のまとまりになる（その他）", () => {
    const totals = sumBySubject([
      rec("2026-08-25T09:00:00", 600, null),
      rec("2026-08-25T10:00:00", 300, null),
    ]);
    expect(totals).toEqual([{ subjectId: null, seconds: 900 }]);
  });
});
