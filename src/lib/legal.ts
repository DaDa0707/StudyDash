/**
 * 利用規約・プライバシーポリシーで使う運営情報。
 *
 * ここに書いた値は公開ページ（/terms・/privacy）にそのまま出る。
 * App Store の審査でも、運営者と連絡先が読めることが求められる。
 */

export const LEGAL = {
  /** サービス名 */
  serviceName: "StudyDash",

  /** 運営者。個人なら氏名または屋号、法人なら会社名 */
  operator: "千代 茂樹（CHIYO SHIGEKI）",

  /** 問い合わせ先メールアドレス。開示請求や不具合報告の宛先になる */
  contactEmail: "bug.face.116@gmail.com",

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
