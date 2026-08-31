import { supabase } from "@/lib/supabase";
import { endOfDayInZone, zonedToUtc } from "@core/deadline";
import type {
  AssignmentStatus,
  PriorityLevel,
  StudySession,
} from "@core/database";

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

/**
 * 課題の完了・未完了を切り替える。
 * completed_at は status と揃える（assignments_completed_at_consistent）。
 * すでに完了しているものの完了日時は保つ。
 */
export async function setAssignmentDone(id: string, done: boolean): Promise<void> {
  const { data: existing } = await supabase
    .from("assignments")
    .select("status, completed_at")
    .eq("id", id)
    .maybeSingle();

  const completedAt = done
    ? ((existing?.status === "done" ? existing.completed_at : null) ?? new Date().toISOString())
    : null;

  const { error } = await supabase
    .from("assignments")
    .update({
      status: done ? "done" : "not_started",
      completed_at: completedAt,
    })
    .eq("id", id);
  if (error) fail(error, "更新できませんでした");
}

// ── 課題 ───────────────────────────────────────────────

/**
 * 締切の日付＋時刻を保存用の瞬間に変換する。
 * 時刻が空なら「日付のみ」の締切として、その日の 23:59 を指す。
 * 計算は core/deadline.ts のものをそのまま使う（Web 版と同じ）。
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

export interface AssignmentValues {
  title: string;
  subjectId: string | null;
  dueDate: string;
  dueTime: string;
  priority: PriorityLevel | null;
  status: AssignmentStatus;
  note: string | null;
}

export async function createAssignment(
  values: AssignmentValues,
  timezone: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) fail(null, "ログインが必要です");

  const due = resolveDueAt(values.dueDate, values.dueTime, timezone);
  if (!due) fail(null, "締切の日時を解釈できませんでした");

  const { error } = await supabase.from("assignments").insert({
    user_id: user.id,
    subject_id: values.subjectId,
    title: values.title,
    due_at: due.dueAt.toISOString(),
    due_all_day: due.allDay,
    priority: values.priority,
    status: values.status,
    note: values.note,
    // DB の check 制約（完了なら completed_at が必須）に合わせる
    completed_at: values.status === "done" ? new Date().toISOString() : null,
  });

  if (error) fail(error, "課題を追加できませんでした");
}

export async function updateAssignment(
  id: string,
  values: AssignmentValues,
  timezone: string,
): Promise<void> {
  const due = resolveDueAt(values.dueDate, values.dueTime, timezone);
  if (!due) fail(null, "締切の日時を解釈できませんでした");

  // 完了へ変える場合のみ completed_at を立てる。既存の完了日時は保つ。
  const { data: existing } = await supabase
    .from("assignments")
    .select("status, completed_at")
    .eq("id", id)
    .maybeSingle();

  const completedAt =
    values.status === "done"
      ? ((existing?.status === "done" ? existing.completed_at : null) ??
        new Date().toISOString())
      : null;

  const { error } = await supabase
    .from("assignments")
    .update({
      subject_id: values.subjectId,
      title: values.title,
      due_at: due.dueAt.toISOString(),
      due_all_day: due.allDay,
      priority: values.priority,
      status: values.status,
      note: values.note,
      completed_at: completedAt,
    })
    .eq("id", id);

  if (error) fail(error, "課題を更新できませんでした");
}

export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) fail(error, "課題を削除できませんでした");
}

// ── 授業（時間割の1コマ） ────────────────────────────────

export interface ClassSessionValues {
  subjectId: string;
  weekday: number;
  period: number;
  startTime: string;
  endTime: string;
  room: string | null;
  note: string | null;
}

/**
 * §5.1: 同一曜日・同一時限の重複は警告するだけで、保存自体は許可する。
 * 判定は core/timetable.ts の findSlotConflicts が担当する。
 */
export async function createClassSession(values: ClassSessionValues): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) fail(null, "ログインが必要です");

  const { error } = await supabase.from("class_sessions").insert({
    user_id: user.id,
    subject_id: values.subjectId,
    weekday: values.weekday,
    period: values.period,
    start_time: values.startTime,
    end_time: values.endTime,
    room: values.room,
    note: values.note,
  });

  if (error) fail(error, "授業を追加できませんでした");
}

export async function updateClassSession(
  id: string,
  values: ClassSessionValues,
): Promise<void> {
  const { error } = await supabase
    .from("class_sessions")
    .update({
      subject_id: values.subjectId,
      weekday: values.weekday,
      period: values.period,
      start_time: values.startTime,
      end_time: values.endTime,
      room: values.room,
      note: values.note,
    })
    .eq("id", id);

  if (error) fail(error, "授業を更新できませんでした");
}

export async function deleteClassSession(id: string): Promise<void> {
  const { error } = await supabase.from("class_sessions").delete().eq("id", id);
  if (error) fail(error, "授業を削除できませんでした");
}

// ── 科目 ───────────────────────────────────────────────

export interface SubjectValues {
  name: string;
  color: string;
  teacher: string | null;
}

/** 一意制約（user_id, name）違反を利用者向けの文言に変える */
function subjectErrorMessage(code: string | undefined, fallback: string): string {
  return code === "23505" ? "同じ名前の科目がすでにあります" : fallback;
}

export async function createSubject(values: SubjectValues): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) fail(null, "ログインが必要です");

  const { error } = await supabase.from("subjects").insert({
    user_id: user.id,
    name: values.name,
    color: values.color,
    teacher: values.teacher,
  });

  if (error) throw new Error(subjectErrorMessage(error.code, "科目を追加できませんでした"));
}

export async function updateSubject(id: string, values: SubjectValues): Promise<void> {
  const { error } = await supabase
    .from("subjects")
    .update({ name: values.name, color: values.color, teacher: values.teacher })
    .eq("id", id);

  if (error) throw new Error(subjectErrorMessage(error.code, "科目を更新できませんでした"));
}

/**
 * 科目を削除する。
 * class_sessions.subject_id は ON DELETE SET NULL のため、
 * 授業自体は残り「科目なし」になる。授業ごと消したいかは利用者の判断に委ねる。
 */
export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from("subjects").delete().eq("id", id);
  if (error) fail(error, "科目を削除できませんでした");
}
