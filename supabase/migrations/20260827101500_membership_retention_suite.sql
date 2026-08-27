-- Permanent loyalty memberships, qualified-purchase cards, transaction feed,
-- notification center and segmented campaign primitives.

create table if not exists public.loyalty_memberships (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, wallet_id)
);

create index if not exists loyalty_memberships_wallet_idx on public.loyalty_memberships (wallet_id, last_activity_at desc);
create index if not exists loyalty_memberships_business_idx on public.loyalty_memberships (business_id, last_activity_at desc);

alter table public.loyalty_memberships enable row level security;
revoke all on public.loyalty_memberships from anon, authenticated;

alter table public.loyalty_automation_rules
  add column if not exists minimum_purchase_cents bigint not null default 0;

alter table public.loyalty_automation_rules
  drop constraint if exists loyalty_automation_rules_minimum_purchase_cents_check;
alter table public.loyalty_automation_rules
  add constraint loyalty_automation_rules_minimum_purchase_cents_check
  check (minimum_purchase_cents between 0 and 100000000);

alter table public.loyalty_campaigns
  add column if not exists target_segment text not null default 'all';

alter table public.loyalty_campaigns
  drop constraint if exists loyalty_campaigns_target_segment_check;
alter table public.loyalty_campaigns
  add constraint loyalty_campaigns_target_segment_check
  check (target_segment in ('all', 'new', 'active', 'loyal', 'at_risk'));

