"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { errorState, successState, type FormState } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { accumulatedOnPause, durationOnFinish, formatTimerDisplay } from "@core/timer";

/**
 * 勉強タイマーの操作（§5.3 / A-05）。
 *
 * 経過時間はすべてサーバー側の時刻で確定させる。
 * 端末の時計に依存させないため、クライアントからは秒数を受け取らない。
 */

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

function revalidateStudy() {
  revalidatePath("/timer");
  revalidatePath("/analytics");
  revalidatePath("/home");
}

/** 実行中（計測中・一時停止中）のセッションを取得する */
async function loadRunning(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_sessions")
    .select("id, started_at, ended_at, duration_sec, segment_started_at, accumulated_sec")
    .eq("user_id", userId)
    .is("ended_at", null)
    .maybeSingle();
  return data;
}

/** §5.3「タイマー開始前に科目を選択。未選択なら『その他』」 */
export async function startTimerAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = formData.get("subjectId");
  const subjectId = typeof raw === "string" && raw !== "" ? raw : null;

  const { supabase, user } = await currentUser();

  // 二重開始を防ぐ（DB 側にも部分ユニークインデックスがある）
  const running = await loadRunning(user.id);
  if (running) {
    return errorState("すでに計測中のタイマーがあります");
  }

  const now = new Date().toISOString();
  const { error } = await supabase.from("study_sessions").insert({
    user_id: user.id,
    subject_id: subjectId,
    started_at: now,
    segment_started_at: now,
    accumulated_sec: 0,
  });

  if (error) {
    return errorState("タイマーを開始できませんでした");
  }

  revalidateStudy();
  return successState("計測を開始しました");
}

export async function pauseTimerAction(
  _prevState: FormState,
  _formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await currentUser();

  const running = await loadRunning(user.id);
  if (!running) return errorState("計測中のタイマーがありません");
  if (!running.segment_started_at) return successState();

  const { error } = await supabase
    .from("study_sessions")
    .update({
      accumulated_sec: accumulatedOnPause(running, new Date()),
      segment_started_at: null,
    })
    .eq("id", running.id)
    .eq("user_id", user.id);

  if (error) return errorState("一時停止できませんでした");

  revalidateStudy();
  return successState("一時停止しました");
}

export async function resumeTimerAction(
  _prevState: FormState,
  _formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await currentUser();

  const running = await loadRunning(user.id);
  if (!running) return errorState("計測中のタイマーがありません");
  if (running.segment_started_at) return successState();

  const { error } = await supabase
    .from("study_sessions")
    .update({ segment_started_at: new Date().toISOString() })
    .eq("id", running.id)
    .eq("user_id", user.id);

  if (error) return errorState("再開できませんでした");

  revalidateStudy();
  return successState("再開しました");
}

/** §5.3「終了時に開始時刻・終了時刻・実勉強秒数・科目を学習履歴へ保存」（A-05） */
export async function finishTimerAction(
  _prevState: FormState,
  _formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await currentUser();

  const running = await loadRunning(user.id);
  if (!running) return errorState("計測中のタイマーがありません");

  const now = new Date();
  const duration = durationOnFinish(running, now);

  const { error } = await supabase
    .from("study_sessions")
    .update({
      ended_at: now.toISOString(),
      duration_sec: duration,
      segment_started_at: null,
      accumulated_sec: duration,
    })
    .eq("id", running.id)
    .eq("user_id", user.id);

  if (error) return errorState("記録を保存できませんでした");

  revalidateStudy();
  return successState(`${formatTimerDisplay(duration)} を記録しました`);
}

/** 記録せずに破棄する（誤って開始したとき用） */
export async function discardTimerAction(
  _prevState: FormState,
  _formData: FormData,
): Promise<FormState> {
  const { supabase, user } = await currentUser();

  const running = await loadRunning(user.id);
  if (!running) return errorState("計測中のタイマーがありません");

  const { error } = await supabase
    .from("study_sessions")
    .delete()
    .eq("id", running.id)
    .eq("user_id", user.id);

  if (error) return errorState("破棄できませんでした");

  revalidateStudy();
  return successState("記録せずに破棄しました");
}

/** 履歴から1件削除する */
export async function deleteStudySessionAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || id === "") {
    return errorState("記録が見つかりませんでした");
  }

  const { supabase, user } = await currentUser();

  const { error } = await supabase
    .from("study_sessions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .not("ended_at", "is", null);

  if (error) return errorState("削除できませんでした");

  revalidateStudy();
  return successState("削除しました");
}
