-- Bonoa loyalty growth engine: customer segments, shareable campaigns and automatic rewards.

alter table public.business_audit_events
  drop constraint if exists business_audit_events_event_type_check;

alter table public.business_audit_events
  add constraint business_audit_events_event_type_check check (event_type in (
    'business_created',
    'business_updated',
    'business_branding_updated',
    'member_added',
    'member_removed',
    'member_role_changed',
    'product_created',
    'product_updated',
    'product_activated',
    'product_deactivated',
    'pass_issued',
    'pass_cancelled',
    'redemption',
    'campaign_created',
    'campaign_updated',
    'campaign_claimed',
    'reward_rule_created',
    'reward_rule_updated',
    'reward_issued'
  ));

create table if not exists public.loyalty_campaigns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  product_id uuid not null references public.loyalty_products(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 120),
  message text check (message is null or char_length(message) <= 500),
  share_code text not null unique,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  max_claims integer check (max_claims is null or max_claims between 1 and 100000),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loyalty_campaigns_date_range check (ends_at is null or ends_at > starts_at)
);

create index if not exists loyalty_campaigns_business_created_idx
  on public.loyalty_campaigns (business_id, created_at desc);
create index if not exists loyalty_campaigns_product_idx
  on public.loyalty_campaigns (product_id);
create index if not exists loyalty_campaigns_active_dates_idx
  on public.loyalty_campaigns (active, starts_at, ends_at);

