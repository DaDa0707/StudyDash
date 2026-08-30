import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { SessionWithSubject } from "@core/timetable";
import type { Subject } from "@core/database";

/**
 * 時間割まわりの読み取り。
 * RLS により本人の行しか返らないが、意図を明示するため user_id でも絞る。
 */

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** 有効な科目を名前順で取得する */
export const listSubjects = cache(async (): Promise<Subject[]> => {
  const userId = await requireUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("name", { ascending: true });

  if (error) throw new Error("科目を読み込めませんでした");
  return data ?? [];
});

/** 授業を科目付きで全件取得する（週表示・次の授業の両方で使う） */
export const listClassSessions = cache(async (): Promise<SessionWithSubject[]> => {
  const userId = await requireUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_sessions")
    .select("*, subject:subjects(id, name, color)")
    .eq("user_id", userId)
    .order("weekday", { ascending: true })
    .order("period", { ascending: true });

  if (error) throw new Error("時間割を読み込めませんでした");
  return (data ?? []) as unknown as SessionWithSubject[];
});

/** 編集画面用に1件取得する */
export async function getClassSession(id: string): Promise<SessionWithSubject | null> {
  const userId = await requireUserId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_sessions")
    .select("*, subject:subjects(id, name, color)")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return (data as unknown as SessionWithSubject | null) ?? null;
}

export async function getSubject(id: string): Promise<Subject | null> {
  const userId = await requireUserId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return data ?? null;
}
