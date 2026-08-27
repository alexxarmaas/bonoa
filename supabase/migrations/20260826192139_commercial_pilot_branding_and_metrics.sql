alter table public.businesses
  add column if not exists accent_color text not null default '#ff5a1f';

alter table public.businesses
  drop constraint if exists businesses_accent_color_check,
  add constraint businesses_accent_color_check check (accent_color ~ '^#[0-9A-Fa-f]{6}$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-assets',
  'business-assets',
  true,
  2097152,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.business_asset_business_id(object_name text)
returns uuid
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  first_segment text;
begin
  first_segment := (storage.foldername(object_name))[1];
  if first_segment is not null and first_segment ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return first_segment::uuid;
  end if;
  return null;
end;
$$;

revoke all on function private.business_asset_business_id(text) from public, anon;
grant execute on function private.business_asset_business_id(text) to authenticated;

drop policy if exists business_assets_public_read on storage.objects;
create policy business_assets_public_read
on storage.objects for select
to anon, authenticated
using (bucket_id = 'business-assets');

drop policy if exists business_assets_manager_insert on storage.objects;
create policy business_assets_manager_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'business-assets'
  and private.is_business_manager(private.business_asset_business_id(name))
);

drop policy if exists business_assets_manager_update on storage.objects;
create policy business_assets_manager_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'business-assets'
  and private.is_business_manager(private.business_asset_business_id(name))
)
with check (
  bucket_id = 'business-assets'
  and private.is_business_manager(private.business_asset_business_id(name))
);

drop policy if exists business_assets_manager_delete on storage.objects;
create policy business_assets_manager_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'business-assets'
  and private.is_business_manager(private.business_asset_business_id(name))
);

create or replace function public.business_commercial_metrics(target_business_id uuid)
returns table (
  issued_value_total_cents bigint,
  issued_value_30d_cents bigint,
  average_issued_price_cents numeric,
  priced_passes bigint,
  active_wallets bigint,
  wallets_30d bigint,
  passes_30d bigint,
  average_consumed_percent numeric
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
    coalesce(sum(p.issued_price_cents) filter (where p.issued_price_cents is not null), 0)::bigint,
    coalesce(sum(p.issued_price_cents) filter (where p.issued_price_cents is not null and p.purchased_at >= now() - interval '30 days'), 0)::bigint,
    coalesce(avg(p.issued_price_cents) filter (where p.issued_price_cents is not null), 0)::numeric,
    count(*) filter (where p.issued_price_cents is not null)::bigint,
    count(distinct p.wallet_id) filter (where p.status = 'active'::public.pass_status and (p.expires_at is null or p.expires_at >= now()))::bigint,
    count(distinct p.wallet_id) filter (where p.purchased_at >= now() - interval '30 days')::bigint,
    count(*) filter (where p.purchased_at >= now() - interval '30 days')::bigint,
    coalesce(avg(
      case
        when p.initial_units > 0 and p.status <> 'cancelled'::public.pass_status
          then ((p.initial_units - p.remaining_units) / p.initial_units) * 100
        else null
      end
    ), 0)::numeric
  from public.passes p
  where p.business_id = target_business_id;
end;
$$;

revoke all on function public.business_commercial_metrics(uuid) from public, anon;
grant execute on function public.business_commercial_metrics(uuid) to authenticated;

create or replace function private.audit_business_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.business_audit_events (business_id, actor_id, event_type, metadata)
    values (new.id, auth.uid(), 'business_created', jsonb_build_object('name', new.name, 'slug', new.slug));
  elsif tg_op = 'UPDATE' and (
    old.name is distinct from new.name or
    old.logo_url is distinct from new.logo_url or
    old.description is distinct from new.description or
    old.phone is distinct from new.phone or
    old.website_url is distinct from new.website_url or
    old.instagram_url is distinct from new.instagram_url or
    old.address is distinct from new.address or
    old.accent_color is distinct from new.accent_color
  ) then
    insert into public.business_audit_events (business_id, actor_id, event_type, metadata)
    values (new.id, auth.uid(), 'business_updated', jsonb_build_object('name', new.name));
  end if;
  return new;
end;
$$;