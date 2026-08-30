import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, requirePublicEnv } from "@/lib/env";
import type { Database } from "@core/database";

/** 認証が要るパス。ここに載らないパスは公開扱い。 */
const PROTECTED_PREFIXES = [
  "/home",
  "/timetable",
  "/subjects",
  "/assignments",
  "/todos",
  "/timer",
  "/analytics",
  "/settings",
  "/more",
  "/pro",
  "/feedback",
  "/onboarding",
];

/** ログイン済みユーザーが開くべきでないパス */
const AUTH_ONLY_PREFIXES = ["/login", "/signup", "/reset-password"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * セッション Cookie を更新し、未認証アクセスを弾く。
 * ここでのリダイレクトは UX 上の入口制御であり、データ保護の主体は RLS（§9）。
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) {
    // 本番で設定漏れのまま認証チェックを素通りさせないよう、ここで止める。
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Supabase の環境変数が設定されていません。NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。",
      );
    }
    // 開発時は未設定でもトップページを開けるようにする（セットアップは README を参照）。
    return response;
  }

  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // getUser() を呼ぶことでトークンが検証・更新される。getSession() で代替しないこと。
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && matches(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && matches(pathname, AUTH_ONLY_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
