/**
 * 時間割の計算ロジック（仕様書 §5.1）。
 *
 * DB アクセスを含まない純粋関数のみを置く。
 * 「次の授業」の判定は曜日と時刻の巡回計算になるため、ここに集約してテストする。
 */

import type { ClassSession, Subject } from "./database";

/** ISO-8601 準拠: 1=月 … 7=日 */
export const WEEKDAYS = [
  { value: 1, label: "月", longLabel: "月曜日" },
  { value: 2, label: "火", longLabel: "火曜日" },
  { value: 3, label: "水", longLabel: "水曜日" },
  { value: 4, label: "木", longLabel: "木曜日" },
  { value: 5, label: "金", longLabel: "金曜日" },
  { value: 6, label: "土", longLabel: "土曜日" },
  { value: 7, label: "日", longLabel: "日曜日" },
] as const;

export const MIN_PERIOD = 1;
export const MAX_PERIOD = 12;

export const PERIODS = Array.from(
  { length: MAX_PERIOD - MIN_PERIOD + 1 },
  (_, index) => MIN_PERIOD + index,
);

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

/**
 * 時限ごとの既定の開始/終了時刻。
 * §5.1 のとおり実際の時刻はユーザーが設定するため、これは入力欄の初期値にのみ使う。
 */
export const DEFAULT_PERIOD_TIMES: Record<number, { start: string; end: string }> = {
  1: { start: "08:50", end: "09:40" },
  2: { start: "09:50", end: "10:40" },
  3: { start: "10:50", end: "11:40" },
  4: { start: "11:50", end: "12:40" },
  5: { start: "13:30", end: "14:20" },
  6: { start: "14:30", end: "15:20" },
  7: { start: "15:30", end: "16:20" },
  8: { start: "16:30", end: "17:20" },
  9: { start: "17:30", end: "18:20" },
  10: { start: "18:30", end: "19:20" },
  11: { start: "19:30", end: "20:20" },
  12: { start: "20:30", end: "21:20" },
};

export function weekdayLabel(weekday: number): string {
  return WEEKDAYS.find((day) => day.value === weekday)?.label ?? "";
}

/**
 * "HH:MM" / "HH:MM:SS" を 0時からの分数に変換する。
 * 解釈できない場合は null を返す（呼び出し側で除外する）。
 */
export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/** DB の time 値（"09:00:00"）を表示用の "09:00" にする */
export function formatTime(time: string): string {
  const minutes = parseTimeToMinutes(time);
  if (minutes === null) return time;

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}

const WEEKDAY_FROM_SHORT: Record<string, number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  Sun: 7,
};

/** 指定タイムゾーンでの曜日（1=月…7=日）と、その日の 0 時からの経過分 */
export function zonedWeekdayAndMinutes(
  date: Date,
  timeZone: string,
): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  // hour12:false でも環境により "24" が返るため 24 で丸める
  const hours = Number(lookup("hour")) % 24;
  const minutes = Number(lookup("minute"));

  return {
    weekday: WEEKDAY_FROM_SHORT[lookup("weekday")] ?? 1,
    minutes: hours * 60 + minutes,
  };
}

/** 週内の位置を分で表す（月曜0時からの経過分） */
function weekMinutes(weekday: number, minutesOfDay: number): number {
  return (weekday - 1) * MINUTES_PER_DAY + minutesOfDay;
}

export type SessionWithSubject = ClassSession & {
  subject: Pick<Subject, "id" | "name" | "color"> | null;
};

export interface UpcomingClass<T> {
  session: T;
  /** 今まさに授業中か（開始済みで終了前） */
  inProgress: boolean;
  /** 開始までの分数。授業中なら 0 */
  minutesUntilStart: number;
}

type TimeFields = Pick<ClassSession, "weekday" | "start_time" | "end_time">;

/**
 * 現在時刻を基準に「今の授業」または「次の授業」を1件返す（§5.1）。
 *
 * 授業中の場合はその授業を inProgress=true で返す。
 * 授業中でなければ、現在時刻以降で最も近い開始時刻の授業を返す。
 * 時間割は週次で繰り返すため、週末をまたいで翌週の月曜まで巡回して探す。
 */
export function findCurrentOrNextClass<T extends TimeFields>(
  sessions: readonly T[],
  now: Date,
  timeZone: string,
): UpcomingClass<T> | null {
  const { weekday, minutes } = zonedWeekdayAndMinutes(now, timeZone);
  const nowInWeek = weekMinutes(weekday, minutes);

  let best: UpcomingClass<T> | null = null;

  for (const session of sessions) {
    const start = parseTimeToMinutes(session.start_time);
    const end = parseTimeToMinutes(session.end_time);
    if (start === null || end === null) continue;

    const startInWeek = weekMinutes(session.weekday, start);
    const duration = end - start;

    // 進行中かどうかは「今週のその曜日」の枠で判定する
    if (nowInWeek >= startInWeek && nowInWeek < startInWeek + duration) {
      return { session, inProgress: true, minutesUntilStart: 0 };
    }

    // 週をまたいで巡回させる（日曜の夜 → 翌週の月曜）
    let until = startInWeek - nowInWeek;
    if (until < 0) until += MINUTES_PER_WEEK;

    if (!best || until < best.minutesUntilStart) {
      best = { session, inProgress: false, minutesUntilStart: until };
    }
  }

  return best;
}

/** 開始までの残り時間を「あと15分」「あと2時間30分」「明日」などにする */
export function formatTimeUntil(minutesUntilStart: number): string {
  if (minutesUntilStart <= 0) return "まもなく";
  if (minutesUntilStart < 60) return `あと${minutesUntilStart}分`;

  if (minutesUntilStart < MINUTES_PER_DAY) {
    const hours = Math.floor(minutesUntilStart / 60);
    const minutes = minutesUntilStart % 60;
    return minutes === 0 ? `あと${hours}時間` : `あと${hours}時間${minutes}分`;
  }

  const days = Math.floor(minutesUntilStart / MINUTES_PER_DAY);
  return days === 1 ? "明日" : `${days}日後`;
}

/**
 * 同一曜日・同一時限に既に授業があるかを調べる（§5.1）。
 * 重複は「警告するが保存は許可する」ため、判定結果は保存の可否には使わない。
 *
 * @param excludeId 編集中の授業を除外するための ID
 */
export function findSlotConflicts<T extends { id: string; weekday: number; period: number }>(
  sessions: readonly T[],
  candidate: { weekday: number; period: number },
  excludeId?: string,
): T[] {
  return sessions.filter(
    (session) =>
      session.id !== excludeId &&
      session.weekday === candidate.weekday &&
      session.period === candidate.period,
  );
}

/** 曜日ごとにまとめ、時限順（同時限なら開始時刻順）に並べる */
export function groupByWeekday<T extends TimeFields & { period: number }>(
  sessions: readonly T[],
): Map<number, T[]> {
  const grouped = new Map<number, T[]>();

  for (const day of WEEKDAYS) {
    grouped.set(day.value, []);
  }

  for (const session of sessions) {
    grouped.get(session.weekday)?.push(session);
  }

  for (const list of grouped.values()) {
    list.sort(
      (a, b) =>
        a.period - b.period ||
        (parseTimeToMinutes(a.start_time) ?? 0) - (parseTimeToMinutes(b.start_time) ?? 0),
    );
  }

  return grouped;
}
