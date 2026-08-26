import { describe, expect, it } from "vitest";

import {
  accumulatedOnPause,
  durationOnFinish,
  elapsedSeconds,
  formatTimerDisplay,
  subjectLabel,
  timerStateOf,
  type TimerFields,
} from "@/lib/timer";

const at = (iso: string) => new Date(`${iso}+09:00`);

const session = (fields: Partial<TimerFields>): TimerFields => ({
  started_at: at("2026-08-25T10:00:00").toISOString(),
  ended_at: null,
  duration_sec: null,
  segment_started_at: at("2026-08-25T10:00:00").toISOString(),
  accumulated_sec: 0,
  ...fields,
});

describe("timerStateOf（§5.3 の3状態）", () => {
  it("計測中・一時停止・終了済みを見分ける", () => {
    expect(timerStateOf(session({}))).toBe("running");
    expect(timerStateOf(session({ segment_started_at: null }))).toBe("paused");
    expect(
      timerStateOf(
        session({
          segment_started_at: null,
          ended_at: at("2026-08-25T11:00:00").toISOString(),
          duration_sec: 3600,
        }),
      ),
    ).toBe("finished");
  });
});

describe("elapsedSeconds", () => {
  it("計測中は累積＋現在の区間", () => {
    const s = session({ accumulated_sec: 600 });
    expect(elapsedSeconds(s, at("2026-08-25T10:05:00"))).toBe(600 + 300);
  });

  it("一時停止中は累積のみで、時間が経っても増えない", () => {
    const s = session({ segment_started_at: null, accumulated_sec: 900 });
    expect(elapsedSeconds(s, at("2026-08-25T10:05:00"))).toBe(900);
    expect(elapsedSeconds(s, at("2026-08-25T18:00:00"))).toBe(900);
  });

  it("終了済みは保存済みの実勉強秒数を返す", () => {
    const s = session({
      segment_started_at: null,
      ended_at: at("2026-08-25T11:00:00").toISOString(),
      duration_sec: 2400,
    });
    // 現在時刻に関係なく一定
    expect(elapsedSeconds(s, at("2026-08-26T10:00:00"))).toBe(2400);
  });

  it("ブラウザを閉じて数時間後に開いても、計測中なら経過が続いている", () => {
    // §5.3「ブラウザを閉じても開始時刻を復元できる」
    const s = session({ accumulated_sec: 0 });
    expect(elapsedSeconds(s, at("2026-08-25T12:30:00"))).toBe(9000);
  });

  it("端末の時計が巻き戻っても負にならない", () => {
    const s = session({ accumulated_sec: 300 });
    expect(elapsedSeconds(s, at("2026-08-25T09:00:00"))).toBe(300);
  });

  it("累積が壊れた負値でも 0 に丸める", () => {
    const s = session({ segment_started_at: null, accumulated_sec: -50 });
    expect(elapsedSeconds(s, at("2026-08-25T10:05:00"))).toBe(0);
  });

  it("区間開始時刻が壊れていたら累積だけ返す", () => {
    const s = session({ segment_started_at: "不明", accumulated_sec: 120 });
    expect(elapsedSeconds(s, at("2026-08-25T10:05:00"))).toBe(120);
  });
});

describe("一時停止と終了の確定値", () => {
  it("一時停止で現在の区間が累積へ畳み込まれる", () => {
    const s = session({ accumulated_sec: 100 });
    expect(accumulatedOnPause(s, at("2026-08-25T10:01:00"))).toBe(160);
  });

  it("一時停止→再開→終了で、停止中の時間が含まれない", () => {
    // 10:00 開始 → 10:10 停止（600秒）→ 11:00 再開 → 11:05 終了（300秒）
    const paused = session({ accumulated_sec: 0 });
    const acc = accumulatedOnPause(paused, at("2026-08-25T10:10:00"));
    expect(acc).toBe(600);

    const resumed = session({
      accumulated_sec: acc,
      segment_started_at: at("2026-08-25T11:00:00").toISOString(),
    });
    expect(durationOnFinish(resumed, at("2026-08-25T11:05:00"))).toBe(900);
  });

  it("一時停止したまま終了しても累積が保存される", () => {
    const s = session({ segment_started_at: null, accumulated_sec: 450 });
    expect(durationOnFinish(s, at("2026-08-25T20:00:00"))).toBe(450);
  });
});

describe("formatTimerDisplay", () => {
  it("1時間未満は MM:SS", () => {
    expect(formatTimerDisplay(0)).toBe("00:00");
    expect(formatTimerDisplay(9)).toBe("00:09");
    expect(formatTimerDisplay(65)).toBe("01:05");
    expect(formatTimerDisplay(3599)).toBe("59:59");
  });

  it("1時間以上は H:MM:SS", () => {
    expect(formatTimerDisplay(3600)).toBe("1:00:00");
    expect(formatTimerDisplay(3661)).toBe("1:01:01");
    expect(formatTimerDisplay(36000)).toBe("10:00:00");
  });

  it("負の値は 00:00", () => {
    expect(formatTimerDisplay(-10)).toBe("00:00");
  });
});

describe("subjectLabel", () => {
  it("科目未選択は「その他」（§5.3）", () => {
    expect(subjectLabel(null)).toBe("その他");
    expect(subjectLabel(undefined)).toBe("その他");
    expect(subjectLabel("数学Ⅱ")).toBe("数学Ⅱ");
  });
});
