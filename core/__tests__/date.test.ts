import { describe, expect, it } from "vitest";

import { formatDuration, formatToday, greetingFor, hourIn } from "../date";

const TOKYO = "Asia/Tokyo";

describe("hourIn", () => {
  it("UTC の時刻をタイムゾーンに変換する", () => {
    // 2026-08-25T00:30:00Z は JST では同日 09:30
    expect(hourIn(new Date("2026-08-25T00:30:00Z"), TOKYO)).toBe(9);
  });

  it("日付をまたぐ場合も 0-23 に収まる", () => {
    // JST 00:30（UTC 前日 15:30）
    expect(hourIn(new Date("2026-08-24T15:30:00Z"), TOKYO)).toBe(0);
  });
});

describe("greetingFor（§4.2 ホームの挨拶）", () => {
  const at = (jstHour: number) => {
    const utcHour = (jstHour - 9 + 24) % 24;
    return new Date(`2026-08-25T${String(utcHour).padStart(2, "0")}:00:00Z`);
  };

  it("深夜はねぎらいの挨拶になる", () => {
    expect(greetingFor(at(2), TOKYO)).toBe("おつかれさま");
  });

  it("朝・昼・夜で挨拶が切り替わる", () => {
    expect(greetingFor(at(7), TOKYO)).toBe("おはよう");
    expect(greetingFor(at(13), TOKYO)).toBe("こんにちは");
    expect(greetingFor(at(20), TOKYO)).toBe("こんばんは");
  });

  it("境界時刻で切り替わる", () => {
    expect(greetingFor(at(10), TOKYO)).toBe("おはよう");
    expect(greetingFor(at(11), TOKYO)).toBe("こんにちは");
    expect(greetingFor(at(17), TOKYO)).toBe("こんにちは");
    expect(greetingFor(at(18), TOKYO)).toBe("こんばんは");
  });

  it("タイムゾーンが違えば挨拶も変わる", () => {
    const instant = new Date("2026-08-25T00:30:00Z"); // JST 09:30 / UTC 00:30
    expect(greetingFor(instant, TOKYO)).toBe("おはよう");
    expect(greetingFor(instant, "UTC")).toBe("おつかれさま");
  });
});

describe("formatToday", () => {
  it("ユーザーのタイムゾーンで日付を出す", () => {
    // UTC では 8/24 だが JST では 8/25
    const instant = new Date("2026-08-24T16:00:00Z");
    expect(formatToday(instant, TOKYO)).toContain("8月25日");
    expect(formatToday(instant, "UTC")).toContain("8月24日");
  });
});

describe("formatDuration", () => {
  it("時間と分を組み立てる", () => {
    expect(formatDuration(0)).toBe("0分");
    expect(formatDuration(59)).toBe("0分");
    expect(formatDuration(60)).toBe("1分");
    expect(formatDuration(3600)).toBe("1時間");
    expect(formatDuration(4980)).toBe("1時間23分");
  });

  it("負の値を 0分 として扱う", () => {
    expect(formatDuration(-100)).toBe("0分");
  });
});
