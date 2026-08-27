import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next.js 16 の proxy 規約（旧 middleware）。
 * 全リクエストで Supabase のセッション Cookie を更新し、未認証アクセスを弾く。
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 静的アセットと画像以外の全リクエストで、セッション Cookie を更新する。
     * Stripe Webhook は未認証の外部リクエストなので通さない。
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|api/stripe/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
