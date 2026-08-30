/**
 * 学習履歴の集計（仕様書 §3.1 F-07 / §4.2）。純粋関数のみ。
 */

import { zonedDateKey } from "./deadline";

export type CompletedSession = {
  subject_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
};

/** 終了済み（履歴に載る）セッションだけを残す */
export function finishedOnly<T extends CompletedSession>(sessions: readonly T[]): T[] {
  return sessions.filter((s) => s.ended_at !== null && s.duration_sec !== null);
}

export function totalSeconds(sessions: readonly CompletedSession[]): number {
  return sessions.reduce((sum, s) => sum + Math.max(0, s.duration_sec ?? 0), 0);
}

/**
 * 指定期間に「開始した」セッションだけを残す。
 * 終了時刻ではなく開始時刻で数えるのは、日付をまたぐ勉強を
 * 始めた日の記録として扱うほうが振り返りやすいため。
 */
export function inRange<T extends CompletedSession>(
  sessions: readonly T[],
  from: Date,
  to: Date,
): T[] {
  const start = from.getTime();
  const end = to.getTime();

  return sessions.filter((s) => {
    const at = Date.parse(s.started_at);
    return !Number.isNaN(at) && at >= start && at <= end;
  });
}

export interface DailyTotal {
  /** "YYYY-MM-DD"（ユーザーのタイムゾーン） */
  date: string;
  seconds: number;
}

/** 日別の合計を新しい日から順に返す（F-07 日別） */
export function sumByDay(
  sessions: readonly CompletedSession[],
  timeZone: string,
): DailyTotal[] {
  const totals = new Map<string, number>();

  for (const session of sessions) {
    const at = Date.parse(session.started_at);
    if (Number.isNaN(at)) continue;

    const key = zonedDateKey(new Date(at), timeZone);
    totals.set(key, (totals.get(key) ?? 0) + Math.max(0, session.duration_sec ?? 0));
  }

  return [...totals.entries()]
    .map(([date, seconds]) => ({ date, seconds }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export interface SubjectTotal {
  /** null は「その他」（科目未選択） */
  subjectId: string | null;
  seconds: number;
}

/** 科目別の合計を多い順に返す（F-07 科目別 / Pro の分析） */
export function sumBySubject(sessions: readonly CompletedSession[]): SubjectTotal[] {
  const totals = new Map<string | null, number>();

  for (const session of sessions) {
    const key = session.subject_id;
    totals.set(key, (totals.get(key) ?? 0) + Math.max(0, session.duration_sec ?? 0));
  }

  return [...totals.entries()]
    .map(([subjectId, seconds]) => ({ subjectId, seconds }))
    .sort((a, b) => b.seconds - a.seconds);
}
