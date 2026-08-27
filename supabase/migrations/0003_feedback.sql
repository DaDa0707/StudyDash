-- Phase 7: フィードバック導線（仕様書 §13）
--
-- 利用者からの意見を受け取る。外部サービスを増やさず、
-- 他のユーザーデータと同じ RLS の枠組みで扱う。
--
-- §9 の方針に従い、本文以外の個人情報は集めない。
-- 本人が書いた内容だけを保存し、本人だけが読める。

create type public.feedback_category as enum (
  'bug',        -- 不具合の報告
  'request',    -- 機能の要望
  'question',   -- 使い方の質問
  'other'
);

create table public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  category   public.feedback_category not null default 'other',
  message    text not null check (char_length(message) between 1 and 2000),
  -- 再現に必要な最小限の情報。どの画面から送られたか。
  page_path  text check (char_length(page_path) <= 200),
  -- 送信時のアプリ版。不具合の切り分けに使う。
  app_version text check (char_length(app_version) <= 40),
  created_at timestamptz not null default now()
);

create index feedback_user_created_idx on public.feedback (user_id, created_at desc);
create index feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- 本人は自分が送ったものを書ける・読める。
-- 更新と削除は許可しない（送信後に書き換えられると記録の意味が薄れるため）。
create policy "feedback_insert_own" on public.feedback
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "feedback_select_own" on public.feedback
  for select to authenticated using ((select auth.uid()) = user_id);

comment on table public.feedback is
  '利用者からの意見。運営側は service_role で読む。本人は自分の分のみ参照できる。';
