alter table public.businesses
  add column if not exists description text,
  add column if not exists phone text,
  add column if not exists website_url text,
  add column if not exists instagram_url text,
  add column if not exists address text;

alter table public.loyalty_products
  add column if not exists sale_price_cents integer,
  add column if not exists currency text not null default 'EUR';

alter table public.loyalty_products
  drop constraint if exists loyalty_products_sale_price_cents_check,
  add constraint loyalty_products_sale_price_cents_check check (sale_price_cents is null or sale_price_cents >= 0),
  drop constraint if exists loyalty_products_currency_check,
  add constraint loyalty_products_currency_check check (currency ~ '^[A-Z]{3}$');

alter table public.passes
  add column if not exists issued_price_cents integer,
  add column if not exists issued_currency text;

alter table public.passes
  drop constraint if exists passes_issued_price_cents_check,
  add constraint passes_issued_price_cents_check check (issued_price_cents is null or issued_price_cents >= 0),
  drop constraint if exists passes_issued_currency_check,
  add constraint passes_issued_currency_check check (issued_currency is null or issued_currency ~ '^[A-Z]{3}$');

alter table public.business_audit_events
  drop constraint if exists business_audit_events_event_type_check;

alter table public.business_audit_events
  add constraint business_audit_events_event_type_check check (event_type = any (array[
    'business_created'::text,
    'business_updated'::text,
    'member_added'::text,
    'member_removed'::text,
    'member_role_changed'::text,
    'product_created'::text,
    'product_updated'::text,
    'product_activated'::text,
    'product_deactivated'::text,
    'pass_issued'::text,
    'pass_cancelled'::text,
    'redemption'::text
  ]));

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
    old.address is distinct from new.address
  ) then
    insert into public.business_audit_events (business_id, actor_id, event_type, metadata)
    values (new.id, auth.uid(), 'business_updated', jsonb_build_object('name', new.name));
  end if;
  return new;
end;
$$;

revoke all on function private.audit_business_change() from public, anon, authenticated;

drop trigger if exists audit_business_created on public.businesses;
drop trigger if exists audit_business_change on public.businesses;
create trigger audit_business_change
after insert or update on public.businesses
for each row execute function private.audit_business_change();

create or replace function private.audit_product_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.business_audit_events (business_id, actor_id, event_type, product_id, metadata)
    values (
      new.business_id,
      auth.uid(),
      'product_created',
      new.id,
      jsonb_build_object('name', new.name, 'type', new.type, 'initial_units', new.initial_units, 'sale_price_cents', new.sale_price_cents)
    );
  elsif old.active is distinct from new.active then
    insert into public.business_audit_events (business_id, actor_id, event_type, product_id, metadata)
    values (
      new.business_id,
      auth.uid(),
      case when new.active then 'product_activated' else 'product_deactivated' end,
      new.id,
      jsonb_build_object('name', new.name)
    );
  elsif old.name is distinct from new.name
     or old.description is distinct from new.description
     or old.initial_units is distinct from new.initial_units
     or old.validity_days is distinct from new.validity_days
     or old.sale_price_cents is distinct from new.sale_price_cents
     or old.currency is distinct from new.currency then
    insert into public.business_audit_events (business_id, actor_id, event_type, product_id, metadata)
    values (
      new.business_id,
      auth.uid(),
      'product_updated',
      new.id,
      jsonb_build_object('name', new.name, 'sale_price_cents', new.sale_price_cents)
    );
  end if;
  return new;
end;
$$;

revoke all on function private.audit_product_change() from public, anon, authenticated;

drop trigger if exists audit_product_change on public.loyalty_products;
create trigger audit_product_change
after insert or update on public.loyalty_products
for each row execute function private.audit_product_change();

create or replace function public.issue_pass(target_wallet_token uuid, target_qr_version integer, target_product_id uuid)
returns public.passes
language plpgsql
security definer
set search_path = 'public', 'private'
as $$
declare
  target_product public.loyalty_products;
  target_wallet public.wallets;
  created_pass public.passes;
  calculated_expiry timestamptz;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select * into target_product
  from public.loyalty_products
  where id = target_product_id and active = true;

  if not found then
    raise exception 'active product not found';
  end if;

  if not private.is_business_member(target_product.business_id) then
    raise exception 'not authorized for this business';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = target_product.business_id and b.status = 'active'
  ) then
    raise exception 'business is not active';
  end if;

  select * into target_wallet
  from public.wallets
  where public_token = target_wallet_token
    and qr_version = target_qr_version;

  if not found then
    raise exception 'wallet QR is invalid or expired';
  end if;

  calculated_expiry := case
    when target_product.validity_days is null then null
    else now() + make_interval(days => target_product.validity_days)
  end;

  insert into public.passes (
    wallet_id,
    loyalty_product_id,
    business_id,
    initial_units,
    remaining_units,
    expires_at,
    issued_price_cents,
    issued_currency
  ) values (
    target_wallet.id,
    target_product.id,
    target_product.business_id,
    target_product.initial_units,
    target_product.initial_units,
    calculated_expiry,
    target_product.sale_price_cents,
    target_product.currency
  ) returning * into created_pass;

  return created_pass;
end;
$$;

revoke all on function public.issue_pass(uuid, integer, uuid) from public, anon;
grant execute on function public.issue_pass(uuid, integer, uuid) to authenticated;
