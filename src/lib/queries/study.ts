import "server-only";

import { cache } from "react";

import { startOfDaysAgo } from "@/lib/deadline";
import { limitOf, type Entitlement } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import type { StudySession, Subject } from "@/types/database";

export type StudySessionWithSubject = StudySession & {
  subject: Pick<Subject, "id" | "name" | "color"> | null;
};

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * 実行中のタイマー（計測中または一時停止中）を1件返す。
 * ended_at が null の行はユーザーごとに最大1件（部分ユニークインデックス）。
 */
export const getRunningSession = cache(
  async (): Promise<StudySessionWithSubject | null> => {
    const userId = await requireUserId();
    if (!userId) return null;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("study_sessions")
      .select("*, subject:subjects(id, name, color)")
      .eq("user_id", userId)
      .is("ended_at", null)
      .maybeSingle();

    if (error) return null;
    return (data as unknown as StudySessionWithSubject | null) ?? null;
  },
);

/**
 * 学習履歴を取得する。
 *
 * §6：Free は直近7日、Pro は全期間。期間の上限は entitlements.ts が決め、
 * ここでは受け取った日数で絞るだけにする。
 */
export const listStudySessions = cache(
  async (entitlement: Entitlement, now: Date, timeZone: string) => {
    const userId = await requireUserId();
    if (!userId) return [];

    const supabase = await createClient();
    let query = supabase
      .from("study_sessions")
      .select("*, subject:subjects(id, name, color)")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false });

    const days = limitOf(entitlement, "studyHistoryDays");
    if (days !== null) {
      query = query.gte("started_at", startOfDaysAgo(now, timeZone, days).toISOString());
    }

    const { data, error } = await query;
    if (error) throw new Error("学習履歴を読み込めませんでした");

    return (data ?? []) as unknown as StudySessionWithSubject[];
  },
);
