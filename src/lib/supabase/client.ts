"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requirePublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/** ブラウザ側の Supabase クライアント（anon key のみを使う） */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
