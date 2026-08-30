/**
 * 利用規約・プライバシーポリシーで使う運営情報。
 *
 * ⚠️ 公開前に必ず実際の値へ差し替えること。
 * 未記入のままだと、規約・ポリシーの画面に「未設定」と表示される。
 */

export const LEGAL = {
  /** サービス名 */
  serviceName: "StudyDash",

  /** 運営者。個人なら氏名または屋号、法人なら会社名 */
  operator: "",

  /** 問い合わせ先メールアドレス。開示請求や不具合報告の宛先になる */
  contactEmail: "",

  /** 規約・ポリシーの最終改定日（YYYY-MM-DD） */
  termsUpdatedAt: "2026-08-31",
  privacyUpdatedAt: "2026-08-31",

  /** 有料プランを提供しているか。未提供なら関連条項を出さない */
  hasPaidPlan: true,
} as const;

/** 未記入の項目を画面で分かるようにする */
export function orUnset(value: string): string {
  return value.trim() === "" ? "（未設定）" : value;
}

/** 公開前に埋めるべき項目が残っているか */
export function missingLegalFields(): string[] {
  const missing: string[] = [];
  if (!LEGAL.operator.trim()) missing.push("運営者名");
  if (!LEGAL.contactEmail.trim()) missing.push("問い合わせ先メールアドレス");
  return missing;
}
