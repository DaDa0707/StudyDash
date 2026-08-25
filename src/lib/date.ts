/**
 * 日付・時刻の表示ヘルパー。
 * ユーザーのタイムゾーン（profiles.timezone）を常に明示して整形する。
 * サーバーとクライアントで結果がずれないよう、ロケールも固定する。
 */

const LOCALE = "ja-JP";

/** 指定タイムゾーンでの「時」を取り出す */
export function hourIn(date: Date, timeZone: string): number {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).format(date);

  // "24" が返る実装があるため 0 に丸める
  return Number(formatted) % 24;
}

/** 例: 8月25日(月) */
export function formatToday(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone,
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

/** 時間帯に応じた挨拶（§4.2 ホーム先頭の挨拶） */
export function greetingFor(date: Date, timeZone: string): string {
  const hour = hourIn(date, timeZone);
  if (hour < 5) return "おつかれさま";
  if (hour < 11) return "おはよう";
  if (hour < 18) return "こんにちは";
  return "こんばんは";
}

/** 秒を「1時間23分」形式にする（学習時間の表示用） */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours === 0 && minutes === 0) return "0分";
  if (hours === 0) return `${minutes}分`;
  if (minutes === 0) return `${hours}時間`;
  return `${hours}時間${minutes}分`;
}
