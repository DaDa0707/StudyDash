import "server-only";

import { cache } from "react";

import { effectiveEntitlement } from "@/lib/billing";
import type { Entitlement } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

/**
 * ログイン中ユーザーの権限を DB から取得する（§7「フロントだけで判定しない」/ A-07）。
 *
 * 参照するのは subscriptions のみ。profiles.plan は表示用キャッシュであり、
 * 権限判定には使わない。RLS により他人の行は読めないが、user_id での絞り込みも明示する。
 *
 * 保存済みの entitlement をそのまま信じず、課金状態と突き合わせて
 * 制限が強いほうを採る（effectiveEntitlement）。Webhook を取りこぼしても
 * Pro が残り続けないようにするため。
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
    .select("entitlement, status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  // 取得に失敗した場合は権限を与えない側に倒す
  if (error || !data) return "free";

  return effectiveEntitlement(
    {
      entitlement: data.entitlement,
      status: data.status,
      currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
    },
    new Date(),
  );
});
