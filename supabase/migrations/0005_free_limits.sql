-- Free の上限を DB 側でも止める（仕様書 §6 / §14.1 / A-06）
--
-- これまで上限を確かめていたのは画面と Server Action だけだった。
-- Web はそれで概ね足りていたが、実際には利用者が自分の JWT で
-- Supabase を直接叩けば通ってしまう。iOS 版はもともと DB を直接呼ぶので、
-- アプリ側の確認しか無い状態は課金を有効にする前に塞いでおく必要がある。
--
-- 上限値は core/entitlements.ts が正。ここはその写しになるため、
-- ズレたら気づけるよう scripts/verify-acceptance.mjs で突き合わせる。

-- ---------------------------------------------------------------------------
-- 権限の判定
-- ---------------------------------------------------------------------------
-- current_entitlement() は subscriptions.entitlement をそのまま返すだけで、
-- 課金状態を見ていない。Webhook を取りこぼすと Pro が残り続ける。
-- core/billing.ts の effectiveEntitlement と同じ規則で判定し直す。
create or replace function public.effective_entitlement(p_user_id uuid)
returns public.plan_type
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  -- core/billing.ts の GRACE_DAYS と揃える
  grace_days constant integer := 3;
  v_entitlement public.plan_type;
  v_status public.subscription_status;
  v_period_end timestamptz;
begin
  select s.entitlement, s.status, s.current_period_end
    into v_entitlement, v_status, v_period_end
  from public.subscriptions s
  where s.user_id = p_user_id;

  -- 行が無い、または pro でない
  if v_entitlement is null or v_entitlement <> 'pro' then
    return 'free';
  end if;

  -- 課金レコードが無い＝運営による手動付与。保存値を信じる。
  if v_status is null then
    return 'pro';
  end if;

  -- past_due は決済再試行中の猶予
  if v_status not in ('active', 'trialing', 'past_due') then
    return 'free';
  end if;

  if v_period_end is not null
     and now() > v_period_end + make_interval(days => grace_days) then
    return 'free';
  end if;

  return 'pro';
end;
$$;

comment on function public.effective_entitlement(uuid) is
  '実際に適用する権限。core/billing.ts の effectiveEntitlement と同じ規則。';

-- ---------------------------------------------------------------------------
-- 上限値
-- ---------------------------------------------------------------------------
-- null は「上限なし」。core/entitlements.ts の PLAN_LIMITS の写し。
create or replace function public.plan_limit(
  p_entitlement public.plan_type,
  p_feature text
)
returns integer
language sql
immutable
set search_path = public
as $$
  select case
    when p_entitlement = 'pro' then null
    when p_feature = 'openAssignments' then 20
    when p_feature = 'openTodos' then 30
    else null
  end;
$$;

comment on function public.plan_limit(public.plan_type, text) is
  '件数上限。null は上限なし。core/entitlements.ts の PLAN_LIMITS と揃える。';

-- ---------------------------------------------------------------------------
-- 強制
-- ---------------------------------------------------------------------------
-- 未完了の行が上限に達しているなら、新しく未完了の行を増やさせない。
--
-- 同時に2件挿入されると両方通りうるが、そこまでの厳密さは求めない。
-- 狙いは「アプリの確認を迂回して大量に作られること」を防ぐこと。
create or replace function public.enforce_open_row_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_feature text := tg_argv[0];
  v_limit integer;
  v_count integer;
begin
  -- 完了状態のままなら数は増えない
  if new.status = 'done' then
    return new;
  end if;

  -- 更新のうち、未完了 → 未完了 は数が変わらない
  if tg_op = 'UPDATE' and old.status <> 'done' then
    return new;
  end if;

  v_limit := public.plan_limit(public.effective_entitlement(new.user_id), v_feature);
  if v_limit is null then
    return new;
  end if;

  execute format(
    'select count(*) from public.%I where user_id = $1 and status <> ''done''',
    tg_table_name
  )
  into v_count
  using new.user_id;

  if v_count >= v_limit then
    raise exception '無料プランでは%件までです', v_limit
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

comment on function public.enforce_open_row_limit() is
  '未完了の件数が Free の上限を超えないようにする。第1引数に機能名を渡す。';

create trigger assignments_enforce_open_limit
  before insert or update of status on public.assignments
  for each row execute function public.enforce_open_row_limit('openAssignments');

create trigger todos_enforce_open_limit
  before insert or update of status on public.todos
  for each row execute function public.enforce_open_row_limit('openTodos');

revoke all on function public.effective_entitlement(uuid) from public;
grant execute on function public.effective_entitlement(uuid) to authenticated;
revoke all on function public.plan_limit(public.plan_type, text) from public;
grant execute on function public.plan_limit(public.plan_type, text) to authenticated;
