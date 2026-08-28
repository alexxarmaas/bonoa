create table if not exists private.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null
);

revoke all on table private.platform_admins from public, anon, authenticated;

create or replace function private.is_platform_admin(target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select target_user_id is not null
    and exists (
      select 1
      from private.platform_admins pa
      where pa.user_id = target_user_id
    );
$$;

revoke all on function private.is_platform_admin(uuid) from public, anon, authenticated;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin(auth.uid());
$$;

revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

create or replace function public.admin_overview()
returns table (
  businesses_total bigint,
  businesses_active bigint,
  businesses_listed bigint,
  users_total bigint,
  wallets_total bigint,
  memberships_total bigint,
  passes_total bigint,
  loyalty_events_total bigint,
  risk_events_30d bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    (select count(*) from public.businesses),
    (select count(*) from public.businesses where status = 'active'),
    (select count(*) from public.businesses where status = 'active' and directory_listed = true),
    (select count(*) from auth.users),
    (select count(*) from public.wallets),
    (select count(*) from public.loyalty_memberships where status = 'active'),
    (select count(*) from public.passes),
    (select count(*) from public.loyalty_events),
    (select count(*) from public.business_risk_events where created_at >= now() - interval '30 days');
end;
$$;

revoke all on function public.admin_overview() from public, anon;
grant execute on function public.admin_overview() to authenticated;

create or replace function public.admin_businesses()
returns table (
  business_id uuid,
  business_name text,
  business_slug text,
  business_status text,
  directory_listed boolean,
  directory_category text,
  onboarding_completed_at timestamptz,
  created_at timestamptz,
  members bigint,
  customers bigint,
  passes bigint,
  loyalty_events bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    b.id,
    b.name,
    b.slug,
    b.status,
    b.directory_listed,
    b.directory_category,
    b.onboarding_completed_at,
    b.created_at,
    (select count(*) from public.business_members bm where bm.business_id = b.id),
    (select count(*) from public.loyalty_memberships lm where lm.business_id = b.id and lm.status = 'active'),
    (select count(*) from public.passes p where p.business_id = b.id),
    (select count(*) from public.loyalty_events le where le.business_id = b.id)
  from public.businesses b
  order by b.created_at desc;
end;
$$;

revoke all on function public.admin_businesses() from public, anon;
grant execute on function public.admin_businesses() to authenticated;

create or replace function public.admin_users()
returns table (
  user_id uuid,
  display_name text,
  email text,
  created_at timestamptz,
  businesses bigint,
  memberships bigint,
  passes bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_platform_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    u.id,
    coalesce(p.display_name, split_part(u.email, '@', 1)),
    u.email::text,
    u.created_at,
    (select count(*) from public.business_members bm where bm.user_id = u.id),
    (select count(*)
       from public.loyalty_memberships lm
       join public.wallets w on w.id = lm.wallet_id
      where w.user_id = u.id and lm.status = 'active'),
    (select count(*)
       from public.passes ps
       join public.wallets w on w.id = ps.wallet_id
      where w.user_id = u.id)
  from auth.users u
  left join public.profiles p on p.id = u.id
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_users() from public, anon;
grant execute on function public.admin_users() to authenticated;
