/**
 * Free / Pro の権限判定。仕様書 §6 に対応する。
 *
 * このファイルがプラン判定の唯一の実装（§14.1「Pro判定ロジックを1か所に集約」）。
 * 画面側で「plan === 'pro'」のような比較を書かず、必ずここの関数を通すこと。
 *
 * 純粋関数のみを置く（DB アクセスは entitlements.server.ts）。
 */

import type { PlanType } from "@/types/database";

export type Entitlement = PlanType;

/** 上限が無い場合は null */
export type Limit = number | null;

export interface PlanLimits {
  /** 未完了課題の最大件数 */
  openAssignments: Limit;
  /** 未完了 Todo の最大件数 */
  openTodos: Limit;
  /** 学習履歴を遡れる日数 */
  studyHistoryDays: Limit;
  /** 科目別・推移グラフを含む分析 */
  advancedAnalytics: boolean;
  /** 締切通知に設定できるタイミング数 */
  notificationTimings: Limit;
  /** 追加テーマ・アクセントカラー */
  customThemes: boolean;
  /** ダッシュボードのカード並び替え・表示切替 */
  dashboardCustomization: boolean;
  /** CSV エクスポート */
  csvExport: boolean;
}

export const PLAN_LIMITS: Record<Entitlement, PlanLimits> = {
  free: {
    openAssignments: 20,
    openTodos: 30,
    studyHistoryDays: 7,
    advancedAnalytics: false,
    notificationTimings: 1,
    customThemes: false,
    dashboardCustomization: false,
    csvExport: false,
  },
  pro: {
    openAssignments: null,
    openTodos: null,
    studyHistoryDays: null,
    advancedAnalytics: true,
    notificationTimings: 5,
    customThemes: true,
    dashboardCustomization: true,
    csvExport: true,
  },
};

export function limitsFor(entitlement: Entitlement): PlanLimits {
  return PLAN_LIMITS[entitlement];
}

export function isPro(entitlement: Entitlement): boolean {
  return entitlement === "pro";
}

/** 真偽値で表される Pro 限定機能 */
export type BooleanFeature = {
  [K in keyof PlanLimits]: PlanLimits[K] extends boolean ? K : never;
}[keyof PlanLimits];

/** 件数上限で表される機能 */
export type QuotaFeature = {
  [K in keyof PlanLimits]: PlanLimits[K] extends Limit ? K : never;
}[keyof PlanLimits];

/** 機能が使えるか（真偽値の機能のみ） */
export function can(entitlement: Entitlement, feature: BooleanFeature): boolean {
  return limitsFor(entitlement)[feature];
}

export function limitOf(entitlement: Entitlement, feature: QuotaFeature): Limit {
  return limitsFor(entitlement)[feature];
}

export interface QuotaCheck {
  /** これ以上追加してよいか */
  allowed: boolean;
  limit: Limit;
  current: number;
  /** 残り作成可能件数。上限なしの場合は null */
  remaining: Limit;
  /** 上限に達しており Pro 案内を出すべきか（§12 A-06） */
  shouldUpsell: boolean;
}

/**
 * 件数上限に対して、あと1件追加できるかを判定する。
 * 上限に達している場合は追加操作を止め、Pro 案内を表示する（A-06）。
 */
export function checkQuota(
  entitlement: Entitlement,
  feature: QuotaFeature,
  current: number,
): QuotaCheck {
  const limit = limitOf(entitlement, feature);

  if (limit === null) {
    return { allowed: true, limit: null, current, remaining: null, shouldUpsell: false };
  }

  const allowed = current < limit;
  return {
    allowed,
    limit,
    current,
    remaining: Math.max(0, limit - current),
    shouldUpsell: !allowed,
  };
}

/**
 * 学習履歴を遡れる最古の日時。Pro は制限なしのため null を返す。
 * @param now 基準時刻
 */
export function studyHistoryFloor(entitlement: Entitlement, now: Date): Date | null {
  const days = limitOf(entitlement, "studyHistoryDays");
  if (days === null) return null;

  const floor = new Date(now);
  floor.setDate(floor.getDate() - days);
  return floor;
}

/** Pro 限定機能に触れたときの案内文（§10.2 の導線） */
export const UPSELL_MESSAGES: Record<QuotaFeature | BooleanFeature, string> = {
  openAssignments: "無料プランの未完了課題は20件までです。Proにすると無制限に登録できます。",
  openTodos: "無料プランの未完了Todoは30件までです。Proにすると無制限に登録できます。",
  studyHistoryDays: "無料プランでは直近7日分の学習履歴を表示します。Proで全期間を振り返れます。",
  notificationTimings: "無料プランの締切通知は当日1回です。Proで複数のタイミングを設定できます。",
  advancedAnalytics: "科目別・週/月の推移グラフはProの機能です。",
  customThemes: "追加テーマとアクセントカラーはProの機能です。",
  dashboardCustomization: "ダッシュボードの並び替えはProの機能です。",
  csvExport: "CSVエクスポートはProの機能です。",
};

/** Pro ページの機能比較表の1行（§6） */
export interface ComparisonRow {
  feature: string;
  free: string;
  pro: string;
}

function quotaText(limit: Limit, unit: string): string {
  return limit === null ? "無制限" : `${limit}${unit}まで`;
}

/**
 * §6 の機能比較表。PLAN_LIMITS から組み立てるため、
 * 上限を変えたときに表と実際の挙動がずれない。
 */
export function planComparison(): ComparisonRow[] {
  const free = limitsFor("free");
  const pro = limitsFor("pro");

  const yesNo = (value: boolean) => (value ? "利用できる" : "利用できない");

  return [
    { feature: "時間割", free: "利用できる", pro: "利用できる" },
    { feature: "勉強タイマー", free: "利用できる", pro: "利用できる" },
    {
      feature: "未完了の課題",
      free: quotaText(free.openAssignments, "件"),
      pro: quotaText(pro.openAssignments, "件"),
    },
    {
      feature: "未完了のTodo",
      free: quotaText(free.openTodos, "件"),
      pro: quotaText(pro.openTodos, "件"),
    },
    {
      feature: "学習履歴",
      free: free.studyHistoryDays === null ? "全期間" : `直近${free.studyHistoryDays}日`,
      pro: pro.studyHistoryDays === null ? "全期間" : `直近${pro.studyHistoryDays}日`,
    },
    {
      feature: "分析",
      free: free.advancedAnalytics ? "科目別・推移も見られる" : "今日/今週の合計",
      pro: pro.advancedAnalytics ? "科目別・推移も見られる" : "今日/今週の合計",
    },
    {
      feature: "締切通知",
      free: quotaText(free.notificationTimings, "回"),
      pro: quotaText(pro.notificationTimings, "回"),
    },
    {
      feature: "テーマ",
      free: free.customThemes ? "追加テーマも選べる" : "ライト/ダーク",
      pro: pro.customThemes ? "追加テーマも選べる" : "ライト/ダーク",
    },
    {
      feature: "ダッシュボード配置",
      free: free.dashboardCustomization ? "並び替えできる" : "固定",
      pro: pro.dashboardCustomization ? "並び替えできる" : "固定",
    },
    {
      feature: "CSVエクスポート",
      free: yesNo(free.csvExport),
      pro: yesNo(pro.csvExport),
    },
  ];
}