create table if not exists public.wallet_notifications (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.wallets(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete cascade,
  notification_type text not null check (notification_type in ('purchase', 'visit', 'redemption', 'reward', 'campaign', 'system')),
  title text not null check (char_length(title) between 1 and 140),
  body text not null check (char_length(body) between 1 and 500),
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists wallet_notifications_wallet_created_idx on public.wallet_notifications (wallet_id, created_at desc);
create index if not exists wallet_notifications_wallet_unread_idx on public.wallet_notifications (wallet_id, created_at desc) where read_at is null;

alter table public.wallet_notifications enable row level security;
revoke all on public.wallet_notifications from anon, authenticated;

create or replace function private.ensure_loyalty_membership(
  target_business_id uuid,
  target_wallet_id uuid,
  activity_at timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare membership_id uuid;
begin
  insert into public.loyalty_memberships (business_id, wallet_id, joined_at, last_activity_at, status)
  values (target_business_id, target_wallet_id, coalesce(activity_at, now()), coalesce(activity_at, now()), 'active')
  on conflict (business_id, wallet_id) do update
    set joined_at = least(public.loyalty_memberships.joined_at, excluded.joined_at),
        last_activity_at = greatest(public.loyalty_memberships.last_activity_at, excluded.last_activity_at),
        status = 'active',
        updated_at = now()
  returning id into membership_id;
  return membership_id;
end;
$$;

revoke all on function private.ensure_loyalty_membership(uuid, uuid, timestamptz) from public, anon, authenticated;

create or replace function private.capture_loyalty_membership_from_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.ensure_loyalty_membership(new.business_id, new.wallet_id, new.occurred_at);
  return new;
end;
$$;

create or replace function private.capture_loyalty_membership_from_pass()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.ensure_loyalty_membership(new.business_id, new.wallet_id, new.purchased_at);
  return new;
end;
$$;

revoke all on function private.capture_loyalty_membership_from_event() from public, anon, authenticated;
revoke all on function private.capture_loyalty_membership_from_pass() from public, anon, authenticated;

drop trigger if exists ensure_membership_from_loyalty_event on public.loyalty_events;
create trigger ensure_membership_from_loyalty_event
after insert on public.loyalty_events
for each row execute function private.capture_loyalty_membership_from_event();

drop trigger if exists ensure_membership_from_pass on public.passes;
create trigger ensure_membership_from_pass
after insert on public.passes
for each row execute function private.capture_loyalty_membership_from_pass();

insert into public.loyalty_memberships (business_id, wallet_id, joined_at, last_activity_at, status)
select rel.business_id, rel.wallet_id, min(rel.first_seen), max(rel.last_seen), 'active'
from (
  select p.business_id, p.wallet_id, p.purchased_at as first_seen, greatest(p.purchased_at, p.updated_at) as last_seen
  from public.passes p
  union all
  select e.business_id, e.wallet_id, e.occurred_at, e.occurred_at
  from public.loyalty_events e
) rel
group by rel.business_id, rel.wallet_id
on conflict (business_id, wallet_id) do update
set joined_at = least(public.loyalty_memberships.joined_at, excluded.joined_at),
    last_activity_at = greatest(public.loyalty_memberships.last_activity_at, excluded.last_activity_at),
    updated_at = now();

create or replace function private.push_wallet_notification(
  target_wallet_id uuid,
  target_business_id uuid,
  target_type text,
  target_title text,
  target_body text,
  target_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare notification_id uuid;
begin
  insert into public.wallet_notifications (wallet_id, business_id, notification_type, title, body, metadata)
  values (target_wallet_id, target_business_id, target_type, target_title, target_body, coalesce(target_metadata, '{}'::jsonb))
  returning id into notification_id;
  return notification_id;
end;
$$;

revoke all on function private.push_wallet_notification(uuid, uuid, text, text, text, jsonb) from public, anon, authenticated;

create or replace function private.notify_loyalty_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare business_name text;
begin
  if new.event_type not in ('purchase', 'visit') then return new; end if;
  select b.name into business_name from public.businesses b where b.id = new.business_id;
  perform private.push_wallet_notification(
    new.wallet_id,
    new.business_id,
    new.event_type,
    case when new.event_type = 'purchase' then 'Compra registrada' else 'Visita registrada' end,
    case
      when new.event_type = 'purchase' and new.amount_cents > 0 then coalesce(business_name, 'El comercio') || ' ha registrado una compra de ' || to_char(new.amount_cents / 100.0, 'FM999999990D00') || ' €.'
      when new.event_type = 'purchase' then coalesce(business_name, 'El comercio') || ' ha registrado una compra en tu carnet.'
      else coalesce(business_name, 'El comercio') || ' ha sumado una visita a tu carnet.'
    end,
    jsonb_build_object('loyalty_event_id', new.id, 'amount_cents', new.amount_cents)
  );
  return new;
end;
$$;

revoke all on function private.notify_loyalty_event() from public, anon, authenticated;
drop trigger if exists notify_wallet_loyalty_event on public.loyalty_events;
create trigger notify_wallet_loyalty_event
after insert on public.loyalty_events
for each row execute function private.notify_loyalty_event();

create or replace function private.notify_redemption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare target_wallet_id uuid; business_name text; product_name text; remaining numeric;
begin
  select p.wallet_id, p.remaining_units, lp.name, b.name
  into target_wallet_id, remaining, product_name, business_name
  from public.passes p
  join public.loyalty_products lp on lp.id = p.loyalty_product_id
  join public.businesses b on b.id = p.business_id
  where p.id = new.pass_id;
  if target_wallet_id is null then return new; end if;
  perform private.push_wallet_notification(
    target_wallet_id,
    new.business_id,
    'redemption',
    'Bono utilizado',
    coalesce(product_name, 'Tu bono') || ': se han consumido ' || trim(to_char(new.units, 'FM999999990D##')) || '. Te quedan ' || trim(to_char(coalesce(remaining, 0), 'FM999999990D##')) || '.',
    jsonb_build_object('redemption_id', new.id, 'pass_id', new.pass_id, 'units', new.units, 'remaining_units', remaining, 'business_name', business_name)
  );
  return new;
end;
$$;

revoke all on function private.notify_redemption() from public, anon, authenticated;
drop trigger if exists notify_wallet_redemption on public.redemptions;
create trigger notify_wallet_redemption
after insert on public.redemptions
for each row execute function private.notify_redemption();

create or replace function private.notify_automation_reward()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare rule_name text; reward_name text; business_id uuid;
begin
  if new.pass_id is null or old.pass_id is not null then return new; end if;
  select ar.name, ar.business_id, lp.name into rule_name, business_id, reward_name
  from public.loyalty_automation_rules ar
  join public.loyalty_products lp on lp.id = ar.reward_product_id
  where ar.id = new.rule_id;
  perform private.push_wallet_notification(
    new.wallet_id,
    business_id,
    'reward',
    '🎁 Premio desbloqueado',
    'Has completado “' || coalesce(rule_name, 'tu objetivo') || '”. ' || coalesce(reward_name, 'Tu premio') || ' ya está en tu wallet.',
    jsonb_build_object('rule_id', new.rule_id, 'pass_id', new.pass_id, 'milestone', new.milestone)
  );
  return new;
end;
$$;

revoke all on function private.notify_automation_reward() from public, anon, authenticated;
drop trigger if exists notify_wallet_automation_reward on public.loyalty_automation_grants;
create trigger notify_wallet_automation_reward
after update of pass_id on public.loyalty_automation_grants
for each row execute function private.notify_automation_reward();

create or replace function private.customer_segment_for_wallet(target_business_id uuid, target_wallet_id uuid)
returns text
language sql
security definer
stable
set search_path = ''
as $$
  with m as (
    select lm.joined_at, lm.last_activity_at
    from public.loyalty_memberships lm
    where lm.business_id = target_business_id and lm.wallet_id = target_wallet_id
  ), es as (
    select
      count(*) filter (where e.event_type = 'purchase')::bigint as purchases,
      count(*) filter (where e.event_type in ('purchase', 'visit'))::bigint as visits,
      count(*) filter (where e.event_type = 'redemption')::bigint as redemptions
    from public.loyalty_events e
    where e.business_id = target_business_id and e.wallet_id = target_wallet_id
  ), rs as (
    select count(*)::bigint as rewards
    from public.loyalty_automation_grants g
    join public.loyalty_automation_rules ar on ar.id = g.rule_id
    where ar.business_id = target_business_id and g.wallet_id = target_wallet_id and g.pass_id is not null
  )
  select case
    when not exists (select 1 from m) then 'unknown'
    when (coalesce(es.purchases,0) + coalesce(es.visits,0) + coalesce(es.redemptions,0)) > 0
      and m.last_activity_at < now() - interval '45 days' then 'at_risk'
    when coalesce(es.purchases,0) >= 5 or coalesce(es.visits,0) >= 8 or coalesce(es.redemptions,0) >= 5 or coalesce(rs.rewards,0) >= 2 then 'loyal'
    when m.joined_at >= now() - interval '30 days' then 'new'
    else 'active'
  end
  from m cross join es cross join rs;
$$;

revoke all on function private.customer_segment_for_wallet(uuid, uuid) from public, anon, authenticated;

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
  select * into event_row from public.loyalty_events e where e.id = target_event_id;
  if event_row.id is null then return 0; end if;
  for rule_row in
    select ar.* from public.loyalty_automation_rules ar
    where ar.business_id = event_row.business_id and ar.active = true and event_row.occurred_at >= ar.created_at
    order by ar.created_at, ar.id
  loop
    perform pg_advisory_xact_lock(hashtext(rule_row.id::text || ':' || event_row.wallet_id::text));
    metric_value := 0;
    if rule_row.trigger_type = 'purchase_count' then
      select count(*)::bigint into metric_value
      from public.loyalty_events e
      where e.business_id = event_row.business_id and e.wallet_id = event_row.wallet_id
        and e.event_type = 'purchase' and e.occurred_at >= rule_row.created_at
        and e.amount_cents >= rule_row.minimum_purchase_cents;
    elsif rule_row.trigger_type = 'visit_count' then
      select count(*)::bigint into metric_value
      from public.loyalty_events e
      where e.business_id = event_row.business_id and e.wallet_id = event_row.wallet_id
        and e.event_type in ('purchase', 'visit') and e.occurred_at >= rule_row.created_at;
    elsif rule_row.trigger_type = 'spend_total' then
      select coalesce(sum(e.amount_cents),0)::bigint into metric_value
      from public.loyalty_events e
      where e.business_id = event_row.business_id and e.wallet_id = event_row.wallet_id
        and e.event_type = 'purchase' and e.occurred_at >= rule_row.created_at
        and e.amount_cents >= rule_row.minimum_purchase_cents;
    elsif rule_row.trigger_type = 'product_redemption_count' then
      select count(*)::bigint into metric_value
      from public.loyalty_events e
      where e.business_id = event_row.business_id and e.wallet_id = event_row.wallet_id
        and e.event_type = 'redemption' and e.product_id = rule_row.trigger_product_id
        and e.occurred_at >= rule_row.created_at;
    end if;
    eligible_milestones := floor(metric_value::numeric / rule_row.threshold_value::numeric)::integer;
    if not rule_row.repeatable then eligible_milestones := least(eligible_milestones,1); end if;
    if rule_row.max_rewards_per_wallet is not null then eligible_milestones := least(eligible_milestones,rule_row.max_rewards_per_wallet); end if;
    eligible_milestones := least(eligible_milestones,100);
    if eligible_milestones < 1 then continue; end if;
    for milestone_no in 1..eligible_milestones loop
      if exists (select 1 from public.loyalty_automation_grants g where g.rule_id=rule_row.id and g.wallet_id=event_row.wallet_id and g.milestone=milestone_no) then continue; end if;
      begin
        select * into reward_product from public.loyalty_products lp
        where lp.id=rule_row.reward_product_id and lp.business_id=event_row.business_id and lp.active=true;
        if reward_product.id is null then continue; end if;
        grant_id := null;
        insert into public.loyalty_automation_grants(rule_id,wallet_id,milestone)
        values(rule_row.id,event_row.wallet_id,milestone_no)
        on conflict(rule_id,wallet_id,milestone) do nothing returning id into grant_id;
        if grant_id is null then continue; end if;
        insert into public.passes(wallet_id,loyalty_product_id,business_id,status,initial_units,remaining_units,expires_at,issued_price_cents,issued_currency)
        values(event_row.wallet_id,reward_product.id,event_row.business_id,'active'::public.pass_status,reward_product.initial_units,reward_product.initial_units,
          case when reward_product.validity_days is null then null else now()+make_interval(days=>reward_product.validity_days) end,0,reward_product.currency)
        returning * into reward_pass;
        update public.loyalty_automation_grants set pass_id=reward_pass.id where id=grant_id;
        insert into public.business_audit_events(business_id,actor_id,event_type,pass_id,product_id,metadata)
        values(event_row.business_id,event_row.recorded_by,'reward_issued',reward_pass.id,reward_product.id,
          jsonb_build_object('automation_rule_id',rule_row.id,'automation_rule_name',rule_row.name,'trigger_type',rule_row.trigger_type,'milestone',milestone_no,'source_event_id',event_row.id,'minimum_purchase_cents',rule_row.minimum_purchase_cents));
        issued_count := issued_count + 1;
      exception when others then null;
      end;
    end loop;
  end loop;
  update public.loyalty_events set rewards_issued=greatest(rewards_issued,issued_count) where id=event_row.id;
  return issued_count;
end;
$$;

revoke all on function private.process_loyalty_event_automations(uuid) from public, anon, authenticated;

create or replace function public.create_loyalty_automation_rule_v2(
  target_business_id uuid,
  rule_name text,
  rule_trigger_type text,
  rule_threshold_value bigint,
  target_trigger_product_id uuid,
  target_reward_product_id uuid,
  rule_repeatable boolean,
  reward_limit integer,
  rule_minimum_purchase_cents bigint
)
returns public.loyalty_automation_rules
language plpgsql
security definer
set search_path = ''
as $$
declare trigger_business_id uuid; reward_business_id uuid; result public.loyalty_automation_rules;
begin
  if auth.uid() is null or not private.is_business_manager(target_business_id) then raise exception 'not_authorized'; end if;
  if char_length(trim(coalesce(rule_name,''))) < 2 or char_length(trim(rule_name)) > 120 then raise exception 'invalid_rule_name'; end if;
  if rule_trigger_type not in ('purchase_count','visit_count','spend_total','product_redemption_count') then raise exception 'invalid_trigger_type'; end if;
  if rule_threshold_value < 1 or rule_threshold_value > 100000000 then raise exception 'invalid_threshold'; end if;
  if rule_trigger_type = 'spend_total' and rule_threshold_value < 100 then raise exception 'spend_threshold_too_low'; end if;
  if coalesce(rule_minimum_purchase_cents,0) < 0 or coalesce(rule_minimum_purchase_cents,0) > 100000000 then raise exception 'invalid_minimum_purchase'; end if;
  if rule_trigger_type not in ('purchase_count','spend_total') and coalesce(rule_minimum_purchase_cents,0) <> 0 then raise exception 'minimum_purchase_not_allowed'; end if;
  if reward_limit is not null and (reward_limit < 1 or reward_limit > 100) then raise exception 'invalid_reward_limit'; end if;
  select lp.business_id into reward_business_id from public.loyalty_products lp where lp.id = target_reward_product_id and lp.active = true;
  if reward_business_id is distinct from target_business_id then raise exception 'invalid_reward_product'; end if;
  if rule_trigger_type = 'product_redemption_count' then
    select lp.business_id into trigger_business_id from public.loyalty_products lp where lp.id = target_trigger_product_id;
    if trigger_business_id is distinct from target_business_id then raise exception 'invalid_trigger_product'; end if;
  elsif target_trigger_product_id is not null then raise exception 'trigger_product_not_allowed'; end if;
  insert into public.loyalty_automation_rules (business_id,name,trigger_type,threshold_value,trigger_product_id,reward_product_id,repeatable,max_rewards_per_wallet,active,created_by,minimum_purchase_cents)
  values (target_business_id,trim(rule_name),rule_trigger_type,rule_threshold_value,case when rule_trigger_type='product_redemption_count' then target_trigger_product_id else null end,target_reward_product_id,coalesce(rule_repeatable,true),reward_limit,true,auth.uid(),coalesce(rule_minimum_purchase_cents,0)) returning * into result;
  insert into public.business_audit_events (business_id,actor_id,event_type,product_id,metadata)
  values (target_business_id,auth.uid(),'automation_rule_created',target_reward_product_id,
    jsonb_build_object('rule_id',result.id,'name',result.name,'trigger_type',result.trigger_type,'threshold_value',result.threshold_value,'repeatable',result.repeatable,'minimum_purchase_cents',result.minimum_purchase_cents));
  return result;
end;
$$;

revoke all on function public.create_loyalty_automation_rule_v2(uuid,text,text,bigint,uuid,uuid,boolean,integer,bigint) from public, anon;
grant execute on function public.create_loyalty_automation_rule_v2(uuid,text,text,bigint,uuid,uuid,boolean,integer,bigint) to authenticated;

create or replace function public.business_loyalty_automation_rules_v2(target_business_id uuid)
returns table (
  rule_id uuid, rule_name text, trigger_type text, threshold_value bigint,
  minimum_purchase_cents bigint, trigger_product_id uuid, trigger_product_name text,
  reward_product_id uuid, reward_product_name text, repeatable boolean,
  max_rewards_per_wallet integer, active boolean, rewards_issued bigint,
  customers_rewarded bigint, created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_business_member(target_business_id) then raise exception 'not_authorized'; end if;
  return query
  select ar.id,ar.name,ar.trigger_type,ar.threshold_value,ar.minimum_purchase_cents,ar.trigger_product_id,tp.name,
    ar.reward_product_id,rp.name,ar.repeatable,ar.max_rewards_per_wallet,ar.active,
    count(g.id)::bigint,count(distinct g.wallet_id)::bigint,ar.created_at
  from public.loyalty_automation_rules ar
  left join public.loyalty_products tp on tp.id = ar.trigger_product_id
  join public.loyalty_products rp on rp.id = ar.reward_product_id
  left join public.loyalty_automation_grants g on g.rule_id = ar.id
  where ar.business_id = target_business_id
  group by ar.id,tp.name,rp.name order by ar.created_at desc;
end;
$$;

revoke all on function public.business_loyalty_automation_rules_v2(uuid) from public, anon;
grant execute on function public.business_loyalty_automation_rules_v2(uuid) to authenticated;

create or replace function public.wallet_memberships()
returns table (
  membership_id uuid, business_id uuid, business_name text, business_logo_url text,
  business_accent_color text, joined_at timestamptz, last_activity_at timestamptz,
  purchases bigint, visits bigint, spend_cents bigint, rewards_earned bigint, segment text
)
language plpgsql
security definer
set search_path = ''
as $$
declare target_wallet_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select w.id into target_wallet_id from public.wallets w where w.user_id = auth.uid();
  if target_wallet_id is null then raise exception 'wallet_not_found'; end if;
  return query
  select lm.id,lm.business_id,b.name,b.logo_url,b.accent_color,lm.joined_at,lm.last_activity_at,
    count(e.id) filter(where e.event_type='purchase')::bigint,
    count(e.id) filter(where e.event_type in('purchase','visit'))::bigint,
    coalesce(sum(e.amount_cents) filter(where e.event_type='purchase'),0)::bigint,
    (select count(*)::bigint from public.loyalty_automation_grants g join public.loyalty_automation_rules ar on ar.id=g.rule_id where g.wallet_id=target_wallet_id and ar.business_id=lm.business_id and g.pass_id is not null),
    private.customer_segment_for_wallet(lm.business_id,target_wallet_id)
  from public.loyalty_memberships lm
  join public.businesses b on b.id=lm.business_id and b.status='active'
  left join public.loyalty_events e on e.business_id=lm.business_id and e.wallet_id=lm.wallet_id
  where lm.wallet_id=target_wallet_id and lm.status='active'
  group by lm.id,b.id
  order by lm.last_activity_at desc;
end;
$$;

revoke all on function public.wallet_memberships() from public, anon;
grant execute on function public.wallet_memberships() to authenticated;

create or replace function public.wallet_membership_rule_progress()
returns table (
  rule_id uuid, business_id uuid, rule_name text, trigger_type text, threshold_value bigint,
  minimum_purchase_cents bigint, trigger_product_name text, reward_product_name text,
  metric_value bigint, progress_value bigint, remaining_value bigint, rewards_earned bigint,
  completed boolean, repeatable boolean, max_rewards_per_wallet integer, created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare target_wallet_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select w.id into target_wallet_id from public.wallets w where w.user_id=auth.uid();
  if target_wallet_id is null then raise exception 'wallet_not_found'; end if;
  return query
  with metrics as (
    select ar.*,
      tp.name as trigger_product_name,
      rp.name as reward_product_name,
      case
        when ar.trigger_type='purchase_count' then (select count(*)::bigint from public.loyalty_events e where e.business_id=ar.business_id and e.wallet_id=target_wallet_id and e.event_type='purchase' and e.occurred_at>=ar.created_at and e.amount_cents>=ar.minimum_purchase_cents)
        when ar.trigger_type='visit_count' then (select count(*)::bigint from public.loyalty_events e where e.business_id=ar.business_id and e.wallet_id=target_wallet_id and e.event_type in('purchase','visit') and e.occurred_at>=ar.created_at)
        when ar.trigger_type='spend_total' then (select coalesce(sum(e.amount_cents),0)::bigint from public.loyalty_events e where e.business_id=ar.business_id and e.wallet_id=target_wallet_id and e.event_type='purchase' and e.occurred_at>=ar.created_at and e.amount_cents>=ar.minimum_purchase_cents)
        when ar.trigger_type='product_redemption_count' then (select count(*)::bigint from public.loyalty_events e where e.business_id=ar.business_id and e.wallet_id=target_wallet_id and e.event_type='redemption' and e.product_id=ar.trigger_product_id and e.occurred_at>=ar.created_at)
        else 0::bigint end as metric_value,
      (select count(*)::bigint from public.loyalty_automation_grants g where g.rule_id=ar.id and g.wallet_id=target_wallet_id and g.pass_id is not null) as rewards_earned
    from public.loyalty_automation_rules ar
    join public.loyalty_memberships lm on lm.business_id=ar.business_id and lm.wallet_id=target_wallet_id and lm.status='active'
    left join public.loyalty_products tp on tp.id=ar.trigger_product_id
    join public.loyalty_products rp on rp.id=ar.reward_product_id
    where ar.active=true
  ), calc as (
    select m.*,
      ((m.max_rewards_per_wallet is not null and m.rewards_earned>=m.max_rewards_per_wallet) or (not m.repeatable and m.rewards_earned>=1)) as is_completed
    from metrics m
  ), prog as (
    select c.*,
      case when c.is_completed then c.threshold_value
        when c.metric_value >= (c.rewards_earned+1)*c.threshold_value then c.threshold_value
        else greatest(0::bigint,c.metric_value-(c.rewards_earned*c.threshold_value)) end as cycle_progress
    from calc c
  )
  select p.id,p.business_id,p.name,p.trigger_type,p.threshold_value,p.minimum_purchase_cents,p.trigger_product_name,p.reward_product_name,
    p.metric_value,p.cycle_progress,case when p.is_completed then 0::bigint else greatest(0::bigint,p.threshold_value-p.cycle_progress) end,
    p.rewards_earned,p.is_completed,p.repeatable,p.max_rewards_per_wallet,p.created_at
  from prog p order by p.business_id,p.created_at;
end;
$$;

revoke all on function public.wallet_membership_rule_progress() from public, anon;
grant execute on function public.wallet_membership_rule_progress() to authenticated;

create or replace function public.wallet_notifications_feed(target_limit integer default 50)
returns table (
  notification_id uuid, business_id uuid, business_name text, notification_type text,
  title text, body text, metadata jsonb, read_at timestamptz, created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare target_wallet_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if target_limit < 1 or target_limit > 100 then raise exception 'invalid_limit'; end if;
  select w.id into target_wallet_id from public.wallets w where w.user_id=auth.uid();
  if target_wallet_id is null then raise exception 'wallet_not_found'; end if;
  return query
  select n.id,n.business_id,b.name,n.notification_type,n.title,n.body,n.metadata,n.read_at,n.created_at
  from public.wallet_notifications n
  left join public.businesses b on b.id=n.business_id
  where n.wallet_id=target_wallet_id
  order by n.created_at desc limit target_limit;
end;
$$;

create or replace function public.mark_wallet_notification_read(target_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare target_wallet_id uuid; changed integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select w.id into target_wallet_id from public.wallets w where w.user_id=auth.uid();
  update public.wallet_notifications set read_at=coalesce(read_at,now()) where id=target_notification_id and wallet_id=target_wallet_id;
  get diagnostics changed = row_count;
  return changed>0;
end;
$$;

create or replace function public.mark_all_wallet_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare target_wallet_id uuid; changed integer;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select w.id into target_wallet_id from public.wallets w where w.user_id=auth.uid();
  update public.wallet_notifications set read_at=now() where wallet_id=target_wallet_id and read_at is null;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

revoke all on function public.wallet_notifications_feed(integer) from public, anon;
revoke all on function public.mark_wallet_notification_read(uuid) from public, anon;
revoke all on function public.mark_all_wallet_notifications_read() from public, anon;
grant execute on function public.wallet_notifications_feed(integer) to authenticated;
grant execute on function public.mark_wallet_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_wallet_notifications_read() to authenticated;

create or replace function public.wallet_transaction_history(target_limit integer default 100)
returns table (
  transaction_id uuid, transaction_type text, business_id uuid, business_name text,
  product_id uuid, product_name text, amount_cents bigint, units numeric,
  balance_before numeric, balance_after numeric, occurred_at timestamptz, reference_code text
)
language plpgsql
security definer
set search_path = ''
as $$
declare target_wallet_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  if target_limit < 1 or target_limit > 200 then raise exception 'invalid_limit'; end if;
  select w.id into target_wallet_id from public.wallets w where w.user_id=auth.uid();
  if target_wallet_id is null then raise exception 'wallet_not_found'; end if;
  return query
  with redemption_rows as (
    select r.id,r.pass_id,p.business_id,b.name as business_name,p.loyalty_product_id,lp.name as product_name,r.units,r.created_at,
      p.initial_units - coalesce((select sum(r2.units) from public.redemptions r2 where r2.pass_id=r.pass_id and (r2.created_at<r.created_at or (r2.created_at=r.created_at and r2.id<=r.id))),0) as after_balance
    from public.redemptions r
    join public.passes p on p.id=r.pass_id and p.wallet_id=target_wallet_id
    join public.businesses b on b.id=p.business_id
    join public.loyalty_products lp on lp.id=p.loyalty_product_id
  ), feed as (
    select e.id as tx_id,e.event_type as tx_type,e.business_id,b.name as business_name,null::uuid as product_id,null::text as product_name,
      e.amount_cents,0::numeric as units,null::numeric as balance_before,null::numeric as balance_after,e.occurred_at
    from public.loyalty_events e join public.businesses b on b.id=e.business_id
    where e.wallet_id=target_wallet_id and e.event_type in('purchase','visit')
    union all
    select rr.id,'redemption',rr.business_id,rr.business_name,rr.loyalty_product_id,rr.product_name,0::bigint,rr.units,rr.after_balance+rr.units,rr.after_balance,rr.created_at from redemption_rows rr
    union all
    select p.id,'pass_issued',p.business_id,b.name,p.loyalty_product_id,lp.name,p.issued_price_cents::bigint,p.initial_units,0::numeric,p.initial_units,p.purchased_at
    from public.passes p join public.businesses b on b.id=p.business_id join public.loyalty_products lp on lp.id=p.loyalty_product_id
    where p.wallet_id=target_wallet_id
      and not exists(select 1 from public.loyalty_automation_grants g where g.pass_id=p.id)
      and not exists(select 1 from public.loyalty_campaign_claims cc where cc.pass_id=p.id)
    union all
    select g.id,'reward',ar.business_id,b.name,p.loyalty_product_id,lp.name,0::bigint,p.initial_units,0::numeric,p.initial_units,g.created_at
    from public.loyalty_automation_grants g join public.loyalty_automation_rules ar on ar.id=g.rule_id join public.passes p on p.id=g.pass_id
      join public.businesses b on b.id=ar.business_id join public.loyalty_products lp on lp.id=p.loyalty_product_id
    where g.wallet_id=target_wallet_id and g.pass_id is not null
    union all
    select cc.id,'campaign',c.business_id,b.name,p.loyalty_product_id,lp.name,0::bigint,p.initial_units,0::numeric,p.initial_units,cc.claimed_at
    from public.loyalty_campaign_claims cc join public.loyalty_campaigns c on c.id=cc.campaign_id join public.passes p on p.id=cc.pass_id
      join public.businesses b on b.id=c.business_id join public.loyalty_products lp on lp.id=p.loyalty_product_id
    where cc.wallet_id=target_wallet_id
  )
  select f.tx_id,f.tx_type,f.business_id,f.business_name,f.product_id,f.product_name,f.amount_cents,f.units,f.balance_before,f.balance_after,f.occurred_at,
    upper(substr(replace(f.tx_id::text,'-',''),1,8))
  from feed f order by f.occurred_at desc limit target_limit;
end;
$$;

revoke all on function public.wallet_transaction_history(integer) from public, anon;
grant execute on function public.wallet_transaction_history(integer) to authenticated;

create or replace function public.create_loyalty_campaign_v2(
  target_business_id uuid, target_product_id uuid, campaign_name text, campaign_message text,
  campaign_starts_at timestamptz, campaign_ends_at timestamptz, campaign_max_claims integer,
  campaign_target_segment text
)
returns public.loyalty_campaigns
language plpgsql
security definer
set search_path = ''
as $$
declare result public.loyalty_campaigns; product_business_id uuid; generated_code text;
begin
  if auth.uid() is null or not private.is_business_manager(target_business_id) then raise exception 'not_authorized'; end if;
  if char_length(trim(coalesce(campaign_name,'')))<2 or char_length(trim(campaign_name))>120 then raise exception 'invalid_campaign_name'; end if;
  if campaign_message is not null and char_length(campaign_message)>500 then raise exception 'invalid_campaign_message'; end if;
  if campaign_max_claims is not null and (campaign_max_claims<1 or campaign_max_claims>100000) then raise exception 'invalid_max_claims'; end if;
  if campaign_ends_at is not null and campaign_ends_at<=coalesce(campaign_starts_at,now()) then raise exception 'invalid_campaign_dates'; end if;
  if coalesce(campaign_target_segment,'all') not in ('all','new','active','loyal','at_risk') then raise exception 'invalid_campaign_segment'; end if;
  select lp.business_id into product_business_id from public.loyalty_products lp where lp.id=target_product_id and lp.active=true;
  if product_business_id is null or product_business_id<>target_business_id then raise exception 'invalid_campaign_product'; end if;
  generated_code:=replace(gen_random_uuid()::text,'-','');
  insert into public.loyalty_campaigns (business_id,product_id,name,message,share_code,starts_at,ends_at,max_claims,active,created_by,target_segment)
  values(target_business_id,target_product_id,trim(campaign_name),nullif(trim(coalesce(campaign_message,'')),''),generated_code,coalesce(campaign_starts_at,now()),campaign_ends_at,campaign_max_claims,true,auth.uid(),coalesce(campaign_target_segment,'all')) returning * into result;
  insert into public.business_audit_events (business_id,actor_id,event_type,product_id,metadata)
  values(target_business_id,auth.uid(),'campaign_created',target_product_id,jsonb_build_object('campaign_id',result.id,'name',result.name,'max_claims',result.max_claims,'target_segment',result.target_segment));
  return result;
end;
$$;

revoke all on function public.create_loyalty_campaign_v2(uuid,uuid,text,text,timestamptz,timestamptz,integer,text) from public, anon;
grant execute on function public.create_loyalty_campaign_v2(uuid,uuid,text,text,timestamptz,timestamptz,integer,text) to authenticated;

create or replace function public.business_loyalty_campaigns_v2(target_business_id uuid)
returns table (
  campaign_id uuid, campaign_name text, message text, share_code text, product_id uuid,
  product_name text, target_segment text, starts_at timestamptz, ends_at timestamptz,
  max_claims integer, claims bigint, active boolean, state text, created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_business_member(target_business_id) then raise exception 'not_authorized'; end if;
  return query select c.id,c.name,c.message,c.share_code,c.product_id,lp.name,c.target_segment,c.starts_at,c.ends_at,c.max_claims,count(cc.id)::bigint,c.active,
    case when not c.active then 'disabled' when c.starts_at>now() then 'upcoming' when c.ends_at is not null and c.ends_at<=now() then 'ended' when c.max_claims is not null and count(cc.id)>=c.max_claims then 'exhausted' else 'active' end,c.created_at
  from public.loyalty_campaigns c join public.loyalty_products lp on lp.id=c.product_id left join public.loyalty_campaign_claims cc on cc.campaign_id=c.id
  where c.business_id=target_business_id group by c.id,lp.name order by c.created_at desc;
end;
$$;

revoke all on function public.business_loyalty_campaigns_v2(uuid) from public, anon;
grant execute on function public.business_loyalty_campaigns_v2(uuid) to authenticated;

create or replace function public.claim_loyalty_campaign(campaign_code text)
returns table(pass_id uuid, product_name text, initial_units numeric, expires_at timestamptz, already_claimed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare campaign public.loyalty_campaigns; target_wallet_id uuid; product public.loyalty_products; existing_pass_id uuid; claim_count bigint; created_pass public.passes; current_segment text;
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  select * into campaign from public.loyalty_campaigns c where c.share_code=trim(campaign_code) for update;
  if campaign.id is null then raise exception 'campaign_not_found'; end if;
  select w.id into target_wallet_id from public.wallets w where w.user_id=auth.uid(); if target_wallet_id is null then raise exception 'wallet_not_found'; end if;
  perform pg_advisory_xact_lock(hashtext(campaign.id::text||':'||target_wallet_id::text));
  select cc.pass_id into existing_pass_id from public.loyalty_campaign_claims cc where cc.campaign_id=campaign.id and cc.wallet_id=target_wallet_id;
  if existing_pass_id is not null then return query select p.id,lp.name,p.initial_units,p.expires_at,true from public.passes p join public.loyalty_products lp on lp.id=p.loyalty_product_id where p.id=existing_pass_id; return; end if;
  if not campaign.active then raise exception 'campaign_disabled'; end if; if campaign.starts_at>now() then raise exception 'campaign_not_started'; end if; if campaign.ends_at is not null and campaign.ends_at<=now() then raise exception 'campaign_ended'; end if;
  if campaign.target_segment <> 'all' then
    current_segment := private.customer_segment_for_wallet(campaign.business_id,target_wallet_id);
    if current_segment is distinct from campaign.target_segment then raise exception 'campaign_not_eligible'; end if;
  end if;
  if campaign.max_claims is not null then select count(*) into claim_count from public.loyalty_campaign_claims cc where cc.campaign_id=campaign.id; if claim_count>=campaign.max_claims then raise exception 'campaign_exhausted'; end if; end if;
  select * into product from public.loyalty_products lp where lp.id=campaign.product_id and lp.active=true; if product.id is null then raise exception 'campaign_product_unavailable'; end if;
  insert into public.passes(wallet_id,loyalty_product_id,business_id,status,initial_units,remaining_units,expires_at,issued_price_cents,issued_currency)
  values(target_wallet_id,product.id,campaign.business_id,'active'::public.pass_status,product.initial_units,product.initial_units,case when product.validity_days is null then null else now()+make_interval(days=>product.validity_days) end,0,product.currency) returning * into created_pass;
  insert into public.loyalty_campaign_claims(campaign_id,wallet_id,pass_id) values(campaign.id,target_wallet_id,created_pass.id);
  insert into public.business_audit_events(business_id,actor_id,event_type,pass_id,product_id,metadata) values(campaign.business_id,auth.uid(),'campaign_claimed',created_pass.id,product.id,jsonb_build_object('campaign_id',campaign.id,'campaign_name',campaign.name,'target_segment',campaign.target_segment));
  perform private.push_wallet_notification(target_wallet_id,campaign.business_id,'campaign','Promoción añadida','Has añadido “'||campaign.name||'” a tu wallet.',jsonb_build_object('campaign_id',campaign.id,'pass_id',created_pass.id));
  return query select created_pass.id,product.name,created_pass.initial_units,created_pass.expires_at,false;
end;
$$;

revoke all on function public.claim_loyalty_campaign(text) from public, anon;
grant execute on function public.claim_loyalty_campaign(text) to authenticated;

create or replace function public.business_loyalty_opportunities(target_business_id uuid)
returns table (
  members_total bigint, recurrent_customers bigint, loyal_customers bigint, at_risk_customers bigint,
  new_7d bigint, near_reward_customers bigint, purchases_30d bigint, spend_30d_cents bigint, rewards_30d bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or not private.is_business_member(target_business_id) then raise exception 'not_authorized'; end if;
  return query
  with member_stats as (
    select lm.wallet_id,lm.joined_at,
      count(e.id) filter(where e.event_type='purchase')::bigint as purchases,
      count(e.id) filter(where e.event_type in('purchase','visit'))::bigint as visits,
      private.customer_segment_for_wallet(target_business_id,lm.wallet_id) as segment
    from public.loyalty_memberships lm left join public.loyalty_events e on e.wallet_id=lm.wallet_id and e.business_id=lm.business_id
    where lm.business_id=target_business_id and lm.status='active'
    group by lm.id
  ), rule_metrics as (
    select lm.wallet_id,ar.id as rule_id,ar.trigger_type,ar.threshold_value,ar.repeatable,ar.max_rewards_per_wallet,
      case
        when ar.trigger_type='purchase_count' then (select count(*)::bigint from public.loyalty_events e where e.business_id=target_business_id and e.wallet_id=lm.wallet_id and e.event_type='purchase' and e.occurred_at>=ar.created_at and e.amount_cents>=ar.minimum_purchase_cents)
        when ar.trigger_type='visit_count' then (select count(*)::bigint from public.loyalty_events e where e.business_id=target_business_id and e.wallet_id=lm.wallet_id and e.event_type in('purchase','visit') and e.occurred_at>=ar.created_at)
        when ar.trigger_type='spend_total' then (select coalesce(sum(e.amount_cents),0)::bigint from public.loyalty_events e where e.business_id=target_business_id and e.wallet_id=lm.wallet_id and e.event_type='purchase' and e.occurred_at>=ar.created_at and e.amount_cents>=ar.minimum_purchase_cents)
        when ar.trigger_type='product_redemption_count' then (select count(*)::bigint from public.loyalty_events e where e.business_id=target_business_id and e.wallet_id=lm.wallet_id and e.event_type='redemption' and e.product_id=ar.trigger_product_id and e.occurred_at>=ar.created_at)
        else 0::bigint end as metric_value,
      (select count(*)::bigint from public.loyalty_automation_grants g where g.rule_id=ar.id and g.wallet_id=lm.wallet_id and g.pass_id is not null) as rewards_earned
    from public.loyalty_memberships lm join public.loyalty_automation_rules ar on ar.business_id=lm.business_id and ar.active=true
    where lm.business_id=target_business_id and lm.status='active'
  ), near_wallets as (
    select distinct rm.wallet_id from rule_metrics rm
    where not ((rm.max_rewards_per_wallet is not null and rm.rewards_earned>=rm.max_rewards_per_wallet) or (not rm.repeatable and rm.rewards_earned>=1))
      and case when rm.trigger_type='spend_total'
        then greatest(0::bigint,rm.threshold_value-(rm.metric_value-rm.rewards_earned*rm.threshold_value)) <= greatest(100::bigint,ceil(rm.threshold_value*0.2)::bigint)
        else greatest(0::bigint,rm.threshold_value-(rm.metric_value-rm.rewards_earned*rm.threshold_value)) <= 1 end
  )
  select
    (select count(*)::bigint from member_stats),
    (select count(*)::bigint from member_stats where purchases>=2 or visits>=2),
    (select count(*)::bigint from member_stats where segment='loyal'),
    (select count(*)::bigint from member_stats where segment='at_risk'),
    (select count(*)::bigint from member_stats where joined_at>=now()-interval '7 days'),
    (select count(*)::bigint from near_wallets),
    (select count(*)::bigint from public.loyalty_events e where e.business_id=target_business_id and e.event_type='purchase' and e.occurred_at>=now()-interval '30 days'),
    (select coalesce(sum(e.amount_cents),0)::bigint from public.loyalty_events e where e.business_id=target_business_id and e.event_type='purchase' and e.occurred_at>=now()-interval '30 days'),
    (select count(*)::bigint from public.loyalty_automation_grants g join public.loyalty_automation_rules ar on ar.id=g.rule_id where ar.business_id=target_business_id and g.pass_id is not null and g.created_at>=now()-interval '30 days');
end;
$$;

revoke all on function public.business_loyalty_opportunities(uuid) from public, anon;
grant execute on function public.business_loyalty_opportunities(uuid) to authenticated;
