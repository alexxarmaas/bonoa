drop policy if exists businesses_manager_insert on public.businesses;

create or replace function public.create_business(business_name text, business_slug text)
returns public.businesses
language plpgsql
security definer
set search_path = public, private
as $$
declare
  created_business public.businesses;
  normalized_name text := trim(business_name);
  normalized_slug text := lower(trim(business_slug));
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if normalized_name is null or length(normalized_name) < 2 then
    raise exception 'business name is too short';
  end if;

  if normalized_slug is null or normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid business slug';
  end if;

  insert into public.businesses (name, slug)
  values (normalized_name, normalized_slug)
  returning * into created_business;

  insert into public.business_members (business_id, user_id, role)
  values (created_business.id, auth.uid(), 'owner');

  return created_business;
end;
$$;

revoke all on function public.create_business(text, text) from public, anon;
grant execute on function public.create_business(text, text) to authenticated;

create or replace function public.issue_pass(
  target_wallet_token uuid,
  target_qr_version integer,
  target_product_id uuid
)
returns public.passes
language plpgsql
security definer
set search_path = public, private
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
    expires_at
  ) values (
    target_wallet.id,
    target_product.id,
    target_product.business_id,
    target_product.initial_units,
    target_product.initial_units,
    calculated_expiry
  ) returning * into created_pass;

  return created_pass;
end;
$$;

revoke all on function public.issue_pass(uuid, integer, uuid) from public, anon;
grant execute on function public.issue_pass(uuid, integer, uuid) to authenticated;

create or replace function public.business_wallet_passes(
  target_wallet_token uuid,
  target_qr_version integer,
  target_business_id uuid
)
returns table (
  pass_id uuid,
  product_id uuid,
  product_name text,
  product_type public.loyalty_product_type,
  remaining_units numeric,
  initial_units numeric,
  pass_status public.pass_status,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not private.is_business_member(target_business_id) then
    raise exception 'not authorized for this business';
  end if;

  if not exists (
    select 1 from public.wallets w
    where w.public_token = target_wallet_token
      and w.qr_version = target_qr_version
  ) then
    raise exception 'wallet QR is invalid or expired';
  end if;

  return query
  select
    p.id,
    lp.id,
    lp.name,
    lp.type,
    p.remaining_units,
    p.initial_units,
    p.status,
    p.expires_at
  from public.wallets w
  join public.passes p on p.wallet_id = w.id
  join public.loyalty_products lp on lp.id = p.loyalty_product_id
  where w.public_token = target_wallet_token
    and w.qr_version = target_qr_version
    and p.business_id = target_business_id
  order by p.created_at desc;
end;
$$;

revoke all on function public.business_wallet_passes(uuid, integer, uuid) from public, anon;
grant execute on function public.business_wallet_passes(uuid, integer, uuid) to authenticated;
