import { supabase } from "@/lib/supabase";
import { effectiveEntitlement } from "@core/billing";
import type { Entitlement } from "@core/entitlements";
import type { SessionWithSubject } from "@core/timetable";
import type {
  Assignment,
  ClassSession,
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
    .select("display_name, timezone")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error("プロフィールを読み込めませんでした");
  return {
    displayName: data?.display_name ?? "ゲスト",
    timezone: data?.timezone ?? "Asia/Tokyo",
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
