import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requirePublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Server Component / Server Action / Route Handler 用のクライアント。
 * リクエストごとに生成すること（Cookie ストアを跨いで使い回さない）。
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component からは Cookie を書き込めない。
          // セッション更新は middleware 側で行うため、ここでは無視してよい。
        }
      },
    },
  });
}
