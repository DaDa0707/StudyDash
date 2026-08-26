-- Phase 4: 勉強タイマーの一時停止に対応する（仕様書 §5.3）
--
-- §5.3 は「ブラウザを閉じても開始時刻を復元できる」ことと
-- 「終了時に実勉強秒数を保存する」ことの両方を求めている。
-- 一時停止を挟んだ実勉強秒数を復元するには、停止状態そのものを DB に持つ必要があるため、
-- 実行中の計測区間と、確定済みの累積秒数を列として追加する。
--
-- 状態の表し方:
--   計測中  : ended_at is null, segment_started_at is not null
--   一時停止: ended_at is null, segment_started_at is null
--   終了済み: ended_at is not null, duration_sec is not null

alter table public.study_sessions
  -- 現在計測中の区間の開始時刻。一時停止中は null。
  add column segment_started_at timestamptz,
  -- 確定済みの区間の合計秒数（現在計測中の区間は含まない）
  add column accumulated_sec integer not null default 0
    check (accumulated_sec >= 0);

-- 既存の実行中セッションは、開始時刻から計測中だったものとして扱う
update public.study_sessions
set segment_started_at = started_at
where ended_at is null;

-- 終了済みの行は計測区間を持たない
alter table public.study_sessions
  add constraint study_sessions_finished_has_no_segment check (
    ended_at is null or segment_started_at is null
  );

comment on column public.study_sessions.segment_started_at is
  '計測中の区間の開始時刻。一時停止中およびセッション終了後は null。';
comment on column public.study_sessions.accumulated_sec is
  '一時停止までに確定した合計秒数。実勉強秒数 = accumulated_sec + 計測中区間の経過秒数。';
