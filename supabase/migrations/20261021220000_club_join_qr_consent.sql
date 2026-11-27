-- Club enrollment by QR requires explicit approval from the wallet owner.
-- Requests do not reveal profile data or QR tokens to the client.
create table if not exists public.club_join_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  requested_by uuid not null,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '20 minutes'),
  responded_at timestamptz,
  unique (business_id, wallet_id)
);

create index if not exists club_join_requests_wallet_pending_idx
  on public.club_join_requests(wallet_id, status, expires_at);

alter table public.club_join_requests enable row level security;
revoke all on public.club_join_requests from public, anon, authenticated;

create or replace function public.request_club_join_by_qr(
  target_business_id uuid,
  target_wallet_token uuid,
  target_qr_version integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  resolved_wallet_id uuid;
  existing public.club_join_requests%rowtype;
begin
  if auth.uid() is null or not private.is_business_member(target_business_id) then
    raise exception 'not_authorized';
  end if;
  if not exists (select 1 from public.businesses b where b.id = target_business_id and b.status = 'active') then
    raise exception 'business_not_active';
  end if;
  if target_qr_version is null or target_qr_version < 1 then raise exception 'invalid_qr_version'; end if;
  select w.id into resolved_wallet_id
    from public.wallets w
    where w.public_token = target_wallet_token and w.qr_version = target_qr_version;
  if resolved_wallet_id is null then raise exception 'wallet_not_found'; end if;

  if exists (
    select 1 from public.loyalty_memberships lm
    where lm.business_id = target_business_id and lm.wallet_id = resolved_wallet_id
      and lm.status = 'active'
  ) then return 'already_member'; end if;

  insert into public.club_join_requests(business_id, wallet_id, requested_by)
  values (target_business_id, resolved_wallet_id, auth.uid())
  on conflict (business_id, wallet_id) do nothing;

  select * into existing from public.club_join_requests r
    where r.business_id = target_business_id and r.wallet_id = resolved_wallet_id for update;

  if existing.status = 'declined' and existing.responded_at > now() - interval '10 minutes' then
    return 'declined';
  end if;

  if existing.status <> 'pending' or existing.expires_at <= now() then
    update public.club_join_requests r
      set status = 'pending', requested_by = auth.uid(), created_at = now(),
          expires_at = now() + interval '20 minutes', responded_at = null
      where r.id = existing.id;
  end if;
  return 'pending';
end;
$function$;

create or replace function public.wallet_pending_club_joins()
returns table (
  request_id uuid, business_name text, club_name text,
  business_logo_url text, business_accent_color text, expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  return query
    select r.id, b.name, coalesce(nullif(b.club_name,''), 'Club ' || b.name),
           b.logo_url, coalesce(b.accent_color, '#2563eb'), r.expires_at
    from public.club_join_requests r
    join public.wallets w on w.id = r.wallet_id
    join public.businesses b on b.id = r.business_id
    where w.user_id = auth.uid()
      and r.status = 'pending'
      and r.expires_at > now()
      and b.status = 'active'
      and not exists (
        select 1 from public.loyalty_memberships lm
        where lm.business_id = r.business_id and lm.wallet_id = r.wallet_id and lm.status = 'active'
      )
    order by r.created_at desc
    limit 20;
end;
$function$;

create or replace function public.respond_club_join_request(
  target_request_id uuid,
  accept_request boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  pending public.club_join_requests%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select r.* into pending
    from public.club_join_requests r
    join public.wallets w on w.id = r.wallet_id
    where r.id = target_request_id and w.user_id = auth.uid()
    for update of r;
  if pending.id is null then raise exception 'join_request_not_found'; end if;
  if pending.status <> 'pending' then return pending.status; end if;
  if pending.expires_at <= now() then return 'expired'; end if;
  if accept_request is null then raise exception 'decision_required'; end if;
  if accept_request then
    if not exists (select 1 from public.businesses b where b.id=pending.business_id and b.status='active') then
      raise exception 'business_not_active';
    end if;
    perform private.ensure_loyalty_membership(pending.business_id, pending.wallet_id, now());
  end if;
  update public.club_join_requests r
    set status = case when accept_request then 'approved' else 'declined' end,
        responded_at = now()
    where r.id = pending.id;
  return case when accept_request then 'approved' else 'declined' end;
end;
$function$;

revoke all on function public.request_club_join_by_qr(uuid,uuid,integer) from public, anon;
revoke all on function public.wallet_pending_club_joins() from public, anon;
revoke all on function public.respond_club_join_request(uuid,boolean) from public, anon;
grant execute on function public.request_club_join_by_qr(uuid,uuid,integer) to authenticated;
grant execute on function public.wallet_pending_club_joins() to authenticated;
grant execute on function public.respond_club_join_request(uuid,boolean) to authenticated;
