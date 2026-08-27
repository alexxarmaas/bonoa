create index if not exists passes_loyalty_product_idx on public.passes(loyalty_product_id);
create index if not exists redemptions_performed_by_idx on public.redemptions(performed_by);

alter table public.loyalty_products
  drop constraint if exists loyalty_products_uses_integer;
alter table public.loyalty_products
  add constraint loyalty_products_uses_integer
  check (type <> 'uses' or initial_units = trunc(initial_units));

-- Tighten RLS roles and avoid evaluating auth.uid() once per row.
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

drop policy if exists businesses_public_read on public.businesses;
create policy businesses_active_read_anon on public.businesses
  for select to anon
  using (status = 'active');
create policy businesses_authenticated_read on public.businesses
  for select to authenticated
  using (status = 'active' or private.is_business_member(id));

drop policy if exists businesses_manager_update on public.businesses;
create policy businesses_manager_update on public.businesses
  for update to authenticated
  using (private.is_business_manager(id))
  with check (private.is_business_manager(id));

drop policy if exists business_members_read_own_business on public.business_members;
drop policy if exists business_members_manage on public.business_members;
create policy business_members_read_own_business on public.business_members
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_business_member(business_id));
create policy business_members_manager_insert on public.business_members
  for insert to authenticated
  with check (private.is_business_manager(business_id));
create policy business_members_manager_update on public.business_members
  for update to authenticated
  using (private.is_business_manager(business_id))
  with check (private.is_business_manager(business_id));
create policy business_members_manager_delete on public.business_members
  for delete to authenticated
  using (private.is_business_manager(business_id));

drop policy if exists loyalty_products_public_read on public.loyalty_products;
drop policy if exists loyalty_products_manage on public.loyalty_products;
create policy loyalty_products_active_read_anon on public.loyalty_products
  for select to anon
  using (active);
create policy loyalty_products_authenticated_read on public.loyalty_products
  for select to authenticated
  using (active or private.is_business_member(business_id));
create policy loyalty_products_manager_insert on public.loyalty_products
  for insert to authenticated
  with check (private.is_business_manager(business_id));
create policy loyalty_products_manager_update on public.loyalty_products
  for update to authenticated
  using (private.is_business_manager(business_id))
  with check (private.is_business_manager(business_id));
create policy loyalty_products_manager_delete on public.loyalty_products
  for delete to authenticated
  using (private.is_business_manager(business_id));

drop policy if exists wallets_select_self on public.wallets;
drop policy if exists wallets_update_self on public.wallets;
create policy wallets_select_self on public.wallets
  for select to authenticated
  using (user_id = (select auth.uid()));
revoke update on public.wallets from anon, authenticated;

drop policy if exists passes_customer_read on public.passes;
drop policy if exists passes_business_manage on public.passes;
drop policy if exists passes_business_update on public.passes;
create policy passes_customer_read on public.passes
  for select to authenticated
  using (
    exists (
      select 1 from public.wallets w
      where w.id = wallet_id and w.user_id = (select auth.uid())
    )
    or private.is_business_member(business_id)
  );
create policy passes_business_insert on public.passes
  for insert to authenticated
  with check (private.is_business_member(business_id));
create policy passes_business_update on public.passes
  for update to authenticated
  using (private.is_business_member(business_id))
  with check (private.is_business_member(business_id));

drop policy if exists redemptions_customer_or_business_read on public.redemptions;
create policy redemptions_customer_or_business_read on public.redemptions
  for select to authenticated
  using (
    private.is_business_member(business_id)
    or exists (
      select 1
      from public.passes p
      join public.wallets w on w.id = p.wallet_id
      where p.id = pass_id and w.user_id = (select auth.uid())
    )
  );

create or replace function public.rotate_wallet_qr()
returns public.wallets
language plpgsql
security definer
set search_path = public
as $$
declare
  rotated_wallet public.wallets;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  update public.wallets
  set public_token = gen_random_uuid(),
      qr_version = qr_version + 1
  where user_id = auth.uid()
  returning * into rotated_wallet;

  if not found then
    raise exception 'wallet not found';
  end if;

  return rotated_wallet;
end;
$$;

revoke all on function public.rotate_wallet_qr() from public, anon;
grant execute on function public.rotate_wallet_qr() to authenticated;

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
    case
      when p.status = 'active' and p.expires_at is not null and p.expires_at <= now()
        then 'expired'::public.pass_status
      else p.status
    end,
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

create or replace function public.redeem_pass(target_pass_id uuid, units_to_redeem numeric, request_id uuid)
returns public.redemptions
language plpgsql
security definer
set search_path = public, private
as $$
declare
  target_pass public.passes;
  target_type public.loyalty_product_type;
  existing_redemption public.redemptions;
  created_redemption public.redemptions;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if units_to_redeem <= 0 then raise exception 'units_to_redeem must be greater than zero'; end if;
  if units_to_redeem <> round(units_to_redeem, 2) then raise exception 'units_to_redeem supports at most two decimals'; end if;

  select * into existing_redemption from public.redemptions where idempotency_key = request_id;
  if found then return existing_redemption; end if;

  select * into target_pass from public.passes where id = target_pass_id for update;
  if not found then raise exception 'pass not found'; end if;

  if not private.is_business_member(target_pass.business_id) then raise exception 'not authorized for this business'; end if;
  if target_pass.status <> 'active' then raise exception 'pass is not active'; end if;
  if target_pass.expires_at is not null and target_pass.expires_at <= now() then raise exception 'pass is expired'; end if;

  select lp.type into target_type from public.loyalty_products lp where lp.id = target_pass.loyalty_product_id;
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
