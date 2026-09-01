-- 自分のアカウントを自分で削除できるようにする（仕様書 §9 / A-10）
--
-- Web 版は Server Action の中で service_role を使い
-- auth.admin.deleteUser() を呼んでいた。
-- iOS 版にその層は無く、service_role の鍵をアプリに埋めることは絶対にしない。
--
-- App Store は、アカウントを作れるアプリにはアプリ内での退会も求める。
-- そこで「自分の行だけを消す」関数を DB 側に置く。
--
-- security definer だが、消す対象は auth.uid() の行に限定していて
-- 引数は取らない。他人の ID を渡す余地を作らないため。
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'ログインが必要です' using errcode = '28000';
  end if;

  -- auth.users を消すと、ユーザーデータ用テーブルの外部キーが
  -- ON DELETE CASCADE で連鎖削除される（0001_init.sql）。
  delete from auth.users where id = v_user_id;
end;
$$;

comment on function public.delete_own_account() is
  '自分のアカウントを削除する。auth.uid() の行のみを対象にする。';

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
