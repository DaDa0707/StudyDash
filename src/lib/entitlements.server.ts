import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Entitlement } from "@/lib/entitlements";

/**
 * ログイン中ユーザーの権限を DB から取得する（§7「フロントだけで判定しない」）。
 *
 * 参照するのは subscriptions.entitlement のみ。profiles.plan は表示用キャッシュであり、
 * 権限判定には使わない。RLS により他人の行は読めないため、user_id での絞り込みは
 * 保険として明示している。
 *
 * 同一リクエスト内では React cache により1回だけ問い合わせる。
 */
export const getEntitlement = cache(async (): Promise<Entitlement> => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "free";

  const { data, error } = await supabase
    .from("subscriptions")
    .select("entitlement")
    .eq("user_id", user.id)
    .maybeSingle();

  // 取得に失敗した場合は権限を与えない側に倒す
  if (error || !data) return "free";

  return data.entitlement;
});
