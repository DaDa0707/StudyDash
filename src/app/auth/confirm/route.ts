import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/**
 * メール確認・パスワード再設定リンクの着地点。
 * token_hash 方式（メールOTP）と code 方式（PKCE）の両方を受ける。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const nextParam = searchParams.get("next");
  // 自サイト内の絶対パスのみ許可（オープンリダイレクト防止）
  const next = nextParam && /^\/(?!\/)/.test(nextParam) ? nextParam : "/?confirmed=1";

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(next);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
  }

  redirect("/?error=link_invalid");
}
