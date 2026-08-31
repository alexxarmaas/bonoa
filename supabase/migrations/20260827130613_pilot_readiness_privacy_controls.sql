create table if not exists public.user_privacy_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  marketing_emails boolean not null default false,
  product_updates boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.user_privacy_preferences enable row level security;
revoke all on table public.user_privacy_preferences from public, anon, authenticated;

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'cancelled', 'completed')),
  requested_at timestamptz not null default now(),
  cancelled_at timestamptz,
  completed_at timestamptz
);

create unique index if not exists account_deletion_requests_one_pending_per_user_idx
  on public.account_deletion_requests (user_id)
  where status = 'pending';

create index if not exists account_deletion_requests_requested_at_idx
  on public.account_deletion_requests (requested_at desc);

alter table public.account_deletion_requests enable row level security;
revoke all on table public.account_deletion_requests from public, anon, authenticated;

create or replace function public.my_privacy_preferences()
returns table (
  marketing_emails boolean,
  product_updates boolean,
  updated_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  target_user uuid := auth.uid();
begin
  if target_user is null then
    raise exception 'Authentication required';
  end if;

  return query
  select p.marketing_emails, p.product_updates, p.updated_at
  from public.user_privacy_preferences p
  where p.user_id = target_user;

  if not found then
    return query select false, false, null::timestamptz;
  end if;
end;
$$;

create or replace function public.save_my_privacy_preferences(
  next_marketing_emails boolean,
  next_product_updates boolean
)
returns table (
  marketing_emails boolean,
  product_updates boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user uuid := auth.uid();
begin
  if target_user is null then
    raise exception 'Authentication required';
  end if;

  insert into public.user_privacy_preferences (user_id, marketing_emails, product_updates, updated_at)
  values (target_user, coalesce(next_marketing_emails, false), coalesce(next_product_updates, false), now())
  on conflict (user_id) do update
    set marketing_emails = excluded.marketing_emails,
        product_updates = excluded.product_updates,
        updated_at = excluded.updated_at;

  return query
  select p.marketing_emails, p.product_updates, p.updated_at
  from public.user_privacy_preferences p
  where p.user_id = target_user;
end;
$$;

create or replace function public.my_account_deletion_request()
returns table (
  request_id uuid,
  status text,
  requested_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz
)
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  target_user uuid := auth.uid();
begin
  if target_user is null then
    raise exception 'Authentication required';
  end if;

  return query
  select r.id, r.status, r.requested_at, r.cancelled_at, r.completed_at
  from public.account_deletion_requests r
  where r.user_id = target_user
  order by r.requested_at desc
  limit 1;
end;
$$;

create or replace function public.request_my_account_deletion()
returns table (
  request_id uuid,
  status text,
  requested_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user uuid := auth.uid();
  existing_id uuid;
begin
  if target_user is null then
    raise exception 'Authentication required';
  end if;

  select r.id into existing_id
  from public.account_deletion_requests r
  where r.user_id = target_user and r.status = 'pending'
  order by r.requested_at desc
  limit 1;

  if existing_id is null then
    insert into public.account_deletion_requests (user_id)
    values (target_user)
    returning id into existing_id;
  end if;

  return query
  select r.id, r.status, r.requested_at, r.cancelled_at, r.completed_at
  from public.account_deletion_requests r
  where r.id = existing_id;
end;
$$;

create or replace function public.cancel_my_account_deletion()
returns table (
  request_id uuid,
  status text,
  requested_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_user uuid := auth.uid();
  target_request uuid;
begin
  if target_user is null then
    raise exception 'Authentication required';
  end if;

  update public.account_deletion_requests r
  set status = 'cancelled', cancelled_at = now()
  where r.user_id = target_user and r.status = 'pending'
  returning r.id into target_request;

  if target_request is null then
    return;
  end if;

  return query
  select r.id, r.status, r.requested_at, r.cancelled_at, r.completed_at
  from public.account_deletion_requests r
  where r.id = target_request;
end;
$$;

create or replace function public.export_my_bonoa_data()
returns jsonb
language plpgsql
security definer
stable
set search_path = public, pg_temp
as $$
declare
  target_user uuid := auth.uid();
  target_wallet uuid;
  result jsonb;
begin
  if target_user is null then
    raise exception 'Authentication required';
  end if;

  select w.id into target_wallet from public.wallets w where w.user_id = target_user;

  select jsonb_build_object(
    'exported_at', now(),
    'profile', coalesce((
      select jsonb_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'email', p.email,
        'avatar_url', p.avatar_url,
        'created_at', p.created_at,
        'updated_at', p.updated_at
      ) from public.profiles p where p.id = target_user
    ), 'null'::jsonb),
    'privacy_preferences', coalesce((
      select jsonb_build_object(
        'marketing_emails', pp.marketing_emails,
        'product_updates', pp.product_updates,
        'updated_at', pp.updated_at
      ) from public.user_privacy_preferences pp where pp.user_id = target_user
    ), jsonb_build_object('marketing_emails', false, 'product_updates', false, 'updated_at', null)),
    'account_deletion_request', coalesce((
      select jsonb_build_object(
        'id', dr.id,
        'status', dr.status,
        'requested_at', dr.requested_at,
        'cancelled_at', dr.cancelled_at,
        'completed_at', dr.completed_at
      ) from public.account_deletion_requests dr
      where dr.user_id = target_user
      order by dr.requested_at desc
      limit 1
    ), 'null'::jsonb),
    'wallet', coalesce((
      select jsonb_build_object(
        'id', w.id,
        'qr_version', w.qr_version,
        'created_at', w.created_at,
        'updated_at', w.updated_at
      ) from public.wallets w where w.id = target_wallet
    ), 'null'::jsonb),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'business_id', m.business_id,
        'business_name', b.name,
        'status', m.status,
        'joined_at', m.joined_at,
        'last_activity_at', m.last_activity_at
      ) order by m.joined_at desc)
      from public.loyalty_memberships m
      join public.businesses b on b.id = m.business_id
      where m.wallet_id = target_wallet
    ), '[]'::jsonb),
    'passes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'business_id', p.business_id,
        'business_name', b.name,
        'product_id', p.loyalty_product_id,
        'product_name', lp.name,
        'status', p.status,
        'initial_units', p.initial_units,
        'remaining_units', p.remaining_units,
        'purchased_at', p.purchased_at,
        'expires_at', p.expires_at,
        'issued_price_cents', p.issued_price_cents,
        'issued_currency', p.issued_currency
      ) order by p.created_at desc)
      from public.passes p
      join public.businesses b on b.id = p.business_id
      join public.loyalty_products lp on lp.id = p.loyalty_product_id
      where p.wallet_id = target_wallet
    ), '[]'::jsonb),
    'loyalty_events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', e.id,
        'business_id', e.business_id,
        'business_name', b.name,
        'event_type', e.event_type,
        'amount_cents', e.amount_cents,
        'rewards_issued', e.rewards_issued,
        'occurred_at', e.occurred_at
      ) order by e.occurred_at desc)
      from public.loyalty_events e
      join public.businesses b on b.id = e.business_id
      where e.wallet_id = target_wallet
    ), '[]'::jsonb),
    'redemptions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id,
        'pass_id', r.pass_id,
        'business_id', r.business_id,
        'business_name', b.name,
        'units', r.units,
        'created_at', r.created_at
      ) order by r.created_at desc)
      from public.redemptions r
      join public.passes p on p.id = r.pass_id
      join public.businesses b on b.id = r.business_id
      where p.wallet_id = target_wallet
    ), '[]'::jsonb),
    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id,
        'business_id', n.business_id,
        'notification_type', n.notification_type,
        'title', n.title,
        'body', n.body,
        'read_at', n.read_at,
        'created_at', n.created_at
      ) order by n.created_at desc)
      from public.wallet_notifications n
      where n.wallet_id = target_wallet
    ), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke execute on function public.my_privacy_preferences() from public, anon;
revoke execute on function public.save_my_privacy_preferences(boolean, boolean) from public, anon;
revoke execute on function public.my_account_deletion_request() from public, anon;
revoke execute on function public.request_my_account_deletion() from public, anon;
revoke execute on function public.cancel_my_account_deletion() from public, anon;
revoke execute on function public.export_my_bonoa_data() from public, anon;

grant execute on function public.my_privacy_preferences() to authenticated;
grant execute on function public.save_my_privacy_preferences(boolean, boolean) to authenticated;
grant execute on function public.my_account_deletion_request() to authenticated;
grant execute on function public.request_my_account_deletion() to authenticated;
grant execute on function public.cancel_my_account_deletion() to authenticated;
grant execute on function public.export_my_bonoa_data() to authenticated;
