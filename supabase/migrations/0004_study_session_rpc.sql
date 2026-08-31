-- タイマー操作をサーバー側の時刻で確定させる（仕様書 §5.3 / §14.1）
--
-- Web 版は Next.js の Server Action の中で new Date() を使えば済んだ。
-- そこはこちらが動かすサーバーなので、端末の時計は関わらない。
--
-- iOS 版にはその層が無く、アプリは Supabase を直接呼ぶ。
-- クライアントで秒数を計算して書き込むと、端末の時計を変えるだけで
-- 勉強時間を偽装できてしまう。
-- そこで経過時間の確定を DB 側へ移し、時刻は必ず now() から採る。
-- アプリが渡すのは「どの操作をするか」と科目だけで、秒数は渡さない。
--
-- security invoker（既定）なので RLS はそのまま効く。
-- 併せて auth.uid() でも所有者を確認する。

-- 実行中（計測中・一時停止中）のセッションを1件返す。
-- ユーザーごとに最大1件であることは study_sessions_one_running_per_user が保証する。
create or replace function public.running_study_session()
returns public.study_sessions
language sql
stable
set search_path = public
as $$
  select *
  from public.study_sessions
  where user_id = auth.uid()
    and ended_at is null
  limit 1;
$$;

comment on function public.running_study_session() is
  '実行中のタイマーを返す。無ければ行なし。';

-- 計測を開始する。二重開始は部分ユニークインデックスが弾く。
create or replace function public.start_study_session(p_subject_id uuid default null)
returns public.study_sessions
language plpgsql
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.study_sessions;
begin
  if v_user_id is null then
    raise exception 'ログインが必要です' using errcode = '28000';
  end if;

  if exists (
    select 1 from public.study_sessions
    where user_id = v_user_id and ended_at is null
  ) then
    raise exception 'すでに計測中のタイマーがあります' using errcode = '23505';
  end if;

  insert into public.study_sessions
    (user_id, subject_id, started_at, segment_started_at, accumulated_sec)
  values
    (v_user_id, p_subject_id, now(), now(), 0)
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.start_study_session(uuid) is
  '計測を開始する。開始時刻はサーバーの now() で決める。';

-- 一時停止する。計測中の区間を累積へ畳み込む。
create or replace function public.pause_study_session()
returns public.study_sessions
language plpgsql
set search_path = public
as $$
declare
  v_row public.study_sessions;
begin
  select * into v_row from public.running_study_session();

  if v_row.id is null then
    raise exception '計測中のタイマーがありません' using errcode = 'P0002';
  end if;

  -- すでに一時停止中なら何もしない（二重送信への備え）
  if v_row.segment_started_at is null then
    return v_row;
  end if;

  update public.study_sessions
  set accumulated_sec =
        accumulated_sec + greatest(0, floor(extract(epoch from now() - segment_started_at)))::int,
      segment_started_at = null
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.pause_study_session() is
  '一時停止する。経過秒数は now() との差から求める。';

-- 再開する。新しい計測区間を開始する。
create or replace function public.resume_study_session()
returns public.study_sessions
language plpgsql
set search_path = public
as $$
declare
  v_row public.study_sessions;
begin
  select * into v_row from public.running_study_session();

  if v_row.id is null then
    raise exception '計測中のタイマーがありません' using errcode = 'P0002';
  end if;

  if v_row.segment_started_at is not null then
    return v_row;
  end if;

  update public.study_sessions
  set segment_started_at = now()
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.resume_study_session() is
  '一時停止から再開する。再開時刻はサーバーの now() で決める。';

-- 終了して記録する。実勉強秒数を確定させる。
create or replace function public.finish_study_session()
returns public.study_sessions
language plpgsql
set search_path = public
as $$
declare
  v_row public.study_sessions;
  v_duration int;
begin
  select * into v_row from public.running_study_session();

  if v_row.id is null then
    raise exception '計測中のタイマーがありません' using errcode = 'P0002';
  end if;

  -- 実勉強秒数 = 確定済みの累積 + 計測中の区間
  v_duration := v_row.accumulated_sec
    + case
        when v_row.segment_started_at is null then 0
        else greatest(0, floor(extract(epoch from now() - v_row.segment_started_at)))::int
      end;

  update public.study_sessions
  set ended_at = now(),
      duration_sec = v_duration,
      accumulated_sec = v_duration,
      segment_started_at = null
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

comment on function public.finish_study_session() is
  '計測を終了し実勉強秒数を確定する。時刻はすべてサーバーの now() で決める。';

-- 表示用のサーバー時刻。
-- タイマーの数字は毎秒描き直す必要があるが、そのたびに問い合わせはできない。
-- 一度だけサーバー時刻を取り、端末の時計とのずれを測って補正する
-- （Web 版の TimerPanel と同じ考え方）。確定値には使わない。
create or replace function public.server_now()
returns timestamptz
language sql
stable
set search_path = public
as $$
  select now();
$$;

comment on function public.server_now() is
  '表示補正のためのサーバー時刻。経過時間の確定には使わない。';
