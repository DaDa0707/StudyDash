/**
 * supabase/migrations/ 配下のスキーマに対応する型定義。
 * マイグレーションを追加したら、この定義も合わせて更新すること。
 */

export type SchoolType = "junior_high" | "high_school" | "university" | "other";
export type PlanType = "free" | "pro";
export type PriorityLevel = "low" | "medium" | "high";
export type AssignmentStatus = "not_started" | "in_progress" | "done";
export type TodoStatus = "open" | "done";
export type BillingProvider = "stripe" | "apple";
export type FeedbackCategory = "bug" | "request" | "question" | "other";
export type SubscriptionStatus =
  | "incomplete"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid";

export type Profile = {
  id: string;
  display_name: string;
  school_type: SchoolType;
  timezone: string;
  plan: PlanType;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Subject = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  teacher: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export type ClassSession = {
  id: string;
  user_id: string;
  subject_id: string | null;
  /** ISO-8601 準拠: 1=月 … 7=日 */
  weekday: number;
  period: number;
  start_time: string;
  end_time: string;
  room: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export type Assignment = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  due_at: string;
  due_all_day: boolean;
  priority: PriorityLevel | null;
  status: AssignmentStatus;
  note: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type Todo = {
  id: string;
  user_id: string;
  title: string;
  due_at: string | null;
  status: TodoStatus;
  sort_order: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type StudySession = {
  id: string;
  user_id: string;
  subject_id: string | null;
  started_at: string;
  /** null なら実行中のタイマー（計測中または一時停止中） */
  ended_at: string | null;
  duration_sec: number | null;
  /** 計測中の区間の開始時刻。一時停止中と終了後は null */
  segment_started_at: string | null;
  /** 一時停止までに確定した合計秒数 */
  accumulated_sec: number;
  created_at: string;
  updated_at: string;
}

export type NotificationSettings = {
  user_id: string;
  assignment_reminders: boolean;
  reminder_offsets_min: number[];
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export type Subscription = {
  user_id: string;
  provider: BillingProvider | null;
  customer_id: string | null;
  subscription_id: string | null;
  status: SubscriptionStatus | null;
  current_period_end: string | null;
  entitlement: PlanType;
  created_at: string;
  updated_at: string;
}

export type Feedback = {
  id: string;
  user_id: string;
  category: FeedbackCategory;
  message: string;
  page_path: string | null;
  app_version: string | null;
  created_at: string;
}

/** insert 時に省略できる、DB が既定値を埋めるカラム */
type Generated = "id" | "created_at" | "updated_at";

type Insert<T, Optional extends keyof T> = Omit<T, Optional> &
  Partial<Pick<T, Optional>>;

type TableDef<Row, InsertRow, UpdateRow> = {
  Row: Row;
  Insert: InsertRow;
  Update: UpdateRow;
  Relationships: [];
}

export type Database = {
  public: {
    Tables: {
      profiles: TableDef<
        Profile,
        Insert<Profile, "school_type" | "timezone" | "plan" | "onboarded_at" | "created_at" | "updated_at">,
        Partial<Profile>
      >;
      subjects: TableDef<
        Subject,
        Insert<Subject, Generated | "color" | "teacher" | "archived">,
        Partial<Subject>
      >;
      class_sessions: TableDef<
        ClassSession,
        Insert<ClassSession, Generated | "subject_id" | "room" | "note">,
        Partial<ClassSession>
      >;
      assignments: TableDef<
        Assignment,
        Insert<
          Assignment,
          Generated | "subject_id" | "due_all_day" | "priority" | "status" | "note" | "completed_at"
        >,
        Partial<Assignment>
      >;
      todos: TableDef<
        Todo,
        Insert<Todo, Generated | "due_at" | "status" | "sort_order" | "completed_at">,
        Partial<Todo>
      >;
      study_sessions: TableDef<
        StudySession,
        Insert<
          StudySession,
          | Generated
          | "subject_id"
          | "started_at"
          | "ended_at"
          | "duration_sec"
          | "segment_started_at"
          | "accumulated_sec"
        >,
        Partial<StudySession>
      >;
      notification_settings: TableDef<
        NotificationSettings,
        Insert<NotificationSettings, Exclude<keyof NotificationSettings, "user_id">>,
        Partial<NotificationSettings>
      >;
      subscriptions: TableDef<
        Subscription,
        Insert<Subscription, Exclude<keyof Subscription, "user_id">>,
        Partial<Subscription>
      >;
      feedback: TableDef<
        Feedback,
        Insert<Feedback, "id" | "created_at" | "category" | "page_path" | "app_version">,
        Partial<Feedback>
      >;
    };
    Views: Record<never, never>;
    Functions: {
      current_entitlement: {
        Args: Record<string, never>;
        Returns: PlanType;
      };
      // タイマー操作。経過時間をサーバーの now() で確定させるため DB 側に置く
      // （0004_study_session_rpc.sql）。呼び出し側は秒数を渡さない。
      running_study_session: {
        Args: Record<string, never>;
        Returns: StudySession;
      };
      start_study_session: {
        Args: { p_subject_id?: string | null };
        Returns: StudySession;
      };
      pause_study_session: {
        Args: Record<string, never>;
        Returns: StudySession;
      };
      resume_study_session: {
        Args: Record<string, never>;
        Returns: StudySession;
      };
      finish_study_session: {
        Args: Record<string, never>;
        Returns: StudySession;
      };
      /** 表示補正のみに使う。確定値には使わない */
      server_now: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      school_type: SchoolType;
      plan_type: PlanType;
      priority_level: PriorityLevel;
      assignment_status: AssignmentStatus;
      todo_status: TodoStatus;
      billing_provider: BillingProvider;
      subscription_status: SubscriptionStatus;
      feedback_category: FeedbackCategory;
    };
    CompositeTypes: Record<never, never>;
  };
}
