import { supabase } from "@/lib/supabase";
import { effectiveEntitlement } from "@core/billing";
import { startOfDaysAgo } from "@core/deadline";
import { limitOf, type Entitlement } from "@core/entitlements";
import type { SessionWithSubject } from "@core/timetable";
import type {
  Assignment,
  ClassSession,
  NotificationSettings,
  SchoolType,
  StudySession,
  Subject,
  Todo,
} from "@core/database";

/**
 * 読み取りをここに集める。Web 版の src/lib/queries/* に対応する。
 *
 * RLS により本人の行しか返らないが、意図を明示するため user_id でも絞る
 * （Web 版と同じ方針）。
 */

export type AssignmentWithSubject = Assignment & {
  subject: Pick<Subject, "id" | "name" | "color"> | null;
};

export interface Profile {
  displayName: string;
  timezone: string;
  schoolType: SchoolType;
}

async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("ログインが必要です");
  return user.id;
}

/** 失敗を握りつぶさない。呼び出し側は useQuery が受け止める */
function unwrap<T>(result: { data: T | null; error: unknown }, what: string): T {
  if (result.error) throw new Error(`${what}を読み込めませんでした`);
  return (result.data ?? []) as T;
}

export async function getProfile(): Promise<Profile> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, timezone, school_type")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error("プロフィールを読み込めませんでした");
  return {
    displayName: data?.display_name ?? "ゲスト",
    timezone: data?.timezone ?? "Asia/Tokyo",
    schoolType: data?.school_type ?? "other",
  };
}

/** 有効な科目を名前順で取得する */
export async function listSubjects(): Promise<Subject[]> {
  const userId = await requireUserId();
  return unwrap<Subject[]>(
    await supabase
      .from("subjects")
      .select("*")
      .eq("user_id", userId)
      .eq("archived", false)
      .order("name", { ascending: true }),
    "科目",
  );
}

/** 授業を科目付きで全件取得する（週表示・次の授業の両方で使う） */
export async function listClassSessions(): Promise<SessionWithSubject[]> {
  const userId = await requireUserId();
  const rows = unwrap<ClassSession[]>(
    await supabase
      .from("class_sessions")
      .select("*, subject:subjects(id, name, color)")
      .eq("user_id", userId)
      .order("weekday", { ascending: true })
      .order("period", { ascending: true }),
    "時間割",
  );
  return rows as unknown as SessionWithSubject[];
}

/** 課題を締切順に全件取得する */
export async function listAssignments(): Promise<AssignmentWithSubject[]> {
  const userId = await requireUserId();
  const rows = unwrap<Assignment[]>(
    await supabase
      .from("assignments")
      .select("*, subject:subjects(id, name, color)")
      .eq("user_id", userId)
      .order("due_at", { ascending: true }),
    "課題",
  );
  return rows as unknown as AssignmentWithSubject[];
}

export async function listTodos(): Promise<Todo[]> {
  const userId = await requireUserId();
  return unwrap<Todo[]>(
    await supabase
      .from("todos")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    "Todo",
  );
}

/** 集計用。終了済みの記録だけを返す */
export async function listFinishedStudySessions(): Promise<StudySession[]> {
  const userId = await requireUserId();
  return unwrap<StudySession[]>(
    await supabase
      .from("study_sessions")
      .select("*")
      .eq("user_id", userId)
      .not("ended_at", "is", null),
    "勉強時間",
  );
}

export type RunningSession = StudySession & {
  subject: Pick<Subject, "id" | "name" | "color"> | null;
};

/** 計測中／一時停止中の記録。無ければ null */
export async function getRunningSession(): Promise<RunningSession | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("study_sessions")
    .select("*, subject:subjects(id, name, color)")
    .eq("user_id", userId)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error("タイマーを読み込めませんでした");
  return (data as unknown as RunningSession | null) ?? null;
}

/**
 * ログイン中ユーザーの権限（§7 / A-07）。
 *
 * 参照するのは subscriptions のみ。profiles.plan は表示用キャッシュなので使わない。
 * 保存済みの値をそのまま信じず、課金状態と突き合わせて制限が強いほうを採る。
 * 取得に失敗したときは権限を与えない側に倒す。
 */
export async function getEntitlement(): Promise<Entitlement> {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("subscriptions")
    .select("entitlement, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return "free";

  return effectiveEntitlement(
    {
      entitlement: data.entitlement,
      status: data.status,
      currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end) : null,
    },
    new Date(),
  );
}

/** 編集画面用に1件取得する */
export async function getAssignment(id: string): Promise<AssignmentWithSubject | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("assignments")
    .select("*, subject:subjects(id, name, color)")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return (data as unknown as AssignmentWithSubject | null) ?? null;
}

export async function getClassSession(id: string): Promise<SessionWithSubject | null> {
  const userId = await requireUserId();
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
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return data ?? null;
}

/** 上限判定に使う。未完了の課題だけを数える */
export async function countOpenAssignments(): Promise<number> {
  const userId = await requireUserId();
  const { count, error } = await supabase
    .from("assignments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "done");

  if (error) throw new Error("課題を読み込めませんでした");
  return count ?? 0;
}

/** 通知の設定。行は登録時に作られる（handle_new_user） */
export async function getNotificationSettings(): Promise<NotificationSettings | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("通知の設定を読み込めませんでした");
  return data ?? null;
}

export type StudySessionWithSubject = StudySession & {
  subject: Pick<Subject, "id" | "name" | "color"> | null;
};

/**
 * 学習履歴を取得する。
 *
 * §6: Free は直近7日、Pro は全期間。
 * 期間の上限は core/entitlements.ts が決め、ここは受け取った日数で絞るだけ。
 */
export async function listStudyHistory(
  entitlement: Entitlement,
  now: Date,
  timeZone: string,
): Promise<StudySessionWithSubject[]> {
  const userId = await requireUserId();

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
}
