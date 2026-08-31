import { supabase } from "@/lib/supabase";
import type { StudySession } from "@core/database";

/**
 * 書き込み。Web 版の src/lib/actions/* に対応する。
 *
 * タイマーの時刻は必ず DB 側の関数（0004_study_session_rpc.sql）で決める。
 * アプリからは秒数を渡さない。端末の時計を変えても勉強時間を偽装できないようにするため。
 */

function fail(error: { message?: string } | null, fallback: string): never {
  throw new Error(error?.message || fallback);
}

export async function startTimer(subjectId: string | null): Promise<StudySession> {
  const { data, error } = await supabase.rpc("start_study_session", {
    p_subject_id: subjectId,
  });
  if (error) fail(error, "タイマーを開始できませんでした");
  return data as StudySession;
}

export async function pauseTimer(): Promise<StudySession> {
  const { data, error } = await supabase.rpc("pause_study_session");
  if (error) fail(error, "一時停止できませんでした");
  return data as StudySession;
}

export async function resumeTimer(): Promise<StudySession> {
  const { data, error } = await supabase.rpc("resume_study_session");
  if (error) fail(error, "再開できませんでした");
  return data as StudySession;
}

export async function finishTimer(): Promise<StudySession> {
  const { data, error } = await supabase.rpc("finish_study_session");
  if (error) fail(error, "記録を保存できませんでした");
  return data as StudySession;
}

/** 記録せずに破棄する（誤って開始したとき用）。削除は RLS だけで足りる */
export async function discardTimer(id: string): Promise<void> {
  const { error } = await supabase
    .from("study_sessions")
    .delete()
    .eq("id", id)
    .is("ended_at", null);
  if (error) fail(error, "破棄できませんでした");
}

/**
 * 表示補正用のサーバー時刻。
 * 毎秒の描き直しに問い合わせは挟めないので、一度だけ取ってずれを測る。
 */
export async function getServerNow(): Promise<Date> {
  const { data, error } = await supabase.rpc("server_now");
  if (error || !data) return new Date();
  return new Date(data as string);
}

/**
 * Todo の追加。
 *
 * Free 上限の確認は呼び出し側で checkQuota を通してから呼ぶ（Web 版と同じ）。
 * なお上限は DB では強制しておらず、これは Web 版から変わらない性質。
 * 課金を有効にする前に DB 側での確認へ移す必要がある。
 */
export async function addTodo(title: string, dueAt: string | null): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) fail(null, "ログインが必要です");

  const { error } = await supabase
    .from("todos")
    .insert({ user_id: user.id, title: title.trim(), due_at: dueAt });
  if (error) fail(error, "追加できませんでした");
}

/** 完了・未完了を切り替える。completed_at は status と揃える（DB の制約） */
export async function setTodoDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from("todos")
    .update({
      status: done ? "done" : "open",
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) fail(error, "更新できませんでした");
}

export async function deleteTodo(id: string): Promise<void> {
  const { error } = await supabase.from("todos").delete().eq("id", id);
  if (error) fail(error, "削除できませんでした");
}

/** 課題の完了・未完了を切り替える */
export async function setAssignmentDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from("assignments")
    .update({ status: done ? "done" : "not_started" })
    .eq("id", id);
  if (error) fail(error, "更新できませんでした");
}
