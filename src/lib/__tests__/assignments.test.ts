import { describe, expect, it } from "vitest";

import {
  HOME_ASSIGNMENT_LIMIT,
  isHighPriority,
  isOpen,
  priorityLabel,
  sortByDueDate,
  statusLabel,
  upcomingAssignments,
} from "@/lib/assignments";
import type { AssignmentStatus, PriorityLevel } from "@/types/database";

const item = (
  id: string,
  due: string,
  status: AssignmentStatus = "not_started",
  priority: PriorityLevel | null = null,
) => ({ id, due_at: due, status, priority });

describe("ラベル", () => {
  it("優先度と状態を日本語で返す", () => {
    expect(priorityLabel("high")).toBe("高");
    expect(priorityLabel("medium")).toBe("中");
    expect(priorityLabel("low")).toBe("低");
    expect(priorityLabel(null)).toBeNull();

    expect(statusLabel("not_started")).toBe("未着手");
    expect(statusLabel("in_progress")).toBe("進行中");
    expect(statusLabel("done")).toBe("完了");
  });

  it("完了以外を未完了として扱う", () => {
    expect(isOpen("not_started")).toBe(true);
    expect(isOpen("in_progress")).toBe(true);
    expect(isOpen("done")).toBe(false);
  });

  it("強調するのは高優先度だけ（§11）", () => {
    expect(isHighPriority("high")).toBe(true);
    expect(isHighPriority("medium")).toBe(false);
    expect(isHighPriority(null)).toBe(false);
  });
});

describe("sortByDueDate（A-03 締切順）", () => {
  it("締切の早い順に並ぶ", () => {
    const sorted = sortByDueDate([
      item("c", "2026-09-01T00:00:00Z"),
      item("a", "2026-08-25T00:00:00Z"),
      item("b", "2026-08-28T00:00:00Z"),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("締切が同じなら高優先度が先", () => {
    const same = "2026-08-25T00:00:00Z";
    const sorted = sortByDueDate([
      item("low", same, "not_started", "low"),
      item("high", same, "not_started", "high"),
      item("none", same, "not_started", null),
      item("mid", same, "not_started", "medium"),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["high", "mid", "low", "none"]);
  });

  it("元の配列を変更しない", () => {
    const input = [item("b", "2026-09-01T00:00:00Z"), item("a", "2026-08-25T00:00:00Z")];
    sortByDueDate(input);
    expect(input.map((i) => i.id)).toEqual(["b", "a"]);
  });
});

describe("upcomingAssignments（§4.2 ホーム最大3件）", () => {
  it("完了済みを除き、締切順に最大3件返す", () => {
    const result = upcomingAssignments([
      item("done", "2026-08-20T00:00:00Z", "done"),
      item("d", "2026-09-05T00:00:00Z"),
      item("a", "2026-08-25T00:00:00Z"),
      item("c", "2026-09-01T00:00:00Z"),
      item("b", "2026-08-28T00:00:00Z", "in_progress"),
    ]);
    expect(result.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  it("既定の上限は3件", () => {
    expect(HOME_ASSIGNMENT_LIMIT).toBe(3);
  });

  it("件数が少なければあるだけ返す", () => {
    expect(upcomingAssignments([item("a", "2026-08-25T00:00:00Z")])).toHaveLength(1);
    expect(upcomingAssignments([])).toEqual([]);
  });
});
