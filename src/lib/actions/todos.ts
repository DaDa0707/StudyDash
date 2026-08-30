"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { endOfDayInZone } from "@core/deadline";
import { checkQuota, UPSELL_MESSAGES } from "@core/entitlements";
import { getEntitlement } from "@/lib/entitlements.server";
import { errorState, successState, toFieldErrors, type FormState } from "@/lib/form";
import { countOpenTodos } from "@/lib/queries/assignments";
import { createClient } from "@/lib/supabase/server";
import { todoSchema } from "@/lib/validation/assignments";

/** Todo の追加・完了切り替え・削除（§3.1 F-05 / A-04 / A-06） */

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

async function getTimezone(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  return data?.timezone ?? "Asia/Tokyo";
}

function revalidateTodos() {
  revalidatePath("/todos");
  revalidatePath("/home");
}

export async function createTodoAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = todoSchema.safeParse({
    title: formData.get("title"),
    dueDate: formData.get("dueDate") ?? "",
  });

  if (!parsed.success) {
    return errorState("入力内容を確認してください", toFieldErrors(parsed.error));
  }

  const { supabase, user } = await currentUser();

  // サーバー側で上限を確認する（§7 / A-06）
  const [entitlement, openCount] = await Promise.all([getEntitlement(), countOpenTodos()]);
  const quota = checkQuota(entitlement, "openTodos", openCount);
  if (!quota.allowed) {
    return errorState(UPSELL_MESSAGES.openTodos);
  }

  let dueAt: string | null = null;
  if (parsed.data.dueDate !== "") {
    const timezone = await getTimezone(user.id);
    const resolved = endOfDayInZone(parsed.data.dueDate, timezone);
    if (!resolved) {
      return errorState("期限を解釈できませんでした", { dueDate: "期限を確認してください" });
    }
    dueAt = resolved.toISOString();
  }

  const { error } = await supabase.from("todos").insert({
    user_id: user.id,
    title: parsed.data.title,
    due_at: dueAt,
  });

  if (error) {
    return errorState("Todoを追加できませんでした");
  }

  revalidateTodos();
  return successState("追加しました");
}

/** 1タップで完了/未完了を切り替える（§4.2 UX原則） */
export async function toggleTodoAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return errorState("Todoが見つかりませんでした");
  }

  const { supabase, user } = await currentUser();

  const { data: existing } = await supabase
    .from("todos")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) return errorState("Todoが見つかりませんでした");

  const nextDone = existing.status !== "done";

  const { error } = await supabase
    .from("todos")
    .update({
      status: nextDone ? "done" : "open",
      completed_at: nextDone ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return errorState("更新できませんでした");
  }

  revalidateTodos();
  return successState(nextDone ? "完了にしました" : "未完了に戻しました");
}

export async function deleteTodoAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return errorState("Todoが見つかりませんでした");
  }

  const { supabase, user } = await currentUser();

  const { error } = await supabase.from("todos").delete().eq("id", id).eq("user_id", user.id);

  if (error) {
    return errorState("Todoを削除できませんでした");
  }

  revalidateTodos();
  return successState("削除しました");
}
