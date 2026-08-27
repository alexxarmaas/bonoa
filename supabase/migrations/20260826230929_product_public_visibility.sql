-- A catalog item can be active for issuance/rewards without being advertised publicly.

alter table public.loyalty_products
  add column if not exists publicly_listed boolean not null default true;

comment on column public.loyalty_products.publicly_listed is
  'Whether this product appears in the public business storefront. Hidden active products can still be used as rewards.';

drop policy if exists loyalty_products_active_read_anon on public.loyalty_products;
create policy loyalty_products_active_read_anon
on public.loyalty_products
for select
to anon
using (active and publicly_listed);

create or replace function private.is_loyalty_product_in_my_wallet(target_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.passes p
    join public.wallets w on w.id = p.wallet_id
    where p.loyalty_product_id = target_product_id
      and w.user_id = auth.uid()
  );
$$;

revoke all on function private.is_loyalty_product_in_my_wallet(uuid) from public, anon, authenticated;

drop policy if exists loyalty_products_authenticated_read on public.loyalty_products;
create policy loyalty_products_authenticated_read
on public.loyalty_products
for select
to authenticated
using (
  (active and publicly_listed)
  or private.is_business_member(business_id)
  or private.is_loyalty_product_in_my_wallet(id)
);

create index if not exists loyalty_products_public_storefront_idx
  on public.loyalty_products (business_id, created_at desc)
  where active and publicly_listed;
