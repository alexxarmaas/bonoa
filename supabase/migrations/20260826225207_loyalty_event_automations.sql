-- Event-based loyalty automations: purchases, visits, spend and product redemptions.
-- Additive and backwards-compatible with the first loyalty growth engine.

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
    'reward_issued',
    'loyalty_event_recorded',
    'automation_rule_created',
    'automation_rule_updated'
  ));

create table if not exists public.loyalty_events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  event_type text not null check (event_type in ('purchase', 'visit', 'redemption')),
  amount_cents bigint not null default 0 check (amount_cents between 0 and 100000000),
  product_id uuid references public.loyalty_products(id) on delete set null,
  source_redemption_id uuid unique references public.redemptions(id) on delete cascade,
  idempotency_key uuid not null,
  recorded_by uuid references auth.users(id) on delete set null,
  rewards_issued integer not null default 0 check (rewards_issued between 0 and 100),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (business_id, idempotency_key),
  constraint loyalty_events_redemption_source check (
    (event_type = 'redemption' and source_redemption_id is not null and product_id is not null)
    or (event_type in ('purchase', 'visit') and source_redemption_id is null)
  )
);

create index if not exists loyalty_events_business_wallet_time_idx
  on public.loyalty_events (business_id, wallet_id, occurred_at desc);
create index if not exists loyalty_events_business_type_time_idx
  on public.loyalty_events (business_id, event_type, occurred_at desc);
create index if not exists loyalty_events_product_time_idx
  on public.loyalty_events (product_id, occurred_at desc) where product_id is not null;

create table if not exists public.loyalty_automation_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  trigger_type text not null check (trigger_type in ('purchase_count', 'visit_count', 'spend_total', 'product_redemption_count')),
  threshold_value bigint not null check (threshold_value between 1 and 100000000),
  trigger_product_id uuid references public.loyalty_products(id) on delete restrict,
  reward_product_id uuid not null references public.loyalty_products(id) on delete restrict,
  repeatable boolean not null default true,
  max_rewards_per_wallet integer check (max_rewards_per_wallet is null or max_rewards_per_wallet between 1 and 100),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint loyalty_automation_trigger_product check (
    (trigger_type = 'product_redemption_count' and trigger_product_id is not null)
    or (trigger_type <> 'product_redemption_count' and trigger_product_id is null)
  ),
  constraint loyalty_automation_spend_threshold check (
    trigger_type <> 'spend_total' or threshold_value >= 100
  )
);

create index if not exists loyalty_automation_rules_business_active_idx
  on public.loyalty_automation_rules (business_id, active, created_at desc);
create index if not exists loyalty_automation_rules_trigger_product_idx
  on public.loyalty_automation_rules (trigger_product_id) where trigger_product_id is not null and active;

