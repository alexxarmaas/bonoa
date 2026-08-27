create extension if not exists pgcrypto;

create type public.business_role as enum ('owner','manager','staff');
create type public.loyalty_product_type as enum ('uses','balance');
create type public.pass_status as enum ('active','exhausted','expired','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  email text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.business_role not null default 'staff',
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create table public.loyalty_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  type public.loyalty_product_type not null default 'uses',
  initial_units numeric(12,2) not null check (initial_units > 0),
  validity_days integer check (validity_days is null or validity_days > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  public_token uuid not null unique default gen_random_uuid(),
  qr_version integer not null default 1 check (qr_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.passes (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  loyalty_product_id uuid not null references public.loyalty_products(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  status public.pass_status not null default 'active',
  initial_units numeric(12,2) not null check (initial_units > 0),
  remaining_units numeric(12,2) not null check (remaining_units >= 0),
  purchased_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pass_remaining_lte_initial check (remaining_units <= initial_units)
);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  pass_id uuid not null references public.passes(id) on delete restrict,
  business_id uuid not null references public.businesses(id) on delete restrict,
  units numeric(12,2) not null check (units > 0),
  performed_by uuid not null references auth.users(id) on delete restrict,
  idempotency_key uuid not null unique,
  created_at timestamptz not null default now()
);

create index business_members_user_idx on public.business_members(user_id);
create index loyalty_products_business_idx on public.loyalty_products(business_id);
create index passes_wallet_idx on public.passes(wallet_id);
create index passes_business_idx on public.passes(business_id);
create index passes_status_idx on public.passes(status);
create index redemptions_pass_created_idx on public.redemptions(pass_id, created_at desc);
create index redemptions_business_created_idx on public.redemptions(business_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger businesses_set_updated_at before update on public.businesses for each row execute function public.set_updated_at();
create trigger loyalty_products_set_updated_at before update on public.loyalty_products for each row execute function public.set_updated_at();
create trigger wallets_set_updated_at before update on public.wallets for each row execute function public.set_updated_at();
create trigger passes_set_updated_at before update on public.passes for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name'), new.email, new.raw_user_meta_data ->> 'avatar_url');
  insert into public.wallets (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_business_member(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.business_members bm where bm.business_id = target_business_id and bm.user_id = auth.uid());
$$;

create or replace function public.is_business_manager(target_business_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.business_members bm where bm.business_id = target_business_id and bm.user_id = auth.uid() and bm.role in ('owner','manager'));
$$;

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.loyalty_products enable row level security;
alter table public.wallets enable row level security;
alter table public.passes enable row level security;
alter table public.redemptions enable row level security;

create policy profiles_select_self on public.profiles for select using (id = auth.uid());
create policy profiles_update_self on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy businesses_public_read on public.businesses for select using (status = 'active' or public.is_business_member(id));
create policy businesses_manager_insert on public.businesses for insert to authenticated with check (true);
create policy businesses_manager_update on public.businesses for update using (public.is_business_manager(id)) with check (public.is_business_manager(id));
create policy business_members_read_own_business on public.business_members for select using (user_id = auth.uid() or public.is_business_member(business_id));
create policy business_members_manage on public.business_members for all using (public.is_business_manager(business_id)) with check (public.is_business_manager(business_id));
create policy loyalty_products_public_read on public.loyalty_products for select using (active or public.is_business_member(business_id));
create policy loyalty_products_manage on public.loyalty_products for all using (public.is_business_manager(business_id)) with check (public.is_business_manager(business_id));
create policy wallets_select_self on public.wallets for select using (user_id = auth.uid());
create policy wallets_update_self on public.wallets for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy passes_customer_read on public.passes for select using (exists (select 1 from public.wallets w where w.id = wallet_id and w.user_id = auth.uid()) or public.is_business_member(business_id));
create policy passes_business_manage on public.passes for insert with check (public.is_business_member(business_id));
create policy passes_business_update on public.passes for update using (public.is_business_member(business_id)) with check (public.is_business_member(business_id));
create policy redemptions_customer_or_business_read on public.redemptions for select using (
  public.is_business_member(business_id)
  or exists (select 1 from public.passes p join public.wallets w on w.id = p.wallet_id where p.id = pass_id and w.user_id = auth.uid())
);

create or replace function public.redeem_pass(target_pass_id uuid, units_to_redeem numeric, request_id uuid)
returns public.redemptions language plpgsql security definer set search_path = public as $$
declare
  target_pass public.passes;
  existing_redemption public.redemptions;
  created_redemption public.redemptions;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if units_to_redeem <= 0 then raise exception 'units_to_redeem must be greater than zero'; end if;
  select * into existing_redemption from public.redemptions where idempotency_key = request_id;
  if found then return existing_redemption; end if;
  select * into target_pass from public.passes where id = target_pass_id for update;
  if not found then raise exception 'pass not found'; end if;
  if not public.is_business_member(target_pass.business_id) then raise exception 'not authorized for this business'; end if;
  if target_pass.status <> 'active' then raise exception 'pass is not active'; end if;
  if target_pass.expires_at is not null and target_pass.expires_at <= now() then
    update public.passes set status = 'expired' where id = target_pass.id;
    raise exception 'pass is expired';
  end if;
  if target_pass.remaining_units < units_to_redeem then raise exception 'insufficient remaining units'; end if;
  update public.passes set remaining_units = remaining_units - units_to_redeem,
    status = case when remaining_units - units_to_redeem = 0 then 'exhausted'::public.pass_status else status end
  where id = target_pass.id;
  insert into public.redemptions (pass_id, business_id, units, performed_by, idempotency_key)
  values (target_pass.id, target_pass.business_id, units_to_redeem, auth.uid(), request_id)
  returning * into created_redemption;
  return created_redemption;
end;
$$;

grant execute on function public.redeem_pass(uuid, numeric, uuid) to authenticated;
revoke insert, update, delete on public.redemptions from anon, authenticated;
