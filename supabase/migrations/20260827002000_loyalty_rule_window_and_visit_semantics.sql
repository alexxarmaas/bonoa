-- Automation rules start earning from their creation time instead of granting retroactively.
-- A purchase is also a customer visit; explicit visit events cover visits without a purchase.

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
      and event_row.occurred_at >= ar.created_at
    order by ar.created_at, ar.id
  loop
    metric_value := 0;

    if rule_row.trigger_type = 'purchase_count' then
      select count(*)::bigint into metric_value
      from public.loyalty_events e
      where e.business_id = event_row.business_id
        and e.wallet_id = event_row.wallet_id
        and e.event_type = 'purchase'
        and e.occurred_at >= rule_row.created_at;
    elsif rule_row.trigger_type = 'visit_count' then
      select count(*)::bigint into metric_value
      from public.loyalty_events e
      where e.business_id = event_row.business_id
        and e.wallet_id = event_row.wallet_id
        and e.event_type in ('purchase', 'visit')
        and e.occurred_at >= rule_row.created_at;
    elsif rule_row.trigger_type = 'spend_total' then
      select coalesce(sum(e.amount_cents), 0)::bigint into metric_value
      from public.loyalty_events e
      where e.business_id = event_row.business_id
        and e.wallet_id = event_row.wallet_id
        and e.event_type = 'purchase'
        and e.occurred_at >= rule_row.created_at;
    elsif rule_row.trigger_type = 'product_redemption_count' then
      select count(*)::bigint into metric_value
      from public.loyalty_events e
      where e.business_id = event_row.business_id
        and e.wallet_id = event_row.wallet_id
        and e.event_type = 'redemption'
        and e.product_id = rule_row.trigger_product_id
        and e.occurred_at >= rule_row.created_at;
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
          wallet_id, loyalty_product_id, business_id, status,
          initial_units, remaining_units, expires_at, issued_price_cents, issued_currency
        ) values (
          event_row.wallet_id, reward_product.id, event_row.business_id, 'active'::public.pass_status,
          reward_product.initial_units, reward_product.initial_units,
          case when reward_product.validity_days is null then null else now() + make_interval(days => reward_product.validity_days) end,
          0, reward_product.currency
        ) returning * into reward_pass;

        update public.loyalty_automation_grants set pass_id = reward_pass.id where id = grant_id;

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
      count(*) filter (where e.event_type in ('purchase', 'visit'))::bigint as visits,
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
      case when ps.first_pass is null then es.first_event when es.first_event is null then ps.first_pass else least(ps.first_pass, es.first_event) end as first_seen,
      case when ps.last_pass_activity is null then es.last_event when es.last_event is null then ps.last_pass_activity else greatest(ps.last_pass_activity, es.last_event) end as last_activity,
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
    c.first_seen, c.last_activity, c.passes_issued, c.active_passes, c.redemptions, c.purchases, c.visits,
    c.spend_cents, c.rewards_earned, c.issued_value_cents,
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
    count(*) filter (where e.event_type in ('purchase', 'visit') and e.occurred_at >= now() - interval '30 days')::bigint,
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

revoke all on function public.business_customer_loyalty_snapshot(uuid) from public, anon;
revoke all on function public.business_loyalty_event_summary(uuid) from public, anon;
grant execute on function public.business_customer_loyalty_snapshot(uuid) to authenticated;
grant execute on function public.business_loyalty_event_summary(uuid) to authenticated;