create table if not exists public.loyalty_automation_grants (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.loyalty_automation_rules(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  milestone integer not null check (milestone between 1 and 100),
  pass_id uuid references public.passes(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (rule_id, wallet_id, milestone)
);

create index if not exists loyalty_automation_grants_rule_idx
  on public.loyalty_automation_grants (rule_id, created_at desc);
create index if not exists loyalty_automation_grants_wallet_idx
  on public.loyalty_automation_grants (wallet_id, created_at desc);

alter table public.loyalty_events enable row level security;
alter table public.loyalty_automation_rules enable row level security;
alter table public.loyalty_automation_grants enable row level security;

revoke all on public.loyalty_events from anon, authenticated;
revoke all on public.loyalty_automation_rules from anon, authenticated;
revoke all on public.loyalty_automation_grants from anon, authenticated;

create or replace function private.process_loyalty_event_automations(target_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_row public.loyalty_events%rowtype;
  rule_row public.loyalty_automation_rules%rowtype;
  reward_product public.loyalty_products%rowtype;
  metric_value bigint;
  eligible_milestones integer;
  milestone_no integer;
  grant_id uuid;
  reward_pass public.passes%rowtype;
  issued_count integer := 0;
begin
  select * into event_row
  from public.loyalty_events e
  where e.id = target_event_id;

  if event_row.id is null then return 0; end if;

  for rule_row in
    select ar.*
    from public.loyalty_automation_rules ar
    where ar.business_id = event_row.business_id
      and ar.active = true
    order by ar.created_at, ar.id
  loop
    metric_value := 0;

    if rule_row.trigger_type = 'purchase_count' then
      select count(*)::bigint into metric_value
      from public.loyalty_events e
      where e.business_id = event_row.business_id
        and e.wallet_id = event_row.wallet_id
        and e.event_type = 'purchase';
    elsif rule_row.trigger_type = 'visit_count' then
      select count(*)::bigint into metric_value
      from public.loyalty_events e
      where e.business_id = event_row.business_id
        and e.wallet_id = event_row.wallet_id
        and e.event_type = 'visit';
    elsif rule_row.trigger_type = 'spend_total' then
      select coalesce(sum(e.amount_cents), 0)::bigint into metric_value
      from public.loyalty_events e
      where e.business_id = event_row.business_id
        and e.wallet_id = event_row.wallet_id
        and e.event_type = 'purchase';
    elsif rule_row.trigger_type = 'product_redemption_count' then
      select count(*)::bigint into metric_value
      from public.loyalty_events e
      where e.business_id = event_row.business_id
        and e.wallet_id = event_row.wallet_id
        and e.event_type = 'redemption'
        and e.product_id = rule_row.trigger_product_id;
    end if;

    eligible_milestones := floor(metric_value::numeric / rule_row.threshold_value::numeric)::integer;
    if not rule_row.repeatable then eligible_milestones := least(eligible_milestones, 1); end if;
    if rule_row.max_rewards_per_wallet is not null then
      eligible_milestones := least(eligible_milestones, rule_row.max_rewards_per_wallet);
    end if;
    eligible_milestones := least(eligible_milestones, 100);

    if eligible_milestones < 1 then continue; end if;

    for milestone_no in 1..eligible_milestones loop
      if exists (
        select 1 from public.loyalty_automation_grants g
        where g.rule_id = rule_row.id
          and g.wallet_id = event_row.wallet_id
          and g.milestone = milestone_no
      ) then
        continue;
      end if;

      begin
        select * into reward_product
        from public.loyalty_products lp
        where lp.id = rule_row.reward_product_id
          and lp.business_id = event_row.business_id
          and lp.active = true;

        if reward_product.id is null then continue; end if;

        grant_id := null;
        insert into public.loyalty_automation_grants (rule_id, wallet_id, milestone)
        values (rule_row.id, event_row.wallet_id, milestone_no)
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
          event_row.wallet_id,
          reward_product.id,
          event_row.business_id,
          'active'::public.pass_status,
          reward_product.initial_units,
          reward_product.initial_units,
          case when reward_product.validity_days is null then null else now() + make_interval(days => reward_product.validity_days) end,
          0,
          reward_product.currency
        ) returning * into reward_pass;

        update public.loyalty_automation_grants
        set pass_id = reward_pass.id
        where id = grant_id;

        insert into public.business_audit_events (business_id, actor_id, event_type, pass_id, product_id, metadata)
        values (
          event_row.business_id,
          event_row.recorded_by,
          'reward_issued',
          reward_pass.id,
          reward_product.id,
          jsonb_build_object(
            'automation_rule_id', rule_row.id,
            'automation_rule_name', rule_row.name,
            'trigger_type', rule_row.trigger_type,
            'milestone', milestone_no,
            'source_event_id', event_row.id
          )
        );

        issued_count := issued_count + 1;
      exception when others then
        -- Reward automation must never invalidate a valid purchase/visit/redemption.
        null;
      end;
    end loop;
  end loop;

  update public.loyalty_events
  set rewards_issued = greatest(rewards_issued, issued_count)
  where id = event_row.id;

  return issued_count;
end;
$$;

revoke all on function private.process_loyalty_event_automations(uuid) from public, anon, authenticated;

create or replace function public.register_loyalty_event(
  target_business_id uuid,
  target_wallet_token uuid,
  target_qr_version integer,
  target_event_type text,
  target_amount_cents bigint,
  request_id uuid
)
returns table (
  event_id uuid,
  event_type text,
  amount_cents bigint,
  rewards_issued integer,
  already_recorded boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_wallet_id uuid;
  existing_event public.loyalty_events%rowtype;
  created_event public.loyalty_events%rowtype;
  rewards integer := 0;
begin
  if auth.uid() is null or not private.is_business_member(target_business_id) then
    raise exception 'not_authorized';
  end if;
  if target_event_type not in ('purchase', 'visit') then
    raise exception 'invalid_event_type';
  end if;
  if target_qr_version < 1 then raise exception 'invalid_qr_version'; end if;
  if target_amount_cents is null or target_amount_cents < 0 or target_amount_cents > 100000000 then
    raise exception 'invalid_amount';
  end if;
  if target_event_type = 'visit' and target_amount_cents <> 0 then
    raise exception 'visit_cannot_have_amount';
  end if;

  select w.id into target_wallet_id
  from public.wallets w
  where w.public_token = target_wallet_token
    and w.qr_version = target_qr_version;

  if target_wallet_id is null then raise exception 'wallet_not_found'; end if;

  select * into existing_event
  from public.loyalty_events e
  where e.business_id = target_business_id
    and e.idempotency_key = request_id;

  if existing_event.id is not null then
    if existing_event.wallet_id <> target_wallet_id
      or existing_event.event_type <> target_event_type
      or existing_event.amount_cents <> target_amount_cents then
      raise exception 'idempotency_key_reused';
    end if;
    return query select existing_event.id, existing_event.event_type, existing_event.amount_cents, existing_event.rewards_issued, true;
    return;
  end if;

  insert into public.loyalty_events (
    business_id, wallet_id, event_type, amount_cents, idempotency_key, recorded_by
  ) values (
    target_business_id, target_wallet_id, target_event_type, target_amount_cents, request_id, auth.uid()
  ) returning * into created_event;

  rewards := private.process_loyalty_event_automations(created_event.id);

  update public.loyalty_events e
  set rewards_issued = rewards
  where e.id = created_event.id;

  insert into public.business_audit_events (business_id, actor_id, event_type, metadata)
  values (
    target_business_id,
    auth.uid(),
    'loyalty_event_recorded',
    jsonb_build_object(
      'loyalty_event_id', created_event.id,
      'loyalty_event_type', target_event_type,
      'amount_cents', target_amount_cents,
      'rewards_issued', rewards
    )
  );

  return query select created_event.id, created_event.event_type, created_event.amount_cents, rewards, false;
end;
$$;

revoke all on function public.register_loyalty_event(uuid, uuid, integer, text, bigint, uuid) from public, anon;
grant execute on function public.register_loyalty_event(uuid, uuid, integer, text, bigint, uuid) to authenticated;

create or replace function private.capture_redemption_loyalty_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_pass public.passes%rowtype;
  event_id uuid;
begin
  begin
    select * into source_pass from public.passes p where p.id = new.pass_id;
    if source_pass.id is null then return new; end if;

    insert into public.loyalty_events (
      business_id,
      wallet_id,
      event_type,
      amount_cents,
      product_id,
      source_redemption_id,
      idempotency_key,
      recorded_by,
      occurred_at
    ) values (
      new.business_id,
      source_pass.wallet_id,
      'redemption',
      0,
      source_pass.loyalty_product_id,
      new.id,
      new.id,
      new.performed_by,
      new.created_at
    )
    on conflict (source_redemption_id) do nothing
    returning id into event_id;

    if event_id is not null then
      perform private.process_loyalty_event_automations(event_id);
    end if;
  exception when others then
    -- Loyalty tracking must never block a valid redemption.
    null;
  end;
  return new;
end;
$$;

revoke all on function private.capture_redemption_loyalty_event() from public, anon, authenticated;

drop trigger if exists capture_redemption_loyalty_event on public.redemptions;
create trigger capture_redemption_loyalty_event
after insert on public.redemptions
for each row execute function private.capture_redemption_loyalty_event();

-- Backfill historic redemptions so product-consumption automations have a complete baseline.
insert into public.loyalty_events (
  business_id,
  wallet_id,
  event_type,
  amount_cents,
  product_id,
  source_redemption_id,
  idempotency_key,
  recorded_by,
  occurred_at
)
select
  r.business_id,
  p.wallet_id,
  'redemption',
  0,
  p.loyalty_product_id,
  r.id,
  r.id,
  r.performed_by,
  r.created_at
from public.redemptions r
join public.passes p on p.id = r.pass_id
on conflict (source_redemption_id) do nothing;

create or replace function public.create_loyalty_automation_rule(
  target_business_id uuid,
  rule_name text,
  rule_trigger_type text,
  rule_threshold_value bigint,
  target_trigger_product_id uuid,
  target_reward_product_id uuid,
  rule_repeatable boolean,
  reward_limit integer
)
returns public.loyalty_automation_rules
language plpgsql
security definer
set search_path = ''
as $$
declare
  trigger_business_id uuid;
  reward_business_id uuid;
  result public.loyalty_automation_rules;
begin
  if auth.uid() is null or not private.is_business_manager(target_business_id) then
    raise exception 'not_authorized';
  end if;
  if char_length(trim(coalesce(rule_name, ''))) < 2 or char_length(trim(rule_name)) > 120 then
    raise exception 'invalid_rule_name';
  end if;
  if rule_trigger_type not in ('purchase_count', 'visit_count', 'spend_total', 'product_redemption_count') then
    raise exception 'invalid_trigger_type';
  end if;
  if rule_threshold_value < 1 or rule_threshold_value > 100000000 then
    raise exception 'invalid_threshold';
  end if;
  if rule_trigger_type = 'spend_total' and rule_threshold_value < 100 then
    raise exception 'spend_threshold_too_low';
  end if;
  if reward_limit is not null and (reward_limit < 1 or reward_limit > 100) then
    raise exception 'invalid_reward_limit';
  end if;

  select lp.business_id into reward_business_id
  from public.loyalty_products lp
  where lp.id = target_reward_product_id and lp.active = true;
  if reward_business_id is distinct from target_business_id then
    raise exception 'invalid_reward_product';
  end if;

  if rule_trigger_type = 'product_redemption_count' then
    select lp.business_id into trigger_business_id
    from public.loyalty_products lp
    where lp.id = target_trigger_product_id;
    if trigger_business_id is distinct from target_business_id then
      raise exception 'invalid_trigger_product';
    end if;
  elsif target_trigger_product_id is not null then
    raise exception 'trigger_product_not_allowed';
  end if;

  insert into public.loyalty_automation_rules (
    business_id,
    name,
    trigger_type,
    threshold_value,
    trigger_product_id,
    reward_product_id,
    repeatable,
    max_rewards_per_wallet,
    active,
    created_by
  ) values (
    target_business_id,
    trim(rule_name),
    rule_trigger_type,
    rule_threshold_value,
    case when rule_trigger_type = 'product_redemption_count' then target_trigger_product_id else null end,
    target_reward_product_id,
    coalesce(rule_repeatable, true),
    reward_limit,
    true,
    auth.uid()
  ) returning * into result;

  insert into public.business_audit_events (business_id, actor_id, event_type, product_id, metadata)
  values (
    target_business_id,
    auth.uid(),
    'automation_rule_created',
    target_reward_product_id,
    jsonb_build_object(
      'rule_id', result.id,
      'name', result.name,
      'trigger_type', result.trigger_type,
      'threshold_value', result.threshold_value,
      'repeatable', result.repeatable
    )
  );

  return result;
end;
$$;

create or replace function public.set_loyalty_automation_rule_active(target_rule_id uuid, next_active boolean)
returns public.loyalty_automation_rules
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_business_id uuid;
  result public.loyalty_automation_rules;
begin
  select ar.business_id into target_business_id
  from public.loyalty_automation_rules ar
  where ar.id = target_rule_id;

  if target_business_id is null or auth.uid() is null or not private.is_business_manager(target_business_id) then
    raise exception 'not_authorized';
  end if;

  update public.loyalty_automation_rules
  set active = next_active, updated_at = now()
  where id = target_rule_id
  returning * into result;

  insert into public.business_audit_events (business_id, actor_id, event_type, product_id, metadata)
  values (
    result.business_id,
    auth.uid(),
    'automation_rule_updated',
    result.reward_product_id,
    jsonb_build_object('rule_id', result.id, 'active', result.active)
  );

  return result;
end;
$$;

create or replace function public.business_loyalty_automation_rules(target_business_id uuid)
returns table (
  rule_id uuid,
  rule_name text,
  trigger_type text,
  threshold_value bigint,
  trigger_product_id uuid,
  trigger_product_name text,
  reward_product_id uuid,
  reward_product_name text,
  repeatable boolean,
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
    ar.id,
    ar.name,
    ar.trigger_type,
    ar.threshold_value,
    ar.trigger_product_id,
    trigger_product.name,
    ar.reward_product_id,
    reward_product.name,
    ar.repeatable,
    ar.max_rewards_per_wallet,
    ar.active,
    count(g.id)::bigint,
    count(distinct g.wallet_id)::bigint,
    ar.created_at
  from public.loyalty_automation_rules ar
  left join public.loyalty_products trigger_product on trigger_product.id = ar.trigger_product_id
  join public.loyalty_products reward_product on reward_product.id = ar.reward_product_id
  left join public.loyalty_automation_grants g on g.rule_id = ar.id
  where ar.business_id = target_business_id
  group by ar.id, trigger_product.name, reward_product.name
  order by ar.created_at desc;
end;
$$;

create or replace function public.business_customer_loyalty_snapshot(target_business_id uuid)
returns table (
  wallet_id uuid,
  customer_code text,
  first_seen timestamptz,
  last_activity timestamptz,
  passes_issued bigint,
  active_passes bigint,
  redemptions bigint,
  purchases bigint,
  visits bigint,
  spend_cents bigint,
  rewards_earned bigint,
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
      min(p.purchased_at) as first_pass,
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
  ), event_stats as (
    select
      e.wallet_id,
      min(e.occurred_at) as first_event,
      max(e.occurred_at) as last_event,
      count(*) filter (where e.event_type = 'redemption')::bigint as redemptions,
      count(*) filter (where e.event_type = 'purchase')::bigint as purchases,
      count(*) filter (where e.event_type = 'visit')::bigint as visits,
      coalesce(sum(e.amount_cents) filter (where e.event_type = 'purchase'), 0)::bigint as spend_cents
    from public.loyalty_events e
    where e.business_id = target_business_id
    group by e.wallet_id
  ), reward_stats as (
    select g.wallet_id, count(*)::bigint as rewards_earned
    from public.loyalty_automation_grants g
    join public.loyalty_automation_rules ar on ar.id = g.rule_id
    where ar.business_id = target_business_id and g.pass_id is not null
    group by g.wallet_id
  ), wallets_in_business as (
    select wallet_id from pass_stats
    union
    select wallet_id from event_stats
  ), combined as (
    select
      wb.wallet_id,
      least(ps.first_pass, es.first_event) as first_seen,
      greatest(ps.last_pass_activity, es.last_event) as last_activity,
      coalesce(ps.passes_issued, 0)::bigint as passes_issued,
      coalesce(ps.active_passes, 0)::bigint as active_passes,
      coalesce(es.redemptions, 0)::bigint as redemptions,
      coalesce(es.purchases, 0)::bigint as purchases,
      coalesce(es.visits, 0)::bigint as visits,
      coalesce(es.spend_cents, 0)::bigint as spend_cents,
      coalesce(rs.rewards_earned, 0)::bigint as rewards_earned,
      coalesce(ps.issued_value_cents, 0)::bigint as issued_value_cents
    from wallets_in_business wb
    left join pass_stats ps on ps.wallet_id = wb.wallet_id
    left join event_stats es on es.wallet_id = wb.wallet_id
    left join reward_stats rs on rs.wallet_id = wb.wallet_id
  )
  select
    c.wallet_id,
    'CL-' || upper(substr(replace(c.wallet_id::text, '-', ''), 1, 4)) || '-' || upper(right(replace(c.wallet_id::text, '-', ''), 4)),
    c.first_seen,
    c.last_activity,
    c.passes_issued,
    c.active_passes,
    c.redemptions,
    c.purchases,
    c.visits,
    c.spend_cents,
    c.rewards_earned,
    c.issued_value_cents,
    case
      when (c.purchases + c.visits + c.redemptions) > 0 and c.last_activity < now() - interval '45 days' then 'at_risk'
      when c.purchases >= 5 or c.visits >= 8 or c.redemptions >= 5 or c.rewards_earned >= 2 then 'loyal'
      when c.first_seen >= now() - interval '30 days' then 'new'
      else 'active'
    end,
    greatest(0, floor(extract(epoch from (now() - c.last_activity)) / 86400))::integer
  from combined c
  order by
    case
      when (c.purchases + c.visits + c.redemptions) > 0 and c.last_activity < now() - interval '45 days' then 0
      when c.purchases >= 5 or c.visits >= 8 or c.redemptions >= 5 or c.rewards_earned >= 2 then 1
      when c.first_seen >= now() - interval '30 days' then 2
      else 3
    end,
    c.last_activity desc;
end;
$$;

create or replace function public.business_loyalty_event_summary(target_business_id uuid)
returns table (
  purchases_30d bigint,
  visits_30d bigint,
  spend_30d_cents bigint,
  rewards_30d bigint
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
    count(*) filter (where e.event_type = 'purchase' and e.occurred_at >= now() - interval '30 days')::bigint,
    count(*) filter (where e.event_type = 'visit' and e.occurred_at >= now() - interval '30 days')::bigint,
    coalesce(sum(e.amount_cents) filter (where e.event_type = 'purchase' and e.occurred_at >= now() - interval '30 days'), 0)::bigint,
    (select count(*)::bigint
     from public.loyalty_automation_grants g
     join public.loyalty_automation_rules ar on ar.id = g.rule_id
     where ar.business_id = target_business_id
       and g.pass_id is not null
       and g.created_at >= now() - interval '30 days')
  from public.loyalty_events e
  where e.business_id = target_business_id;
end;
$$;

revoke all on function public.create_loyalty_automation_rule(uuid, text, text, bigint, uuid, uuid, boolean, integer) from public, anon;
revoke all on function public.set_loyalty_automation_rule_active(uuid, boolean) from public, anon;
revoke all on function public.business_loyalty_automation_rules(uuid) from public, anon;
revoke all on function public.business_customer_loyalty_snapshot(uuid) from public, anon;
revoke all on function public.business_loyalty_event_summary(uuid) from public, anon;

grant execute on function public.create_loyalty_automation_rule(uuid, text, text, bigint, uuid, uuid, boolean, integer) to authenticated;
grant execute on function public.set_loyalty_automation_rule_active(uuid, boolean) to authenticated;
grant execute on function public.business_loyalty_automation_rules(uuid) to authenticated;
grant execute on function public.business_customer_loyalty_snapshot(uuid) to authenticated;
grant execute on function public.business_loyalty_event_summary(uuid) to authenticated;
