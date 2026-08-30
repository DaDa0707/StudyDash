import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Assignment, Subject, Todo } from "@core/database";

export type AssignmentWithSubject = Assignment & {
  subject: Pick<Subject, "id" | "name" | "color"> | null;
};

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** 課題を締切順に全件取得する */
export const listAssignments = cache(async (): Promise<AssignmentWithSubject[]> => {
  const userId = await requireUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("*, subject:subjects(id, name, color)")
    .eq("user_id", userId)
    .order("due_at", { ascending: true });

  if (error) throw new Error("課題を読み込めませんでした");
  return (data ?? []) as unknown as AssignmentWithSubject[];
});

export async function getAssignment(id: string): Promise<AssignmentWithSubject | null> {
  const userId = await requireUserId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("assignments")
    .select("*, subject:subjects(id, name, color)")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return (data as unknown as AssignmentWithSubject | null) ?? null;
}

/** Todo を全件取得する（区分けは groupTodos が行う） */
export const listTodos = cache(async (): Promise<Todo[]> => {
  const userId = await requireUserId();
  if (!userId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("todos")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error("Todoを読み込めませんでした");
  return data ?? [];
});

/**
 * 未完了件数を DB 側で数える（§6 Free 上限の判定材料）。
 * 一覧の取得結果を使わず count で取るのは、上限判定を一覧の絞り込みから独立させるため。
 */
export async function countOpenAssignments(): Promise<number> {
  const userId = await requireUserId();
  if (!userId) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "done");

  if (error) throw new Error("課題の件数を取得できませんでした");
  return count ?? 0;
}

export async function countOpenTodos(): Promise<number> {
  const userId = await requireUserId();
  if (!userId) return 0;

  const supabase = await createClient();
  const { count, error } = await supabase
    .from("todos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "done");

  if (error) throw new Error("Todoの件数を取得できませんでした");
  return count ?? 0;
}
