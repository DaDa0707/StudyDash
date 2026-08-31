"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { checkQuota, UPSELL_MESSAGES } from "@core/entitlements";
import { getEntitlement } from "@/lib/entitlements.server";
import { endOfDayInZone, zonedToUtc } from "@core/deadline";
import { errorState, successState, toFieldErrors, type FormState } from "@core/form";
import { countOpenAssignments } from "@/lib/queries/assignments";
import { createClient } from "@/lib/supabase/server";
import { assignmentSchema } from "@core/validation/assignments";

/** 課題の追加・更新・完了・削除（§5.2 / A-03 / A-06） */

function parse(formData: FormData) {
  return assignmentSchema.safeParse({
    title: formData.get("title"),
    subjectId: formData.get("subjectId") ?? "",
    dueDate: formData.get("dueDate"),
    dueTime: formData.get("dueTime") ?? "",
    priority: formData.get("priority") ?? "",
    status: formData.get("status") ?? "not_started",
    note: formData.get("note") ?? "",
  });
}

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/** ユーザーのタイムゾーンを取得する（締切の解釈に使う） */
async function getTimezone(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .maybeSingle();
  return data?.timezone ?? "Asia/Tokyo";
}

/**
 * 締切の日付＋時刻を保存用の瞬間に変換する。
 * 時刻が空なら「日付のみ」の締切として、その日の 23:59 を指す。
 */
function resolveDueAt(
  dueDate: string,
  dueTime: string,
  timezone: string,
): { dueAt: Date; allDay: boolean } | null {
  const allDay = dueTime === "";
  const dueAt = allDay
    ? endOfDayInZone(dueDate, timezone)
    : zonedToUtc(dueDate, dueTime, timezone);

  return dueAt ? { dueAt, allDay } : null;
}

function revalidateAssignments() {
  revalidatePath("/assignments");
  revalidatePath("/home");
}

export async function createAssignmentAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return errorState("入力内容を確認してください", toFieldErrors(parsed.error));
  }

  const { supabase, user } = await currentUser();

  // §7「課金権限はフロントだけで判定しない」。作成前にサーバー側で上限を確認する（A-06）。
  const [entitlement, openCount] = await Promise.all([
    getEntitlement(),
    countOpenAssignments(),
  ]);
  const quota = checkQuota(entitlement, "openAssignments", openCount);
  if (!quota.allowed) {
    return errorState(UPSELL_MESSAGES.openAssignments);
  }

  const timezone = await getTimezone(user.id);
  const due = resolveDueAt(parsed.data.dueDate, parsed.data.dueTime, timezone);
  if (!due) {
    return errorState("締切の日時を解釈できませんでした", { dueDate: "締切を確認してください" });
  }

  const status = parsed.data.status;
  const { error } = await supabase.from("assignments").insert({
    user_id: user.id,
    subject_id: parsed.data.subjectId,
    title: parsed.data.title,
    due_at: due.dueAt.toISOString(),
    due_all_day: due.allDay,
    priority: parsed.data.priority,
    status,
    note: parsed.data.note,
    // DB の check 制約（完了なら completed_at が必須）に合わせる
    completed_at: status === "done" ? new Date().toISOString() : null,
  });

  if (error) {
    return errorState("課題を追加できませんでした");
  }

  revalidateAssignments();
  redirect("/assignments?saved=1");
}

export async function updateAssignmentAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return errorState("課題が見つかりませんでした");
  }

  const parsed = parse(formData);
  if (!parsed.success) {
    return errorState("入力内容を確認してください", toFieldErrors(parsed.error));
  }

  const { supabase, user } = await currentUser();

  const timezone = await getTimezone(user.id);
  const due = resolveDueAt(parsed.data.dueDate, parsed.data.dueTime, timezone);
  if (!due) {
    return errorState("締切の日時を解釈できませんでした", { dueDate: "締切を確認してください" });
  }

  // 完了へ変える場合のみ completed_at を立てる。既存の完了日時は保つ。
  const { data: existing } = await supabase
    .from("assignments")
    .select("status, completed_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const status = parsed.data.status;
  const completedAt =
    status === "done"
      ? (existing?.status === "done" ? existing.completed_at : null) ?? new Date().toISOString()
      : null;

  const { error } = await supabase
    .from("assignments")
    .update({
      subject_id: parsed.data.subjectId,
      title: parsed.data.title,
      due_at: due.dueAt.toISOString(),
      due_all_day: due.allDay,
      priority: parsed.data.priority,
      status,
      note: parsed.data.note,
      completed_at: completedAt,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return errorState("課題を更新できませんでした");
  }

  revalidateAssignments();
  redirect("/assignments?saved=1");
}

/**
 * 完了状態を切り替える（A-03）。
 * ホームや一覧から1タップで呼ぶため、フォーム結果を返して画面遷移はしない（§4.2 UX原則）。
 */
export async function toggleAssignmentAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return errorState("課題が見つかりませんでした");
  }

  const { supabase, user } = await currentUser();

  const { data: existing } = await supabase
    .from("assignments")
    .select("status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) return errorState("課題が見つかりませんでした");

  const nextDone = existing.status !== "done";

  const { error } = await supabase
    .from("assignments")
    .update({
      status: nextDone ? "done" : "not_started",
      completed_at: nextDone ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return errorState("更新できませんでした");
  }

  revalidateAssignments();
  return successState(nextDone ? "完了にしました" : "未完了に戻しました");
}

export async function deleteAssignmentAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return errorState("課題が見つかりませんでした");
  }

  const { supabase, user } = await currentUser();

  const { error } = await supabase
    .from("assignments")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return errorState("課題を削除できませんでした");
  }

  revalidateAssignments();
  redirect("/assignments");
}
