/**
 * Supabase が返すエラーコードを日本語の文言に寄せる。
 *
 * 未知のコードはそのまま出さず汎用文言に丸める（内部情報を漏らさない）。
 * ただし問い合わせで原因を追えるよう、符牒だけは添える。
 * 純粋関数なので web とアプリの両方から使う。
 */
export function authErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "invalid_credentials":
      return "メールアドレスまたはパスワードが正しくありません";
    case "email_not_confirmed":
      return "メールアドレスの確認が完了していません。確認メールのリンクを開いてください";
    case "user_already_exists":
    case "email_exists":
      return "このメールアドレスは既に登録されています";
    case "weak_password":
      return "パスワードが簡単すぎます。より複雑なものを設定してください";
    case "email_address_invalid":
      return "このメールアドレスは使えません。別のアドレスでお試しください";
    case "email_address_not_authorized":
      return "このメールアドレスへは送信できません";
    case "signup_disabled":
      return "現在、新規登録を受け付けていません";
    case "validation_failed":
      return "入力内容を確認してください";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "リクエストが多すぎます。しばらく待ってからお試しください";
    case "same_password":
      return "現在と同じパスワードは設定できません";
    default:
      return code ? `${fallback}（コード: ${code}）` : fallback;
  }
}
