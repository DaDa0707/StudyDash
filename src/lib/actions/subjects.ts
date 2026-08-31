"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { errorState, successState, toFieldErrors, type FormState } from "@core/form";
import { createClient } from "@/lib/supabase/server";
import { subjectSchema } from "@core/validation/timetable";

/** 科目の追加・更新・削除。時間割はどのプランでも上限なし（§6）。 */

function parse(formData: FormData) {
  return subjectSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
    teacher: formData.get("teacher") ?? "",
  });
}

/** 一意制約（user_id, name）違反を利用者向けの文言に変える */
function subjectErrorMessage(code: string | undefined, fallback: string): string {
  return code === "23505" ? "同じ名前の科目がすでにあります" : fallback;
}

export async function createSubjectAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return errorState("入力内容を確認してください", toFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("subjects").insert({
    user_id: user.id,
    name: parsed.data.name,
    color: parsed.data.color,
    teacher: parsed.data.teacher,
  });

  if (error) {
    return errorState(subjectErrorMessage(error.code, "科目を追加できませんでした"));
  }

  revalidatePath("/subjects");
  revalidatePath("/timetable");
  return successState("科目を追加しました");
}

export async function updateSubjectAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return errorState("科目が見つかりませんでした");
  }

  const parsed = parse(formData);
  if (!parsed.success) {
    return errorState("入力内容を確認してください", toFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("subjects")
    .update({
      name: parsed.data.name,
      color: parsed.data.color,
      teacher: parsed.data.teacher,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return errorState(subjectErrorMessage(error.code, "科目を更新できませんでした"));
  }

  revalidatePath("/subjects");
  revalidatePath("/timetable");
  revalidatePath("/home");
  return successState("保存しました");
}

/**
 * 科目を削除する。
 * class_sessions.subject_id は ON DELETE SET NULL のため、
 * 授業自体は残り「科目なし」になる。授業ごと消したいかは利用者の判断に委ねる。
 */
export async function deleteSubjectAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return errorState("科目が見つかりませんでした");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return errorState("科目を削除できませんでした");
  }

  revalidatePath("/subjects");
  revalidatePath("/timetable");
  revalidatePath("/home");
  return successState("科目を削除しました");
}
