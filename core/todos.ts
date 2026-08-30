/**
 * Todo の分類（仕様書 §4.1 S-06：今日 / 今週 / 完了済み）。純粋関数のみ。
 */

import { endOfThisWeek, endOfToday } from "./deadline";
import type { TodoStatus } from "./database";

export type TodoBucket = "today" | "thisWeek" | "later" | "done";

type BucketableTodo = {
  due_at: string | null;
  status: TodoStatus;
};

/**
 * Todo を4つの区分に振り分ける。
 *
 * - today: 未完了で、期限が今日の終わりまで（超過分を含む）。期限なしもここへ入れる
 *   （§5「期限は任意」の Todo を、どこにも出ないまま埋もれさせないため）
 * - thisWeek: 未完了で、期限が明日以降・今週日曜まで
 * - later: 未完了で、期限が来週以降
 * - done: 完了済み
 */
export function bucketOf(
  todo: BucketableTodo,
  now: Date,
  timeZone: string,
): TodoBucket {
  if (todo.status === "done") return "done";
  if (!todo.due_at) return "today";

  const due = Date.parse(todo.due_at);
  if (Number.isNaN(due)) return "today";

  if (due <= endOfToday(now, timeZone).getTime()) return "today";
  if (due <= endOfThisWeek(now, timeZone).getTime()) return "thisWeek";
  return "later";
}

export interface GroupedTodos<T> {
  today: T[];
  thisWeek: T[];
  later: T[];
  done: T[];
}

/** 区分ごとにまとめる。各区分は期限順（期限なしは末尾）に並べる。 */
export function groupTodos<T extends BucketableTodo & { sort_order: number; created_at: string }>(
  todos: readonly T[],
  now: Date,
  timeZone: string,
): GroupedTodos<T> {
  const grouped: GroupedTodos<T> = { today: [], thisWeek: [], later: [], done: [] };

  for (const todo of todos) {
    grouped[bucketOf(todo, now, timeZone)].push(todo);
  }

  const byDue = (a: T, b: T) => {
    const aDue = a.due_at ? Date.parse(a.due_at) : Number.POSITIVE_INFINITY;
    const bDue = b.due_at ? Date.parse(b.due_at) : Number.POSITIVE_INFINITY;
    if (aDue !== bDue) return aDue - bDue;
    if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
    return Date.parse(a.created_at) - Date.parse(b.created_at);
  };

  grouped.today.sort(byDue);
  grouped.thisWeek.sort(byDue);
  grouped.later.sort(byDue);
  // 完了済みは新しく完了したものから見たいので降順
  grouped.done.sort((a, b) => -byDue(a, b));

  return grouped;
}

export function countOpen(todos: readonly BucketableTodo[]): number {
  return todos.filter((todo) => todo.status !== "done").length;
}
