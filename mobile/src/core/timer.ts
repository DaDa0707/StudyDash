/**
 * 勉強タイマーの計算（仕様書 §5.3）。純粋関数のみ。
 *
 * セッションの状態は3つ:
 *   計測中  : ended_at = null, segment_started_at != null
 *   一時停止: ended_at = null, segment_started_at = null
 *   終了済み: ended_at != null, duration_sec != null
 *
 * 実勉強秒数 = accumulated_sec + 計測中区間の経過秒数。
 * 一時停止した分は accumulated_sec に畳み込まれるため、
 * ブラウザを閉じても DB の値だけで正しく復元できる。
 */

import type { StudySession } from "./database";

export type TimerState = "running" | "paused" | "finished";

/** 経過時間の計算に必要な最小限の情報 */
export type TimerFields = Pick<
  StudySession,
  "started_at" | "ended_at" | "duration_sec" | "segment_started_at" | "accumulated_sec"
>;

export function timerStateOf(session: TimerFields): TimerState {
  if (session.ended_at) return "finished";
  return session.segment_started_at ? "running" : "paused";
}

/**
 * その時点での実勉強秒数を返す。
 * 終了済みなら保存済みの duration_sec をそのまま返す。
 */
export function elapsedSeconds(session: TimerFields, now: Date): number {
  if (session.ended_at) {
    return Math.max(0, session.duration_sec ?? 0);
  }

  const base = Math.max(0, session.accumulated_sec);

  if (!session.segment_started_at) return base;

  const segmentStart = Date.parse(session.segment_started_at);
  if (Number.isNaN(segmentStart)) return base;

  // 端末の時計が巻き戻っている場合に負の値を足さない
  const segment = Math.max(0, Math.floor((now.getTime() - segmentStart) / 1000));
  return base + segment;
}

/** 一時停止時に確定させる累積秒数 */
export function accumulatedOnPause(session: TimerFields, now: Date): number {
  return elapsedSeconds(session, now);
}

/** 終了時に保存する実勉強秒数 */
export function durationOnFinish(session: TimerFields, now: Date): number {
  return elapsedSeconds(session, now);
}

/** タイマー表示。1時間未満は MM:SS、以降は H:MM:SS。 */
export function formatTimerDisplay(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** §5.3「未選択なら『その他』」 */
export const NO_SUBJECT_LABEL = "その他";

export function subjectLabel(name: string | null | undefined): string {
  return name ?? NO_SUBJECT_LABEL;
}
