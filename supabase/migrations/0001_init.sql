-- StudyDash MVP — Phase 1: スキーマ・所有権・RLS
-- 仕様書 v0.1 §8 データベース設計 / §9 権限・セキュリティ
--
-- 設計の前提:
--   * 全ユーザーデータは user_id で所有者を紐付ける。
--   * 全テーブルで Row Level Security を有効化し、本人の行のみ操作可能にする。
--   * auth.users 削除時に ON DELETE CASCADE で作成データを消せるようにする（§9 / A-10）。

-- =====================================================================
-- 拡張
-- =====================================================================
create extension if not exists "pgcrypto" with schema extensions;

-- =====================================================================
-- 列挙型
-- =====================================================================
create type public.school_type as enum ('junior_high', 'high_school', 'university', 'other');
create type public.plan_type as enum ('free', 'pro');
create type public.priority_level as enum ('low', 'medium', 'high');
create type public.assignment_status as enum ('not_started', 'in_progress', 'done');
create type public.todo_status as enum ('open', 'done');
create type public.billing_provider as enum ('stripe', 'apple');
create type public.subscription_status as enum (
  'incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid'
);

-- =====================================================================
-- 共通トリガー関数
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- profiles
-- =====================================================================
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 50),
  school_type   public.school_type not null default 'high_school',
  timezone      text not null default 'Asia/Tokyo',
  -- plan はキャッシュ用の表示値。権限の正はあくまで subscriptions.entitlement（§7）。
  plan          public.plan_type not null default 'free',
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- =====================================================================
-- subjects（科目）
-- =====================================================================
create table public.subjects (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 50),
  color      text not null default '#64748b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  teacher    text check (char_length(teacher) <= 50),
  archived   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subjects_user_id_idx on public.subjects (user_id) where archived = false;
create unique index subjects_user_name_key on public.subjects (user_id, name);

create trigger subjects_set_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();

-- =====================================================================
-- class_sessions（時間割 / §5.1）
-- =====================================================================
create table public.class_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  -- ISO-8601 準拠: 1=月 … 7=日
  weekday    smallint not null check (weekday between 1 and 7),
  period     smallint not null check (period between 1 and 12),
  start_time time not null,
  end_time   time not null,
  room       text check (char_length(room) <= 50),
  note       text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_sessions_time_order check (end_time > start_time)
);

-- §5.1「同一曜日・同一時限の重複登録は警告するが保存は許可する」ため一意制約は張らない。
create index class_sessions_user_slot_idx on public.class_sessions (user_id, weekday, period);
create index class_sessions_subject_idx on public.class_sessions (subject_id);

create trigger class_sessions_set_updated_at
  before update on public.class_sessions
  for each row execute function public.set_updated_at();

-- =====================================================================
-- assignments（課題 / §5.2）
-- =====================================================================
create table public.assignments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  subject_id   uuid references public.subjects (id) on delete set null,
  title        text not null check (char_length(title) between 1 and 100),
  due_at       timestamptz not null,
  -- 締切を日付のみで登録した場合 true（表示側で時刻を出し分ける / §5.2）
  due_all_day  boolean not null default false,
  priority     public.priority_level,
  status       public.assignment_status not null default 'not_started',
  note         text check (char_length(note) <= 2000),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- 完了状態と completed_at の整合をDB側で担保する
  constraint assignments_completed_at_consistent check (
    (status = 'done' and completed_at is not null)
    or (status <> 'done' and completed_at is null)
  )
);

-- 未完了課題を締切順に引くための部分インデックス（ホーム/課題一覧の主クエリ）
create index assignments_user_open_due_idx
  on public.assignments (user_id, due_at)
  where status <> 'done';
create index assignments_subject_idx on public.assignments (subject_id);

create trigger assignments_set_updated_at
  before update on public.assignments
  for each row execute function public.set_updated_at();

-- =====================================================================
-- todos（§3.1 F-05）
-- =====================================================================
create table public.todos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 100),
  due_at       timestamptz,
  status       public.todo_status not null default 'open',
  sort_order   integer not null default 0,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint todos_completed_at_consistent check (
    (status = 'done' and completed_at is not null)
    or (status <> 'done' and completed_at is null)
  )
);

create index todos_user_open_idx
  on public.todos (user_id, sort_order, created_at)
  where status = 'open';

create trigger todos_set_updated_at
  before update on public.todos
  for each row execute function public.set_updated_at();

