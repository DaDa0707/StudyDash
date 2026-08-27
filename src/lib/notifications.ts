/**
 * 締切リマインドの判定（仕様書 §3.1 F-08 / §6）。純粋関数のみ。
 *
 * §6：通知タイミングは Free が1つ、Pro は複数。
 * 上限そのものは entitlements.ts が持ち、ここでは受け取った数で切り詰めるだけにする。
 */

import { zonedTimeKey } from "@/lib/deadline";
import type { Limit } from "@/lib/entitlements";

/** 締切の何分前に知らせるか */
export interface ReminderOption {
  minutes: number;
  label: string;
}

export const REMINDER_OPTIONS: ReminderOption[] = [
  { minutes: 0, label: "締切の時刻" },
  { minutes: 60, label: "1時間前" },
  { minutes: 180, label: "3時間前" },
  { minutes: 1440, label: "前日" },
  { minutes: 2880, label: "2日前" },
];

export function reminderLabel(minutes: number): string {
  return REMINDER_OPTIONS.find((option) => option.minutes === minutes)?.label ?? `${minutes}分前`;
}

/**
 * プランで許される数までタイミングを絞る。
 * 早く知らせるものを優先して残す（締切直前だけ残ると価値が下がるため）。
 */
export function clampReminderOffsets(offsets: readonly number[], limit: Limit): number[] {
  const unique = [...new Set(offsets)]
    .filter((value) => Number.isFinite(value) && value >= 0)
    .sort((a, b) => b - a);

  return limit === null ? unique : unique.slice(0, limit);
}

export interface QuietHours {
  enabled: boolean;
  /** "HH:MM" */
  start: string;
  end: string;
}

/**
 * 通知を控える時間帯か。
 * start > end のときは日付をまたぐ（例 22:00〜07:00）ものとして扱う。
 */
export function isQuietHours(now: Date, timeZone: string, quiet: QuietHours): boolean {
  if (!quiet.enabled) return false;

  const toMinutes = (value: string) => {
    const match = /^(\d{1,2}):(\d{2})/.exec(value.trim());
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
  };

  const start = toMinutes(quiet.start);
  const end = toMinutes(quiet.end);
  if (start === null || end === null || start === end) return false;

  const current = toMinutes(zonedTimeKey(now, timeZone));
  if (current === null) return false;

  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}

type RemindableAssignment = {
  due_at: string;
  status: string;
};

export interface DueBuckets<T> {
  /** 締切を過ぎている未完了 */
  overdue: T[];
  /** 設定したタイミングに入っている未完了 */
  upcoming: T[];
}

/**
 * アプリ内通知に出す課題を選ぶ。
 *
 * §3.1 F-08「対応不可環境ではアプリ内通知」。プッシュが使えなくても、
 * アプリを開けば同じ情報が届くようにするための判定。
 */
export function dueBuckets<T extends RemindableAssignment>(
  assignments: readonly T[],
  offsets: readonly number[],
  now: Date,
): DueBuckets<T> {
  const open = assignments.filter((item) => item.status !== "done");

  // 最も早いタイミング＝最大の分数を通知の窓とする
  const windowMinutes = offsets.length > 0 ? Math.max(...offsets) : 0;
  const windowMs = windowMinutes * 60 * 1000;
  const nowMs = now.getTime();

  const overdue: T[] = [];
  const upcoming: T[] = [];

  for (const item of open) {
    const due = Date.parse(item.due_at);
    if (Number.isNaN(due)) continue;

    if (due < nowMs) {
      overdue.push(item);
    } else if (due - nowMs <= windowMs) {
      upcoming.push(item);
    }
  }

  const byDue = (a: T, b: T) => Date.parse(a.due_at) - Date.parse(b.due_at);
  overdue.sort(byDue);
  upcoming.sort(byDue);

  return { overdue, upcoming };
}

/** 通知バナーを出すべきか（設定と静かな時間帯を加味する） */
export function shouldNotify(input: {
  remindersEnabled: boolean;
  counts: { overdue: number; upcoming: number };
  now: Date;
  timeZone: string;
  quiet: QuietHours;
}): boolean {
  if (!input.remindersEnabled) return false;
  if (input.counts.overdue === 0 && input.counts.upcoming === 0) return false;
  return !isQuietHours(input.now, input.timeZone, input.quiet);
}
