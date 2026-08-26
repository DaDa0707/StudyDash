/**
 * 締切の表示と、タイムゾーンをまたぐ日付計算（仕様書 §5.2）。
 *
 * DB は締切を timestamptz で持つ。日付のみで登録された課題（due_all_day）は
 * その日の 23:59 を指す瞬間として保存するため、期限切れ判定は常に
 * 「now > due_at」の一本で済む。
 *
 * 純粋関数のみを置く。
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** 指定タイムゾーンでの暦日を "YYYY-MM-DD" で返す */
export function zonedDateKey(date: Date, timeZone: string): string {
  // en-CA は YYYY-MM-DD 形式
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** 指定タイムゾーンでの時刻を "HH:MM" で返す */
export function zonedTimeKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  const hours = String(Number(lookup("hour")) % 24).padStart(2, "0");
  return `${hours}:${lookup("minute")}`;
}

/** 暦日の差。同じ日なら 0、翌日なら 1。時刻は見ない。 */
export function calendarDayDiff(from: Date, to: Date, timeZone: string): number {
  const start = Date.parse(`${zonedDateKey(from, timeZone)}T00:00:00Z`);
  const end = Date.parse(`${zonedDateKey(to, timeZone)}T00:00:00Z`);
  return Math.round((end - start) / MS_PER_DAY);
}

/** その瞬間におけるタイムゾーンの UTC からのずれ（ミリ秒） */
function zoneOffset(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const asUtc = Date.UTC(
    lookup("year"),
    lookup("month") - 1,
    lookup("day"),
    lookup("hour") % 24,
    lookup("minute"),
    lookup("second"),
  );

  return asUtc - date.getTime();
}

/**
 * 「そのタイムゾーンでの日付と時刻」を UTC の瞬間に変換する。
 * ずれを2回補正することで、夏時間の切り替わり付近でもずれにくくする。
 */
export function zonedToUtc(dateKey: string, timeKey: string, timeZone: string): Date | null {
  const naive = Date.parse(`${dateKey}T${timeKey}:00Z`);
  if (Number.isNaN(naive)) return null;

  let instant = naive - zoneOffset(new Date(naive), timeZone);
  instant = naive - zoneOffset(new Date(instant), timeZone);

  return new Date(instant);
}

/** 日付のみで登録された締切が指す瞬間（その日の 23:59） */
export function endOfDayInZone(dateKey: string, timeZone: string): Date | null {
  return zonedToUtc(dateKey, "23:59", timeZone);
}

export type DueTone = "overdue" | "today" | "tomorrow" | "upcoming";

export interface DueDescription {
  /** 期限切れ / 今日 / 明日 / あとN日 */
  label: string;
  tone: DueTone;
  /** 時刻指定がある場合の "HH:MM"。日付のみなら null */
  timeText: string | null;
  /** §11「期限切れ・高優先度のみ強い警告色を使う」 */
  emphasize: boolean;
}

/**
 * 締切の相対表示（§5.2）。
 *
 * 仕様書は「24時間以内は今日、48時間以内は明日」と書かれているが、
 * 経過時間で判定すると 23:00 に翌朝の締切が「今日」と表示されてしまう。
 * 「今日」「明日」は暦の言葉なので、ユーザーのタイムゾーンでの暦日差で判定する。
 */
export function describeDueDate(
  dueAt: Date,
  now: Date,
  timeZone: string,
  allDay: boolean,
): DueDescription {
  const timeText = allDay ? null : zonedTimeKey(dueAt, timeZone);

  if (dueAt.getTime() < now.getTime()) {
    return { label: "期限切れ", tone: "overdue", timeText, emphasize: true };
  }

  const days = calendarDayDiff(now, dueAt, timeZone);

  if (days <= 0) return { label: "今日", tone: "today", timeText, emphasize: true };
  if (days === 1) return { label: "明日", tone: "tomorrow", timeText, emphasize: false };

  return { label: `あと${days}日`, tone: "upcoming", timeText, emphasize: false };
}

/** 一覧の見出し用。例: 8月25日(火) */
export function formatDueDate(dueAt: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(dueAt);
}

/** その日の終わり（23:59:59.999）を指す瞬間 */
export function endOfToday(now: Date, timeZone: string): Date {
  const end = zonedToUtc(zonedDateKey(now, timeZone), "23:59", timeZone);
  return end ? new Date(end.getTime() + 59_999) : now;
}

/**
 * 今週の終わり（日曜の 23:59:59.999）を指す瞬間。
 * 週は月曜始まりとする（ISO-8601 準拠、時間割の曜日と揃える）。
 */
export function endOfThisWeek(now: Date, timeZone: string): Date {
  const weekday = isoWeekday(now, timeZone);
  const daysLeft = 7 - weekday;

  const end = endOfToday(now, timeZone);
  return new Date(end.getTime() + daysLeft * MS_PER_DAY);
}

/** ISO-8601 の曜日番号（1=月 … 7=日） */
export function isoWeekday(date: Date, timeZone: string): number {
  const short = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const table: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return table[short] ?? 1;
}