create table if not exists public.loyalty_campaign_claims (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.loyalty_campaigns(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  pass_id uuid not null references public.passes(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  unique (campaign_id, wallet_id),
  unique (pass_id)
);

create index if not exists loyalty_campaign_claims_campaign_idx
  on public.loyalty_campaign_claims (campaign_id, claimed_at desc);
create index if not exists loyalty_campaign_claims_wallet_idx
  on public.loyalty_campaign_claims (wallet_id, claimed_at desc);

create table if not exists public.loyalty_reward_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  trigger_product_id uuid not null references public.loyalty_products(id) on delete restrict,
  reward_product_id uuid not null references public.loyalty_products(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 2 and 120),
  every_n_redemptions integer not null check (every_n_redemptions between 1 and 100),
  max_rewards_per_wallet integer check (max_rewards_per_wallet is null or max_rewards_per_wallet between 1 and 100),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists loyalty_reward_rules_business_idx
  on public.loyalty_reward_rules (business_id, active, created_at desc);
create index if not exists loyalty_reward_rules_trigger_idx
  on public.loyalty_reward_rules (trigger_product_id) where active;

create table if not exists public.loyalty_reward_grants (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.loyalty_reward_rules(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  milestone integer not null check (milestone > 0),
  pass_id uuid references public.passes(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (rule_id, wallet_id, milestone)
);

create index if not exists loyalty_reward_grants_rule_created_idx
  on public.loyalty_reward_grants (rule_id, created_at desc);
create index if not exists loyalty_reward_grants_wallet_idx
  on public.loyalty_reward_grants (wallet_id, created_at desc);

alter table public.loyalty_campaigns enable row level security;
alter table public.loyalty_campaign_claims enable row level security;
alter table public.loyalty_reward_rules enable row level security;
alter table public.loyalty_reward_grants enable row level security;

revoke all on public.loyalty_campaigns from anon, authenticated;
revoke all on public.loyalty_campaign_claims from anon, authenticated;
revoke all on public.loyalty_reward_rules from anon, authenticated;
revoke all on public.loyalty_reward_grants from anon, authenticated;

create or replace function public.business_customer_segments(target_business_id uuid)
returns table (
  wallet_id uuid,
  customer_code text,
  first_seen timestamptz,
  last_activity timestamptz,
  passes_issued bigint,
  active_passes bigint,
  redemptions bigint,
  issued_value_cents bigint,
  segment text,
  days_since_activity integer
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
      p.wallet_id,
      min(p.purchased_at) as first_seen,
      max(greatest(p.purchased_at, p.updated_at)) as last_pass_activity,
      count(*)::bigint as passes_issued,
      count(*) filter (
        where p.status = 'active'::public.pass_status
          and p.remaining_units > 0
          and (p.expires_at is null or p.expires_at >= now())
      )::bigint as active_passes,
      coalesce(sum(p.issued_price_cents), 0)::bigint as issued_value_cents
    from public.passes p
    where p.business_id = target_business_id
    group by p.wallet_id
  ), redemption_stats as (
    select
      p.wallet_id,
      count(r.id)::bigint as redemptions,
      max(r.created_at) as last_redemption
    from public.redemptions r
    join public.passes p on p.id = r.pass_id
    where r.business_id = target_business_id
    group by p.wallet_id
  ), combined as (
    select
      ps.wallet_id,
      ps.first_seen,
      greatest(ps.last_pass_activity, rs.last_redemption) as last_activity,
      ps.passes_issued,
      ps.active_passes,
      coalesce(rs.redemptions, 0)::bigint as redemptions,
      ps.issued_value_cents
    from pass_stats ps
    left join redemption_stats rs on rs.wallet_id = ps.wallet_id
  )
  select
    c.wallet_id,
    'CL-' || upper(substr(replace(c.wallet_id::text, '-', ''), 1, 4)) || '-' || upper(right(replace(c.wallet_id::text, '-', ''), 4)) as customer_code,
    c.first_seen,
    c.last_activity,
    c.passes_issued,
    c.active_passes,
    c.redemptions,
    c.issued_value_cents,
    case
      when c.redemptions > 0 and c.last_activity < now() - interval '45 days' then 'at_risk'
      when c.redemptions >= 5 or c.passes_issued >= 3 then 'loyal'
      when c.first_seen >= now() - interval '30 days' then 'new'
      else 'active'
    end as segment,
    greatest(0, floor(extract(epoch from (now() - c.last_activity)) / 86400))::integer as days_since_activity
  from combined c
  order by
    case
      when c.redemptions > 0 and c.last_activity < now() - interval '45 days' then 0
      when c.redemptions >= 5 or c.passes_issued >= 3 then 1
      when c.first_seen >= now() - interval '30 days' then 2
      else 3
    end,
    c.last_activity desc;
end;
$$;

create or replace function public.create_loyalty_campaign(
  target_business_id uuid,
  target_product_id uuid,
  campaign_name text,
  campaign_message text,
  campaign_starts_at timestamptz,
  campaign_ends_at timestamptz,
  campaign_max_claims integer
)
returns public.loyalty_campaigns
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.loyalty_campaigns;
  product_business_id uuid;
  generated_code text;
begin
  if auth.uid() is null or not private.is_business_manager(target_business_id) then
    raise exception 'not_authorized';
  end if;

  if char_length(trim(coalesce(campaign_name, ''))) < 2 or char_length(trim(campaign_name)) > 120 then
    raise exception 'invalid_campaign_name';
  end if;
  if campaign_message is not null and char_length(campaign_message) > 500 then
    raise exception 'invalid_campaign_message';
  end if;
  if campaign_max_claims is not null and (campaign_max_claims < 1 or campaign_max_claims > 100000) then
    raise exception 'invalid_max_claims';
  end if;
  if campaign_ends_at is not null and campaign_ends_at <= coalesce(campaign_starts_at, now()) then
    raise exception 'invalid_campaign_dates';
  end if;

  select lp.business_id into product_business_id
  from public.loyalty_products lp
  where lp.id = target_product_id and lp.active = true;

  if product_business_id is null or product_business_id <> target_business_id then
    raise exception 'invalid_campaign_product';
  end if;

  generated_code := replace(gen_random_uuid()::text, '-', '');

  insert into public.loyalty_campaigns (
    business_id, product_id, name, message, share_code, starts_at, ends_at, max_claims, active, created_by
  ) values (
    target_business_id,
    target_product_id,
    trim(campaign_name),
    nullif(trim(coalesce(campaign_message, '')), ''),
    generated_code,
    coalesce(campaign_starts_at, now()),
    campaign_ends_at,
    campaign_max_claims,
    true,
    auth.uid()
  ) returning * into result;

  insert into public.business_audit_events (business_id, actor_id, event_type, product_id, metadata)
  values (
    target_business_id,
    auth.uid(),
    'campaign_created',
    target_product_id,
    jsonb_build_object('campaign_id', result.id, 'name', result.name, 'max_claims', result.max_claims)
  );

  return result;
end;
$$;

create or replace function public.set_loyalty_campaign_active(target_campaign_id uuid, next_active boolean)
returns public.loyalty_campaigns
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_business_id uuid;
  result public.loyalty_campaigns;
begin
  select c.business_id into target_business_id
  from public.loyalty_campaigns c
  where c.id = target_campaign_id;

  if target_business_id is null or auth.uid() is null or not private.is_business_manager(target_business_id) then
    raise exception 'not_authorized';
  end if;

  update public.loyalty_campaigns
  set active = next_active, updated_at = now()
  where id = target_campaign_id
  returning * into result;

  insert into public.business_audit_events (business_id, actor_id, event_type, product_id, metadata)
  values (
    result.business_id,
    auth.uid(),
    'campaign_updated',
    result.product_id,
    jsonb_build_object('campaign_id', result.id, 'active', result.active)
  );

  return result;
end;
$$;

create or replace function public.business_loyalty_campaigns(target_business_id uuid)
returns table (
  campaign_id uuid,
  campaign_name text,
  message text,
  share_code text,
  product_id uuid,
  product_name text,
  starts_at timestamptz,
  ends_at timestamptz,
  max_claims integer,
  claims bigint,
  active boolean,
  state text,
  created_at timestamptz
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
    c.id,
    c.name,
    c.message,
    c.share_code,
    c.product_id,
    lp.name,
    c.starts_at,
    c.ends_at,
    c.max_claims,
    count(cc.id)::bigint,
    c.active,
    case
      when not c.active then 'disabled'
      when c.starts_at > now() then 'upcoming'
      when c.ends_at is not null and c.ends_at <= now() then 'ended'
      when c.max_claims is not null and count(cc.id) >= c.max_claims then 'exhausted'
      else 'active'
    end,
    c.created_at
  from public.loyalty_campaigns c
  join public.loyalty_products lp on lp.id = c.product_id
  left join public.loyalty_campaign_claims cc on cc.campaign_id = c.id
  where c.business_id = target_business_id
  group by c.id, lp.name
  order by c.created_at desc;
end;
$$;

create or replace function public.public_loyalty_campaign(campaign_code text)
returns table (
  campaign_id uuid,
  campaign_name text,
  campaign_message text,
  business_name text,
  business_slug text,
  business_logo_url text,
  business_accent_color text,
  product_name text,
  product_description text,
  product_type public.loyalty_product_type,
  initial_units numeric,
  validity_days integer,
  ends_at timestamptz,
  claims_remaining integer,
  state text
)
language sql
security definer
set search_path = ''
as $$
  select
    c.id,
    c.name,
    c.message,
    b.name,
    b.slug,
    b.logo_url,
    b.accent_color,
    lp.name,
    lp.description,
    lp.type,
    lp.initial_units,
    lp.validity_days,
    c.ends_at,
    case when c.max_claims is null then null else greatest(c.max_claims - count(cc.id)::integer, 0) end,
    case
      when not c.active then 'disabled'
      when c.starts_at > now() then 'upcoming'
      when c.ends_at is not null and c.ends_at <= now() then 'ended'
      when c.max_claims is not null and count(cc.id) >= c.max_claims then 'exhausted'
      else 'active'
    end
  from public.loyalty_campaigns c
  join public.businesses b on b.id = c.business_id and b.status = 'active'
  join public.loyalty_products lp on lp.id = c.product_id and lp.active = true
  left join public.loyalty_campaign_claims cc on cc.campaign_id = c.id
  where c.share_code = trim(campaign_code)
  group by c.id, b.id, lp.id;
$$;

create or replace function public.claim_loyalty_campaign(campaign_code text)
returns table (
  pass_id uuid,
  product_name text,
  initial_units numeric,
  expires_at timestamptz,
  already_claimed boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  campaign public.loyalty_campaigns;
  target_wallet_id uuid;
  product public.loyalty_products;
  existing_pass_id uuid;
  claim_count bigint;
  created_pass public.passes;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select * into campaign
  from public.loyalty_campaigns c
  where c.share_code = trim(campaign_code)
  for update;

  if campaign.id is null then raise exception 'campaign_not_found'; end if;

  select w.id into target_wallet_id
  from public.wallets w
  where w.user_id = auth.uid();

  if target_wallet_id is null then raise exception 'wallet_not_found'; end if;

  perform pg_advisory_xact_lock(hashtext(campaign.id::text || ':' || target_wallet_id::text));

  select cc.pass_id into existing_pass_id
  from public.loyalty_campaign_claims cc
  where cc.campaign_id = campaign.id and cc.wallet_id = target_wallet_id;

  if existing_pass_id is not null then
    return query
    select p.id, lp.name, p.initial_units, p.expires_at, true
    from public.passes p
    join public.loyalty_products lp on lp.id = p.loyalty_product_id
    where p.id = existing_pass_id;
    return;
  end if;

  if not campaign.active then raise exception 'campaign_disabled'; end if;
  if campaign.starts_at > now() then raise exception 'campaign_not_started'; end if;
  if campaign.ends_at is not null and campaign.ends_at <= now() then raise exception 'campaign_ended'; end if;

  if campaign.max_claims is not null then
    select count(*) into claim_count
    from public.loyalty_campaign_claims cc
    where cc.campaign_id = campaign.id;
    if claim_count >= campaign.max_claims then raise exception 'campaign_exhausted'; end if;
  end if;

  select * into product
  from public.loyalty_products lp
  where lp.id = campaign.product_id and lp.active = true;

  if product.id is null then raise exception 'campaign_product_unavailable'; end if;

  insert into public.passes (
    wallet_id,
    loyalty_product_id,
    business_id,
    status,
    initial_units,
    remaining_units,
    expires_at,
    issued_price_cents,
    issued_currency
  ) values (
    target_wallet_id,
    product.id,
    campaign.business_id,
    'active'::public.pass_status,
    product.initial_units,
    product.initial_units,
    case when product.validity_days is null then null else now() + make_interval(days => product.validity_days) end,
    0,
    product.currency
  ) returning * into created_pass;

  insert into public.loyalty_campaign_claims (campaign_id, wallet_id, pass_id)
  values (campaign.id, target_wallet_id, created_pass.id);

  insert into public.business_audit_events (business_id, actor_id, event_type, pass_id, product_id, metadata)
  values (
    campaign.business_id,
    auth.uid(),
    'campaign_claimed',
    created_pass.id,
    product.id,
    jsonb_build_object('campaign_id', campaign.id, 'campaign_name', campaign.name)
  );

  return query select created_pass.id, product.name, created_pass.initial_units, created_pass.expires_at, false;
end;
$$;

create or replace function public.create_loyalty_reward_rule(
  target_business_id uuid,
  target_trigger_product_id uuid,
  target_reward_product_id uuid,
  rule_name text,
  redemption_threshold integer,
  reward_limit integer
)
returns public.loyalty_reward_rules
language plpgsql
security definer
set search_path = ''
as $$
declare
  trigger_business_id uuid;
  reward_business_id uuid;
  result public.loyalty_reward_rules;
begin
  if auth.uid() is null or not private.is_business_manager(target_business_id) then
    raise exception 'not_authorized';
  end if;
  if char_length(trim(coalesce(rule_name, ''))) < 2 or char_length(trim(rule_name)) > 120 then
    raise exception 'invalid_rule_name';
  end if;
  if redemption_threshold < 1 or redemption_threshold > 100 then
    raise exception 'invalid_threshold';
  end if;
  if reward_limit is not null and (reward_limit < 1 or reward_limit > 100) then
    raise exception 'invalid_reward_limit';
  end if;

  select lp.business_id into trigger_business_id from public.loyalty_products lp where lp.id = target_trigger_product_id;
  select lp.business_id into reward_business_id from public.loyalty_products lp where lp.id = target_reward_product_id and lp.active = true;
  if trigger_business_id <> target_business_id or reward_business_id <> target_business_id then
    raise exception 'invalid_reward_products';
  end if;

  insert into public.loyalty_reward_rules (
    business_id, trigger_product_id, reward_product_id, name, every_n_redemptions, max_rewards_per_wallet, active, created_by
  ) values (
    target_business_id,
    target_trigger_product_id,
    target_reward_product_id,
    trim(rule_name),
    redemption_threshold,
    reward_limit,
    true,
    auth.uid()
  ) returning * into result;

  insert into public.business_audit_events (business_id, actor_id, event_type, product_id, metadata)
  values (
    target_business_id,
    auth.uid(),
    'reward_rule_created',
    target_reward_product_id,
    jsonb_build_object('rule_id', result.id, 'name', result.name, 'threshold', result.every_n_redemptions)
  );

  return result;
end;
$$;

create or replace function public.set_loyalty_reward_rule_active(target_rule_id uuid, next_active boolean)
returns public.loyalty_reward_rules
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_business_id uuid;
  result public.loyalty_reward_rules;
begin
  select r.business_id into target_business_id from public.loyalty_reward_rules r where r.id = target_rule_id;
  if target_business_id is null or auth.uid() is null or not private.is_business_manager(target_business_id) then
    raise exception 'not_authorized';
  end if;

  update public.loyalty_reward_rules
  set active = next_active, updated_at = now()
  where id = target_rule_id
  returning * into result;

  insert into public.business_audit_events (business_id, actor_id, event_type, product_id, metadata)
  values (
    result.business_id,
    auth.uid(),
    'reward_rule_updated',
    result.reward_product_id,
    jsonb_build_object('rule_id', result.id, 'active', result.active)
  );

  return result;
end;
$$;

create or replace function public.business_loyalty_reward_rules(target_business_id uuid)
returns table (
  rule_id uuid,
  rule_name text,
  trigger_product_id uuid,
  trigger_product_name text,
  reward_product_id uuid,
  reward_product_name text,
  every_n_redemptions integer,
  max_rewards_per_wallet integer,
  active boolean,
  rewards_issued bigint,
  customers_rewarded bigint,
  created_at timestamptz
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
    r.id,
    r.name,
    r.trigger_product_id,
    trigger_product.name,
    r.reward_product_id,
    reward_product.name,
    r.every_n_redemptions,
    r.max_rewards_per_wallet,
    r.active,
    count(g.id)::bigint,
    count(distinct g.wallet_id)::bigint,
    r.created_at
  from public.loyalty_reward_rules r
  join public.loyalty_products trigger_product on trigger_product.id = r.trigger_product_id
  join public.loyalty_products reward_product on reward_product.id = r.reward_product_id
  left join public.loyalty_reward_grants g on g.rule_id = r.id and g.pass_id is not null
  where r.business_id = target_business_id
  group by r.id, trigger_product.name, reward_product.name
  order by r.created_at desc;
end;
$$;

create or replace function private.apply_loyalty_reward_after_redemption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_wallet_id uuid;
  trigger_product_id uuid;
  redemption_count bigint;
  milestone_number integer;
  rule_record record;
  reward_product public.loyalty_products;
  grant_id uuid;
  reward_pass_id uuid;
begin
  select p.wallet_id, p.loyalty_product_id
    into target_wallet_id, trigger_product_id
  from public.passes p
  where p.id = new.pass_id;

  if target_wallet_id is null or trigger_product_id is null then return new; end if;

  for rule_record in
    select r.*
    from public.loyalty_reward_rules r
    where r.business_id = new.business_id
      and r.trigger_product_id = trigger_product_id
      and r.active = true
  loop
    begin
      select count(*)::bigint into redemption_count
      from public.redemptions rd
      join public.passes rp on rp.id = rd.pass_id
      where rd.business_id = new.business_id
        and rp.wallet_id = target_wallet_id
        and rp.loyalty_product_id = trigger_product_id;

      if redemption_count < rule_record.every_n_redemptions then continue; end if;
      if mod(redemption_count, rule_record.every_n_redemptions) <> 0 then continue; end if;

      milestone_number := (redemption_count / rule_record.every_n_redemptions)::integer;
      if rule_record.max_rewards_per_wallet is not null and milestone_number > rule_record.max_rewards_per_wallet then continue; end if;

      select * into reward_product
      from public.loyalty_products lp
      where lp.id = rule_record.reward_product_id
        and lp.business_id = new.business_id
        and lp.active = true;
      if reward_product.id is null then continue; end if;

      grant_id := null;
      insert into public.loyalty_reward_grants (rule_id, wallet_id, milestone)
      values (rule_record.id, target_wallet_id, milestone_number)
      on conflict (rule_id, wallet_id, milestone) do nothing
      returning id into grant_id;
      if grant_id is null then continue; end if;

      insert into public.passes (
        wallet_id,
        loyalty_product_id,
        business_id,
        status,
        initial_units,
        remaining_units,
        expires_at,
        issued_price_cents,
        issued_currency
      ) values (
        target_wallet_id,
        reward_product.id,
        new.business_id,
        'active'::public.pass_status,
        reward_product.initial_units,
        reward_product.initial_units,
        case when reward_product.validity_days is null then null else now() + make_interval(days => reward_product.validity_days) end,
        0,
        reward_product.currency
      ) returning id into reward_pass_id;

      update public.loyalty_reward_grants set pass_id = reward_pass_id where id = grant_id;

      insert into public.business_audit_events (business_id, actor_id, event_type, pass_id, product_id, metadata)
      values (
        new.business_id,
        new.performed_by,
        'reward_issued',
        reward_pass_id,
        reward_product.id,
        jsonb_build_object(
          'rule_id', rule_record.id,
          'rule_name', rule_record.name,
          'milestone', milestone_number,
          'trigger_redemptions', redemption_count
        )
      );
    exception when others then
      -- A reward must never make a valid redemption fail. The failed reward can be
      -- diagnosed from the rule configuration and retried operationally later.
      null;
    end;
  end loop;

  return new;
end;
$$;

revoke all on function private.apply_loyalty_reward_after_redemption() from public, anon, authenticated;

drop trigger if exists apply_loyalty_reward_after_redemption on public.redemptions;
create trigger apply_loyalty_reward_after_redemption
after insert on public.redemptions
for each row execute function private.apply_loyalty_reward_after_redemption();

revoke all on function public.business_customer_segments(uuid) from public, anon;
revoke all on function public.create_loyalty_campaign(uuid, uuid, text, text, timestamptz, timestamptz, integer) from public, anon;
revoke all on function public.set_loyalty_campaign_active(uuid, boolean) from public, anon;
revoke all on function public.business_loyalty_campaigns(uuid) from public, anon;
revoke all on function public.public_loyalty_campaign(text) from public;
revoke all on function public.claim_loyalty_campaign(text) from public, anon;
revoke all on function public.create_loyalty_reward_rule(uuid, uuid, uuid, text, integer, integer) from public, anon;
revoke all on function public.set_loyalty_reward_rule_active(uuid, boolean) from public, anon;
revoke all on function public.business_loyalty_reward_rules(uuid) from public, anon;

grant execute on function public.business_customer_segments(uuid) to authenticated;
grant execute on function public.create_loyalty_campaign(uuid, uuid, text, text, timestamptz, timestamptz, integer) to authenticated;
grant execute on function public.set_loyalty_campaign_active(uuid, boolean) to authenticated;
grant execute on function public.business_loyalty_campaigns(uuid) to authenticated;
grant execute on function public.public_loyalty_campaign(text) to anon, authenticated;
grant execute on function public.claim_loyalty_campaign(text) to authenticated;
grant execute on function public.create_loyalty_reward_rule(uuid, uuid, uuid, text, integer, integer) to authenticated;
grant execute on function public.set_loyalty_reward_rule_active(uuid, boolean) to authenticated;
grant execute on function public.business_loyalty_reward_rules(uuid) to authenticated;
