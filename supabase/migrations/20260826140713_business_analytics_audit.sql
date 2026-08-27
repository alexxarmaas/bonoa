create table if not exists public.business_audit_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'business_created',
    'member_added',
    'member_removed',
    'member_role_changed',
    'product_created',
    'product_activated',
    'product_deactivated',
    'pass_issued',
    'pass_cancelled',
    'redemption'
  )),
  pass_id uuid references public.passes(id) on delete set null,
  product_id uuid references public.loyalty_products(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists business_audit_events_business_created_idx
  on public.business_audit_events (business_id, created_at desc);
create index if not exists business_audit_events_actor_idx
  on public.business_audit_events (actor_id) where actor_id is not null;
create index if not exists business_audit_events_pass_idx
  on public.business_audit_events (pass_id) where pass_id is not null;
create index if not exists business_audit_events_product_idx
  on public.business_audit_events (product_id) where product_id is not null;

alter table public.business_audit_events enable row level security;
revoke all on public.business_audit_events from anon, authenticated;

create or replace function private.audit_business_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.business_audit_events (business_id, actor_id, event_type, metadata)
  values (new.id, auth.uid(), 'business_created', jsonb_build_object('name', new.name, 'slug', new.slug));
  return new;
end;
$$;

create or replace function private.audit_business_member_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.business_audit_events (business_id, actor_id, event_type, metadata)
    values (new.business_id, auth.uid(), 'member_added', jsonb_build_object('target_user_id', new.user_id, 'role', new.role));
    return new;
  elsif tg_op = 'UPDATE' and old.role is distinct from new.role then
    insert into public.business_audit_events (business_id, actor_id, event_type, metadata)
    values (new.business_id, auth.uid(), 'member_role_changed', jsonb_build_object('target_user_id', new.user_id, 'from_role', old.role, 'to_role', new.role));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.business_audit_events (business_id, actor_id, event_type, metadata)
    values (old.business_id, auth.uid(), 'member_removed', jsonb_build_object('target_user_id', old.user_id, 'role', old.role));
    return old;
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function private.audit_product_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.business_audit_events (business_id, actor_id, event_type, product_id, metadata)
    values (new.business_id, auth.uid(), 'product_created', new.id, jsonb_build_object('name', new.name, 'type', new.type, 'initial_units', new.initial_units));
  elsif tg_op = 'UPDATE' and old.active is distinct from new.active then
    insert into public.business_audit_events (business_id, actor_id, event_type, product_id, metadata)
    values (
      new.business_id,
      auth.uid(),
      case when new.active then 'product_activated' else 'product_deactivated' end,
      new.id,
      jsonb_build_object('name', new.name)
    );
  end if;
  return new;
end;
$$;

create or replace function private.audit_pass_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.business_audit_events (business_id, actor_id, event_type, pass_id, product_id, metadata)
    values (
      new.business_id,
      auth.uid(),
      'pass_issued',
      new.id,
      new.loyalty_product_id,
      jsonb_build_object('initial_units', new.initial_units, 'expires_at', new.expires_at)
    );
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'cancelled'::public.pass_status then
    insert into public.business_audit_events (business_id, actor_id, event_type, pass_id, product_id, metadata)
    values (
      new.business_id,
      auth.uid(),
      'pass_cancelled',
      new.id,
      new.loyalty_product_id,
      jsonb_build_object('previous_status', old.status, 'remaining_units', new.remaining_units)
    );
  end if;
  return new;
end;
$$;

create or replace function private.audit_redemption_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_product_id uuid;
begin
  select p.loyalty_product_id into target_product_id
  from public.passes p
  where p.id = new.pass_id;

  insert into public.business_audit_events (business_id, actor_id, event_type, pass_id, product_id, metadata)
  values (
    new.business_id,
    new.performed_by,
    'redemption',
    new.pass_id,
    target_product_id,
    jsonb_build_object('units', new.units)
  );
  return new;
end;
$$;

revoke all on function private.audit_business_created() from public, anon, authenticated;
revoke all on function private.audit_business_member_change() from public, anon, authenticated;
revoke all on function private.audit_product_change() from public, anon, authenticated;
revoke all on function private.audit_pass_change() from public, anon, authenticated;
revoke all on function private.audit_redemption_created() from public, anon, authenticated;

drop trigger if exists audit_business_created on public.businesses;
create trigger audit_business_created
after insert on public.businesses
for each row execute function private.audit_business_created();

drop trigger if exists audit_business_member_change on public.business_members;
create trigger audit_business_member_change
after insert or update of role or delete on public.business_members
for each row execute function private.audit_business_member_change();

drop trigger if exists audit_product_change on public.loyalty_products;
create trigger audit_product_change
after insert or update of active on public.loyalty_products
for each row execute function private.audit_product_change();

drop trigger if exists audit_pass_change on public.passes;
create trigger audit_pass_change
after insert or update of status on public.passes
for each row execute function private.audit_pass_change();

drop trigger if exists audit_redemption_created on public.redemptions;
create trigger audit_redemption_created
after insert on public.redemptions
for each row execute function private.audit_redemption_created();

create or replace function public.business_dashboard_metrics(target_business_id uuid)
returns table (
  total_passes bigint,
  active_passes bigint,
  exhausted_passes bigint,
  expired_passes bigint,
  cancelled_passes bigint,
  unique_wallets bigint,
  redemptions_total bigint,
  redemptions_today bigint,
  redemptions_7d bigint,
  units_redeemed_30d numeric,
  issued_30d bigint,
  expiring_30d bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_business_member(target_business_id) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    count(*)::bigint,
    count(*) filter (where p.status = 'active'::public.pass_status and (p.expires_at is null or p.expires_at >= now()))::bigint,
    count(*) filter (where p.status = 'exhausted'::public.pass_status)::bigint,
    count(*) filter (where p.status = 'expired'::public.pass_status or (p.status = 'active'::public.pass_status and p.expires_at < now()))::bigint,
    count(*) filter (where p.status = 'cancelled'::public.pass_status)::bigint,
    count(distinct p.wallet_id)::bigint,
    (select count(*)::bigint from public.redemptions r where r.business_id = target_business_id),
    (select count(*)::bigint from public.redemptions r where r.business_id = target_business_id and r.created_at >= date_trunc('day', now())),
    (select count(*)::bigint from public.redemptions r where r.business_id = target_business_id and r.created_at >= now() - interval '7 days'),
    (select coalesce(sum(r.units), 0)::numeric from public.redemptions r where r.business_id = target_business_id and r.created_at >= now() - interval '30 days'),
    count(*) filter (where p.purchased_at >= now() - interval '30 days')::bigint,
    count(*) filter (where p.status = 'active'::public.pass_status and p.expires_at > now() and p.expires_at <= now() + interval '30 days')::bigint
  from public.passes p
  where p.business_id = target_business_id;
end;
$$;

create or replace function public.business_product_metrics(target_business_id uuid)
returns table (
  product_id uuid,
  product_name text,
  product_type public.loyalty_product_type,
  active boolean,
  passes_issued bigint,
  active_passes bigint,
  redemptions bigint,
  units_redeemed numeric
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_business_member(target_business_id) then
    raise exception 'not_authorized';
  end if;

  return query
  with pass_stats as (
    select
      p.loyalty_product_id,
      count(*)::bigint as passes_issued,
      count(*) filter (where p.status = 'active'::public.pass_status and (p.expires_at is null or p.expires_at >= now()))::bigint as active_passes
    from public.passes p
    where p.business_id = target_business_id
    group by p.loyalty_product_id
  ), redemption_stats as (
    select
      p.loyalty_product_id,
      count(r.id)::bigint as redemptions,
      coalesce(sum(r.units), 0)::numeric as units_redeemed
    from public.redemptions r
    join public.passes p on p.id = r.pass_id
    where r.business_id = target_business_id
    group by p.loyalty_product_id
  )
  select
    lp.id,
    lp.name,
    lp.type,
    lp.active,
    coalesce(ps.passes_issued, 0),
    coalesce(ps.active_passes, 0),
    coalesce(rs.redemptions, 0),
    coalesce(rs.units_redeemed, 0)
  from public.loyalty_products lp
  left join pass_stats ps on ps.loyalty_product_id = lp.id
  left join redemption_stats rs on rs.loyalty_product_id = lp.id
  where lp.business_id = target_business_id
  order by coalesce(ps.passes_issued, 0) desc, lp.created_at desc;
end;
$$;

create or replace function public.business_passes_for_management(
  target_business_id uuid,
  status_filter public.pass_status,
  product_filter uuid,
  search_query text,
  page_limit integer,
  page_offset integer
)
returns table (
  pass_id uuid,
  product_id uuid,
  product_name text,
  product_type public.loyalty_product_type,
  pass_status public.pass_status,
  initial_units numeric,
  remaining_units numeric,
  purchased_at timestamptz,
  expires_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_business_member(target_business_id) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    p.id,
    lp.id,
    lp.name,
    lp.type,
    case
      when p.status = 'active'::public.pass_status and p.expires_at < now() then 'expired'::public.pass_status
      else p.status
    end,
    p.initial_units,
    p.remaining_units,
    p.purchased_at,
    p.expires_at,
    p.updated_at
  from public.passes p
  join public.loyalty_products lp on lp.id = p.loyalty_product_id
  where p.business_id = target_business_id
    and (product_filter is null or p.loyalty_product_id = product_filter)
    and (
      status_filter is null
      or (case when p.status = 'active'::public.pass_status and p.expires_at < now() then 'expired'::public.pass_status else p.status end) = status_filter
    )
    and (
      nullif(trim(search_query), '') is null
      or p.id::text ilike '%' || trim(search_query) || '%'
      or lp.name ilike '%' || trim(search_query) || '%'
    )
  order by p.purchased_at desc
  limit greatest(1, least(coalesce(page_limit, 50), 100))
  offset greatest(coalesce(page_offset, 0), 0);
end;
$$;

create or replace function public.business_audit_feed(
  target_business_id uuid,
  page_limit integer,
  page_offset integer
)
returns table (
  event_id uuid,
  event_type text,
  pass_id uuid,
  product_id uuid,
  actor_id uuid,
  actor_name text,
  actor_email text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_business_manager(target_business_id) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    e.id,
    e.event_type,
    e.pass_id,
    e.product_id,
    e.actor_id,
    pr.display_name,
    pr.email,
    e.metadata,
    e.created_at
  from public.business_audit_events e
  left join public.profiles pr on pr.id = e.actor_id
  where e.business_id = target_business_id
  order by e.created_at desc
  limit greatest(1, least(coalesce(page_limit, 50), 100))
  offset greatest(coalesce(page_offset, 0), 0);
end;
$$;

revoke all on function public.business_dashboard_metrics(uuid) from public, anon;
revoke all on function public.business_product_metrics(uuid) from public, anon;
revoke all on function public.business_passes_for_management(uuid, public.pass_status, uuid, text, integer, integer) from public, anon;
revoke all on function public.business_audit_feed(uuid, integer, integer) from public, anon;

grant execute on function public.business_dashboard_metrics(uuid) to authenticated;
grant execute on function public.business_product_metrics(uuid) to authenticated;
grant execute on function public.business_passes_for_management(uuid, public.pass_status, uuid, text, integer, integer) to authenticated;
grant execute on function public.business_audit_feed(uuid, integer, integer) to authenticated;
