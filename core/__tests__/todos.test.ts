import { describe, expect, it } from "vitest";

import { bucketOf, countOpen, groupTodos } from "../todos";
import type { TodoStatus } from "../database";

const TOKYO = "Asia/Tokyo";
const jst = (iso: string) => new Date(`${iso}+09:00`);

/** 2026-08-25 は火曜。今週日曜は 8/30。 */
const now = jst("2026-08-25T10:00:00");

const todo = (
  id: string,
  due: string | null,
  status: TodoStatus = "open",
  sortOrder = 0,
) => ({
  id,
  due_at: due,
  status,
  sort_order: sortOrder,
  created_at: "2026-08-01T00:00:00Z",
});

describe("bucketOf（§4.1 S-06 今日/今週/完了済み）", () => {
  it("完了済みは done", () => {
    expect(bucketOf(todo("a", null, "done"), now, TOKYO)).toBe("done");
  });

  it("期限なしは今日に入れる", () => {
    expect(bucketOf(todo("a", null), now, TOKYO)).toBe("today");
  });

  it("今日が期限なら today", () => {
    expect(bucketOf(todo("a", jst("2026-08-25T23:00:00").toISOString()), now, TOKYO)).toBe(
      "today",
    );
  });

  it("期限切れも today に入れる（埋もれさせない）", () => {
    expect(bucketOf(todo("a", jst("2026-08-20T10:00:00").toISOString()), now, TOKYO)).toBe(
      "today",
    );
  });

  it("明日〜今週日曜は thisWeek", () => {
    expect(bucketOf(todo("a", jst("2026-08-26T09:00:00").toISOString()), now, TOKYO)).toBe(
      "thisWeek",
    );
    expect(bucketOf(todo("b", jst("2026-08-30T23:00:00").toISOString()), now, TOKYO)).toBe(
      "thisWeek",
    );
  });

  it("来週以降は later", () => {
    expect(bucketOf(todo("a", jst("2026-08-31T09:00:00").toISOString()), now, TOKYO)).toBe(
      "later",
    );
  });

  it("壊れた日付は today に倒す", () => {
    expect(bucketOf(todo("a", "不明"), now, TOKYO)).toBe("today");
  });

  it("タイムゾーンで区分が変わる", () => {
    // JST 8/26 05:00 = UTC 8/25 20:00
    const due = new Date("2026-08-25T20:00:00Z").toISOString();
    const base = new Date("2026-08-25T10:00:00Z"); // JST 8/25 19:00 / UTC 8/25 10:00
    expect(bucketOf(todo("a", due), base, TOKYO)).toBe("thisWeek");
    expect(bucketOf(todo("a", due), base, "UTC")).toBe("today");
  });
});

describe("groupTodos", () => {
  it("区分ごとに分け、期限順に並べる", () => {
    const grouped = groupTodos(
      [
        todo("later", jst("2026-09-10T09:00:00").toISOString()),
        todo("week2", jst("2026-08-29T09:00:00").toISOString()),
        todo("today1", jst("2026-08-25T08:00:00").toISOString()),
        todo("week1", jst("2026-08-26T09:00:00").toISOString()),
        todo("noDue", null),
        todo("finished", null, "done"),
      ],
      now,
      TOKYO,
    );

    expect(grouped.today.map((t) => t.id)).toEqual(["today1", "noDue"]);
    expect(grouped.thisWeek.map((t) => t.id)).toEqual(["week1", "week2"]);
    expect(grouped.later.map((t) => t.id)).toEqual(["later"]);
    expect(grouped.done.map((t) => t.id)).toEqual(["finished"]);
  });

  it("期限が同じなら sort_order 順", () => {
    const due = jst("2026-08-25T09:00:00").toISOString();
    const grouped = groupTodos(
      [todo("second", due, "open", 2), todo("first", due, "open", 1)],
      now,
      TOKYO,
    );
    expect(grouped.today.map((t) => t.id)).toEqual(["first", "second"]);
  });

  it("空でも4つの区分を返す", () => {
    const grouped = groupTodos([], now, TOKYO);
    expect(grouped).toEqual({ today: [], thisWeek: [], later: [], done: [] });
  });
});

describe("countOpen", () => {
  it("未完了だけ数える（§6 Free上限の判定材料）", () => {
    expect(
      countOpen([todo("a", null), todo("b", null, "done"), todo("c", null)]),
    ).toBe(2);
    expect(countOpen([])).toBe(0);
  });
});
