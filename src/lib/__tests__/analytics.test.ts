import { describe, expect, it, vi } from "vitest";

import {
  ANALYTICS_EVENTS,
  captureWith,
  isKnownEvent,
  sanitizeProperties,
  type AnalyticsSink,
} from "@/lib/analytics";

function makeSink(): AnalyticsSink & { calls: unknown[][] } {
  const calls: unknown[][] = [];
  return {
    calls,
    capture: (...args) => calls.push(args),
    identify: vi.fn(),
    reset: vi.fn(),
  };
}

describe("sanitizeProperties（§9 本人が書いた文章を送らない）", () => {
  it("数値・真偽値・null は通す", () => {
    expect(sanitizeProperties({ count: 12, isPro: false, subject: null })).toEqual({
      count: 12,
      isPro: false,
      subject: null,
    });
  });

  it("決められた語の文字列だけ通す", () => {
    expect(sanitizeProperties({ plan: "free", feature: "openTodos" })).toEqual({
      plan: "free",
      feature: "openTodos",
    });
  });

  it("自由入力の文章は落とす", () => {
    const result = sanitizeProperties({
      plan: "free",
      title: "数学 ワーク p.42-45",
      note: "明日までに終わらせる",
    });

    expect(result).toEqual({ plan: "free" });
    expect(result).not.toHaveProperty("title");
    expect(result).not.toHaveProperty("note");
  });

  it("メールアドレスや氏名らしき文字列も落ちる", () => {
    expect(
      sanitizeProperties({ email: "dada@example.com", name: "だだ" } as never),
    ).toEqual({});
  });

  it("NaN や Infinity は落とす", () => {
    expect(sanitizeProperties({ a: Number.NaN, b: Number.POSITIVE_INFINITY, c: 1 })).toEqual({
      c: 1,
    });
  });

  it("未指定なら空", () => {
    expect(sanitizeProperties(undefined)).toEqual({});
  });
});

describe("isKnownEvent", () => {
  it("定義済みのイベントを認める", () => {
    expect(isKnownEvent("timer_finished")).toBe(true);
    expect(isKnownEvent("quota_reached")).toBe(true);
  });

  it("未定義のイベントは認めない", () => {
    expect(isKnownEvent("password_entered")).toBe(false);
    expect(isKnownEvent("")).toBe(false);
  });

  it("イベント名に重複がない", () => {
    expect(new Set(ANALYTICS_EVENTS).size).toBe(ANALYTICS_EVENTS.length);
  });
});

describe("captureWith", () => {
  it("送信先が無ければ何もしない", () => {
    expect(captureWith(null, "timer_started")).toBe(false);
  });

  it("未知のイベントは送らない", () => {
    const sink = makeSink();
    expect(captureWith(sink, "何か勝手なイベント")).toBe(false);
    expect(sink.calls).toHaveLength(0);
  });

  it("既知のイベントは絞り込んだプロパティで送る", () => {
    const sink = makeSink();
    const sent = captureWith(sink, "assignment_created", {
      plan: "free",
      openCount: 3,
      title: "秘密のタイトル",
    });

    expect(sent).toBe(true);
    expect(sink.calls).toEqual([
      ["assignment_created", { plan: "free", openCount: 3 }],
    ]);
  });

  it("プロパティ無しでも送れる", () => {
    const sink = makeSink();
    captureWith(sink, "pro_page_viewed");
    expect(sink.calls).toEqual([["pro_page_viewed", {}]]);
  });
});
