/**
 * 課題の分類・並べ替え（仕様書 §5.2）。純粋関数のみ。
 */

import type { AssignmentStatus, PriorityLevel } from "./database";

export const PRIORITIES: { value: PriorityLevel; label: string }[] = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

export const ASSIGNMENT_STATUSES: { value: AssignmentStatus; label: string }[] = [
  { value: "not_started", label: "未着手" },
  { value: "in_progress", label: "進行中" },
  { value: "done", label: "完了" },
];

export function priorityLabel(priority: PriorityLevel | null): string | null {
  return PRIORITIES.find((item) => item.value === priority)?.label ?? null;
}

export function statusLabel(status: AssignmentStatus): string {
  return ASSIGNMENT_STATUSES.find((item) => item.value === status)?.label ?? status;
}

export function isOpen(status: AssignmentStatus): boolean {
  return status !== "done";
}

/** §11「期限切れ・高優先度のみ強い警告色を使う」 */
export function isHighPriority(priority: PriorityLevel | null): boolean {
  return priority === "high";
}

type SortableAssignment = {
  due_at: string;
  status: AssignmentStatus;
  priority: PriorityLevel | null;
};

const PRIORITY_WEIGHT: Record<PriorityLevel, number> = { high: 0, medium: 1, low: 2 };

/**
 * 締切順に並べる（A-03）。締切が同じなら高優先度を先に出す。
 * 元の配列は変更しない。
 */
export function sortByDueDate<T extends SortableAssignment>(assignments: readonly T[]): T[] {
  return [...assignments].sort((a, b) => {
    const byDue = Date.parse(a.due_at) - Date.parse(b.due_at);
    if (byDue !== 0) return byDue;

    const aWeight = a.priority ? PRIORITY_WEIGHT[a.priority] : 3;
    const bWeight = b.priority ? PRIORITY_WEIGHT[b.priority] : 3;
    return aWeight - bWeight;
  });
}

/** ホームに出す「締切が近い課題」（§4.2：最大3件） */
export const HOME_ASSIGNMENT_LIMIT = 3;

export function upcomingAssignments<T extends SortableAssignment>(
  assignments: readonly T[],
  limit = HOME_ASSIGNMENT_LIMIT,
): T[] {
  return sortByDueDate(assignments.filter((item) => isOpen(item.status))).slice(0, limit);
}
