-- Pilot hardening round 2
-- This migration is intentionally backwards-compatible with the currently deployed client.

-- ---------------------------------------------------------------------------
-- Data invariants
-- ---------------------------------------------------------------------------

alter table public.businesses
  drop constraint if exists businesses_name_length_check,
  add constraint businesses_name_length_check check (char_length(trim(name)) between 2 and 120),
  drop constraint if exists businesses_slug_format_check,
  add constraint businesses_slug_format_check check (
    char_length(slug) between 2 and 80
    and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  drop constraint if exists businesses_description_length_check,
  add constraint businesses_description_length_check check (description is null or char_length(description) <= 1000),
  drop constraint if exists businesses_phone_length_check,
  add constraint businesses_phone_length_check check (phone is null or char_length(phone) <= 40),
  drop constraint if exists businesses_website_url_check,
  add constraint businesses_website_url_check check (
    website_url is null or (char_length(website_url) <= 300 and website_url ~* '^https?://')
  ),
  drop constraint if exists businesses_instagram_url_check,
  add constraint businesses_instagram_url_check check (
    instagram_url is null or (char_length(instagram_url) <= 300 and instagram_url ~* '^https?://')
  ),
  drop constraint if exists businesses_address_length_check,
  add constraint businesses_address_length_check check (address is null or char_length(address) <= 300),
  drop constraint if exists businesses_logo_url_check,
  add constraint businesses_logo_url_check check (
    logo_url is null or (char_length(logo_url) <= 1200 and logo_url ~* '^https?://')
  );

alter table public.loyalty_products
  drop constraint if exists loyalty_products_name_length_check,
  add constraint loyalty_products_name_length_check check (char_length(trim(name)) between 2 and 120),
  drop constraint if exists loyalty_products_description_length_check,
  add constraint loyalty_products_description_length_check check (description is null or char_length(description) <= 500),
  drop constraint if exists loyalty_products_initial_units_upper_check,
  add constraint loyalty_products_initial_units_upper_check check (initial_units <= 1000000),
  drop constraint if exists loyalty_products_validity_days_upper_check,
  add constraint loyalty_products_validity_days_upper_check check (validity_days is null or validity_days <= 3650),
  drop constraint if exists loyalty_products_sale_price_upper_check,
  add constraint loyalty_products_sale_price_upper_check check (sale_price_cents is null or sale_price_cents <= 100000000);

-- ---------------------------------------------------------------------------
-- Idempotent issuance
-- ---------------------------------------------------------------------------

alter table public.passes
  add column if not exists issuance_key uuid;

create unique index if not exists passes_issuance_key_unique_idx
  on public.passes (issuance_key)
  where issuance_key is not null;

create or replace function public.issue_pass_idempotent(
  target_wallet_token uuid,
  target_qr_version integer,
  target_product_id uuid,
  request_id uuid
)
returns public.passes
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_product public.loyalty_products;
  target_wallet public.wallets;
  existing_pass public.passes;
  created_pass public.passes;
  calculated_expiry timestamptz;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if request_id is null then
    raise exception 'request_id is required';
  end if;

  if target_qr_version is null or target_qr_version < 1 then
    raise exception 'wallet QR is invalid or expired';
  end if;

  select * into target_product
  from public.loyalty_products
  where id = target_product_id
    and active = true;

  if not found then
    raise exception 'active product not found';
  end if;

  if not private.is_business_member(target_product.business_id) then
    raise exception 'not authorized for this business';
  end if;

  if not exists (
    select 1
    from public.businesses b
    where b.id = target_product.business_id
      and b.status = 'active'
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

  select * into existing_pass
  from public.passes
  where issuance_key = request_id;

  if found then
    if existing_pass.business_id <> target_product.business_id
      or existing_pass.loyalty_product_id <> target_product.id
      or existing_pass.wallet_id <> target_wallet.id then
      raise exception 'request_id has already been used for another issuance';
    end if;
    return existing_pass;
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
    issued_currency,
    issuance_key
  ) values (
    target_wallet.id,
    target_product.id,
    target_product.business_id,
    target_product.initial_units,
    target_product.initial_units,
    calculated_expiry,
    target_product.sale_price_cents,
    target_product.currency,
    request_id
  )
  on conflict (issuance_key) where issuance_key is not null do nothing
  returning * into created_pass;

  if created_pass.id is null then
    select * into existing_pass
    from public.passes
    where issuance_key = request_id;

    if not found then
      raise exception 'issuance could not be completed';
    end if;

    if existing_pass.business_id <> target_product.business_id
      or existing_pass.loyalty_product_id <> target_product.id
      or existing_pass.wallet_id <> target_wallet.id then
      raise exception 'request_id has already been used for another issuance';
    end if;

    return existing_pass;
  end if;

  return created_pass;
end;
$$;

revoke all on function public.issue_pass_idempotent(uuid, integer, uuid, uuid) from public, anon;
grant execute on function public.issue_pass_idempotent(uuid, integer, uuid, uuid) to authenticated;

-- Keep redemption idempotency explicit as well as enforced by the unique key.
create or replace function public.redeem_pass(target_pass_id uuid, units_to_redeem numeric, request_id uuid)
returns public.redemptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_pass public.passes;
  target_type public.loyalty_product_type;
  existing_redemption public.redemptions;
  created_redemption public.redemptions;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if request_id is null then raise exception 'request_id is required'; end if;
  if units_to_redeem is null or units_to_redeem <= 0 then raise exception 'units_to_redeem must be greater than zero'; end if;
  if units_to_redeem <> round(units_to_redeem, 2) then raise exception 'units_to_redeem supports at most two decimals'; end if;

  select * into existing_redemption
  from public.redemptions
  where idempotency_key = request_id;

  if found then
    if existing_redemption.pass_id <> target_pass_id then
      raise exception 'request_id has already been used for another redemption';
    end if;
    return existing_redemption;
  end if;

  select * into target_pass
  from public.passes
  where id = target_pass_id
  for update;

  if not found then raise exception 'pass not found'; end if;
  if not private.is_business_member(target_pass.business_id) then raise exception 'not authorized for this business'; end if;
  if target_pass.status <> 'active' then raise exception 'pass is not active'; end if;
  if target_pass.expires_at is not null and target_pass.expires_at <= now() then raise exception 'pass is expired'; end if;

  select lp.type into target_type
  from public.loyalty_products lp
  where lp.id = target_pass.loyalty_product_id;

  if target_type = 'uses' and units_to_redeem <> trunc(units_to_redeem) then
    raise exception 'use-based passes require whole units';
  end if;

  if target_pass.remaining_units < units_to_redeem then raise exception 'insufficient remaining units'; end if;

  update public.passes
  set remaining_units = remaining_units - units_to_redeem,
      status = case
        when remaining_units - units_to_redeem = 0 then 'exhausted'::public.pass_status
        else status
      end
  where id = target_pass.id;

  insert into public.redemptions (pass_id, business_id, units, performed_by, idempotency_key)
  values (target_pass.id, target_pass.business_id, units_to_redeem, auth.uid(), request_id)
  returning * into created_redemption;

  return created_redemption;
end;
$$;

revoke all on function public.redeem_pass(uuid, numeric, uuid) from public, anon;
grant execute on function public.redeem_pass(uuid, numeric, uuid) to authenticated;

-- Enrich audit events without changing the public feed contract.
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
      jsonb_build_object(
        'initial_units', new.initial_units,
        'expires_at', new.expires_at,
        'issued_price_cents', new.issued_price_cents,
        'issued_currency', new.issued_currency
      )
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

revoke all on function private.audit_pass_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Least privilege for browser roles
-- ---------------------------------------------------------------------------

-- Public catalogue only needs SELECT on these two tables.
revoke insert, update, delete, truncate, references, trigger on public.businesses from anon;
revoke insert, update, delete, truncate, references, trigger on public.loyalty_products from anon;

-- Anonymous users never need access to private operational tables.
revoke all on public.profiles from anon;
revoke all on public.business_members from anon;
revoke all on public.wallets from anon;
revoke all on public.passes from anon;
revoke all on public.redemptions from anon;

grant select on public.businesses, public.loyalty_products to anon;

-- Authenticated business creation and membership mutations are RPC-only.
revoke insert, delete, truncate, references, trigger on public.businesses from authenticated;
revoke update on public.businesses from authenticated;
grant update (name, description, phone, website_url, instagram_url, address, logo_url, accent_color, updated_at)
  on public.businesses to authenticated;

revoke insert, update, delete, truncate, references, trigger on public.business_members from authenticated;
grant select on public.business_members to authenticated;

-- Catalogue creation/editing remains direct but only on the fields used by the app.
revoke insert, update, delete, truncate, references, trigger on public.loyalty_products from authenticated;
grant insert (business_id, name, description, type, initial_units, validity_days, active, sale_price_cents, currency)
  on public.loyalty_products to authenticated;
grant update (name, description, initial_units, validity_days, active, sale_price_cents, currency, updated_at)
  on public.loyalty_products to authenticated;
grant select on public.loyalty_products to authenticated;

-- Wallet/pass/redemption mutations are RPC-only.
revoke insert, update, delete, truncate, references, trigger on public.wallets from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.passes from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.redemptions from authenticated;
grant select on public.wallets, public.passes, public.redemptions to authenticated;

-- Profiles are self-readable and only the explicit editable columns remain mutable.
revoke insert, delete, truncate, references, trigger on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
