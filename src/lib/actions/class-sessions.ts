"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { errorState, toFieldErrors, type FormState } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { classSessionSchema } from "@/lib/validation/timetable";

/** 授業（時間割の1コマ）の追加・更新・削除（§5.1） */

function parse(formData: FormData) {
  return classSessionSchema.safeParse({
    subjectId: formData.get("subjectId"),
    weekday: formData.get("weekday"),
    period: formData.get("period"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    room: formData.get("room") ?? "",
    note: formData.get("note") ?? "",
  });
}

function revalidateTimetable() {
  revalidatePath("/timetable");
  revalidatePath("/home");
}

export async function createClassSessionAction(
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

  // §5.1: 同一曜日・同一時限の重複は警告するだけで、保存自体は許可する。
  const { error } = await supabase.from("class_sessions").insert({
    user_id: user.id,
    subject_id: parsed.data.subjectId,
    weekday: parsed.data.weekday,
    period: parsed.data.period,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
    room: parsed.data.room,
    note: parsed.data.note,
  });

  if (error) {
    return errorState("授業を追加できませんでした");
  }

  revalidateTimetable();
  redirect(`/timetable?day=${parsed.data.weekday}&saved=1`);
}

export async function updateClassSessionAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return errorState("授業が見つかりませんでした");
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
    .from("class_sessions")
    .update({
      subject_id: parsed.data.subjectId,
      weekday: parsed.data.weekday,
      period: parsed.data.period,
      start_time: parsed.data.startTime,
      end_time: parsed.data.endTime,
      room: parsed.data.room,
      note: parsed.data.note,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return errorState("授業を更新できませんでした");
  }

  revalidateTimetable();
  redirect(`/timetable?day=${parsed.data.weekday}&saved=1`);
}

export async function deleteClassSessionAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return errorState("授業が見つかりませんでした");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("class_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return errorState("授業を削除できませんでした");
  }

  revalidateTimetable();
  const weekday = formData.get("weekday");
  redirect(`/timetable${typeof weekday === "string" ? `?day=${weekday}` : ""}`);
}
