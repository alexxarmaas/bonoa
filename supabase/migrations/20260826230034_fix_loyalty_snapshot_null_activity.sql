-- Keep customer snapshots valid when a wallet only has loyalty events or only has passes.
-- This mirrors the null-safe function currently running in Supabase.

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
    where ar.business_id = target_business_id
      and g.pass_id is not null
    group by g.wallet_id
  ), wallets_in_business as (
    select wallet_id from pass_stats
    union
    select wallet_id from event_stats
  ), combined as (
    select
      wb.wallet_id,
      case
        when ps.first_pass is null then es.first_event
        when es.first_event is null then ps.first_pass
        else least(ps.first_pass, es.first_event)
      end as first_seen,
      case
        when ps.last_pass_activity is null then es.last_event
        when es.last_event is null then ps.last_pass_activity
        else greatest(ps.last_pass_activity, es.last_event)
      end as last_activity,
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

revoke all on function public.business_customer_loyalty_snapshot(uuid) from public, anon;
grant execute on function public.business_customer_loyalty_snapshot(uuid) to authenticated;
