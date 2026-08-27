/**
 * 利用計測のイベント定義（仕様書 §7「オンボーディング・継続率の改善」）。
 *
 * 送信先は差し替えられるようにし、ここには「何を送るか」だけを置く。
 * 純粋関数のみ。
 *
 * 方針（§9 プライバシー）:
 *   課題のタイトルや Todo の内容など、本人が書いた文章は**一切送らない**。
 *   送るのは操作の種類と、件数・秒数のような数値だけにする。
 *   sanitizeProperties() がこの約束を機械的に守る。
 */

/** 送ってよいイベント名。ここに無いものは送れない。 */
export const ANALYTICS_EVENTS = [
  // オンボーディング（§1.3「登録から3分以内に登録できる」の計測）
  "signed_up",
  "onboarding_completed",

  // 中心体験の利用
  "subject_created",
  "class_session_created",
  "assignment_created",
  "assignment_completed",
  "todo_created",
  "todo_completed",
  "timer_started",
  "timer_finished",

  // 収益化の導線（§10.2）
  "quota_reached",
  "pro_page_viewed",
  "checkout_started",

  // 仕上げ
  "feedback_submitted",
  "install_prompt_accepted",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

/** 送ってよい値の型。文字列は「決められた語」だけを想定する。 */
export type AnalyticsValue = number | boolean | null;

export type AnalyticsProperties = Record<string, AnalyticsValue | string>;

/**
 * 文字列で送ってよいのは、あらかじめ決めた語彙だけ。
 * 利用者が入力した文章が紛れ込むのを防ぐ。
 */
export const ALLOWED_STRING_VALUES = new Set<string>([
  // プラン
  "free",
  "pro",
  // 上限に達した機能
  "openAssignments",
  "openTodos",
  "studyHistoryDays",
  "notificationTimings",
  "advancedAnalytics",
  "customThemes",
  "dashboardCustomization",
  "csvExport",
  // 課金の間隔
  "monthly",
  "yearly",
  // フィードバックの種類
  "bug",
  "request",
  "question",
  "other",
  // 学校種別
  "junior_high",
  "high_school",
  "university",
  // 課題の優先度・状態
  "low",
  "medium",
  "high",
  "not_started",
  "in_progress",
  "done",
]);

/**
 * 送信前にプロパティを絞り込む。
 *
 * - 数値・真偽値・null はそのまま通す
 * - 文字列は ALLOWED_STRING_VALUES にある語だけ通す
 * - それ以外（自由入力の文章、オブジェクト、配列）は落とす
 *
 * 落とした場合はキーごと消す。黙って別の値に化けるより、無いほうが安全。
 */
export function sanitizeProperties(
  properties: AnalyticsProperties | undefined,
): Record<string, AnalyticsValue | string> {
  if (!properties) return {};

  const safe: Record<string, AnalyticsValue | string> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === "number") {
      if (Number.isFinite(value)) safe[key] = value;
      continue;
    }

    if (typeof value === "boolean" || value === null) {
      safe[key] = value;
      continue;
    }

    if (typeof value === "string" && ALLOWED_STRING_VALUES.has(value)) {
      safe[key] = value;
    }
  }

  return safe;
}

export function isKnownEvent(name: string): name is AnalyticsEvent {
  return (ANALYTICS_EVENTS as readonly string[]).includes(name);
}

/** 送信先の実装が満たすべき形 */
export interface AnalyticsSink {
  capture: (event: AnalyticsEvent, properties: Record<string, AnalyticsValue | string>) => void;
  identify: (userId: string) => void;
  reset: () => void;
}

/**
 * 送信の入口。未知のイベント名は落とし、プロパティは絞り込んでから渡す。
 * sink が無い（未設定）ときは何もしない。
 */
export function captureWith(
  sink: AnalyticsSink | null,
  event: string,
  properties?: AnalyticsProperties,
): boolean {
  if (!sink) return false;
  if (!isKnownEvent(event)) return false;

  sink.capture(event, sanitizeProperties(properties));
  return true;
}
