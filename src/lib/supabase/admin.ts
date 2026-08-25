import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { requirePublicEnv, requireServiceRoleKey } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * service_role クライアント。RLS をバイパスするため、
 * 署名検証済み Webhook とアカウント削除など、サーバー内部処理からのみ使う（§9）。
 * クライアントコンポーネントから絶対に import しないこと。
 */
export function createAdminClient() {
  const { supabaseUrl } = requirePublicEnv();
  return createSupabaseClient<Database>(supabaseUrl, requireServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