-- =====================================================================
-- study_sessions（学習履歴 / §5.3）
-- =====================================================================
-- ended_at が null の行が「実行中のタイマー」。ブラウザを閉じても
-- started_at をDBから復元できる（§5.3）。
create table public.study_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  subject_id   uuid references public.subjects (id) on delete set null,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  -- 一時停止を除いた実勉強秒数。終了時に確定させる。
  duration_sec integer check (duration_sec >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint study_sessions_time_order check (ended_at is null or ended_at >= started_at),
  constraint study_sessions_finished_has_duration check (
    (ended_at is null and duration_sec is null)
    or (ended_at is not null and duration_sec is not null)
  )
);

create index study_sessions_user_started_idx on public.study_sessions (user_id, started_at desc);
create index study_sessions_subject_idx on public.study_sessions (subject_id);
-- 実行中のタイマーはユーザーごとに最大1件
create unique index study_sessions_one_running_per_user
  on public.study_sessions (user_id)
  where ended_at is null;

create trigger study_sessions_set_updated_at
  before update on public.study_sessions
  for each row execute function public.set_updated_at();

-- =====================================================================
-- notification_settings（§3.1 F-08）
-- =====================================================================
create table public.notification_settings (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  assignment_reminders  boolean not null default true,
  -- 締切の何分前に通知するか。Free は 1 件のみ、Pro は複数（§6）。
  reminder_offsets_min  integer[] not null default '{0}',
  quiet_hours_enabled   boolean not null default false,
  quiet_hours_start     time not null default '22:00',
  quiet_hours_end       time not null default '07:00',
  timezone              text not null default 'Asia/Tokyo',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger notification_settings_set_updated_at
  before update on public.notification_settings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- subscriptions（§7 課金権限の正）
-- =====================================================================
create table public.subscriptions (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  provider           public.billing_provider,
  customer_id        text,
  subscription_id    text,
  status             public.subscription_status,
  current_period_end timestamptz,
  -- 権限判定の唯一の真実。Webhook 検証後にのみ更新する（§9）。
  entitlement        public.plan_type not null default 'free',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index subscriptions_customer_idx on public.subscriptions (provider, customer_id);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 新規ユーザー作成時に付随レコードを用意する
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- display_name は NOT NULL かつ 1〜50 文字。ここで制約を破ると
  -- auth.users への INSERT ごと失敗し、登録自体ができなくなる。
  -- メール未設定（電話番号登録など）や長いローカル部でも通るよう丸める。
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'ゲスト'
      ),
      50
    )
  )
  on conflict (id) do nothing;

  insert into public.notification_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Row Level Security（§9：UI側の非表示だけに頼らない）
-- =====================================================================
alter table public.profiles              enable row level security;
alter table public.subjects              enable row level security;
alter table public.class_sessions        enable row level security;
alter table public.assignments           enable row level security;
alter table public.todos                 enable row level security;
alter table public.study_sessions        enable row level security;
alter table public.notification_settings enable row level security;
alter table public.subscriptions         enable row level security;

-- profiles: 本人のみ。id 自体が所有者。
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles_delete_own" on public.profiles
  for delete to authenticated using ((select auth.uid()) = id);

-- user_id 所有の各テーブルに同一形のポリシーを付与する
do $$
declare
  t text;
begin
  foreach t in array array[
    'subjects', 'class_sessions', 'assignments', 'todos', 'study_sessions'
  ]
  loop
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = user_id)',
      t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select auth.uid()) = user_id)',
      t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select auth.uid()) = user_id)',
      t || '_delete_own', t);
  end loop;
end;
$$;

-- notification_settings: 本人が読み書きできる（行の作成はトリガー側）
create policy "notification_settings_select_own" on public.notification_settings
  for select to authenticated using ((select auth.uid()) = user_id);
-- 行の作成は handle_new_user トリガーが行うが、
-- 何らかの理由で欠けたときに本人が復旧できるよう INSERT も許可する。
create policy "notification_settings_insert_own" on public.notification_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "notification_settings_update_own" on public.notification_settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- subscriptions: 本人は「読み取りのみ」。
-- 書き込みは署名検証済み Webhook（service_role）だけが行う（§7 / §9）。
-- service_role は RLS をバイパスするため、書き込みポリシーは意図的に作らない。
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);

-- =====================================================================
-- 権限判定ヘルパー（サーバー側で参照する / §7）
-- =====================================================================
create or replace function public.current_entitlement()
returns public.plan_type
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select s.entitlement from public.subscriptions s where s.user_id = auth.uid()),
    'free'::public.plan_type
  );
$$;

revoke all on function public.current_entitlement() from public;
grant execute on function public.current_entitlement() to authenticated;
