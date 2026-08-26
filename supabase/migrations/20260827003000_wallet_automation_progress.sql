-- Customer-facing progress for the generalized loyalty automation engine.

create or replace function public.wallet_loyalty_progress()
returns table (
  rule_id uuid,
  business_id uuid,
  business_name text,
  business_logo_url text,
  business_accent_color text,
  rule_name text,
  trigger_type text,
  threshold_value bigint,
  trigger_product_name text,
  reward_product_name text,
  metric_value bigint,
  progress_value bigint,
  remaining_value bigint,
  rewards_earned bigint,
  reward_pending boolean,
  completed boolean,
  repeatable boolean,
  max_rewards_per_wallet integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_wallet_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication_required';
  end if;

  select w.id into target_wallet_id
  from public.wallets w
  where w.user_id = auth.uid();

  if target_wallet_id is null then
    raise exception 'wallet_not_found';
  end if;

  return query
  with related_businesses as (
    select distinct p.business_id
    from public.passes p
    where p.wallet_id = target_wallet_id
    union
    select distinct e.business_id
    from public.loyalty_events e
    where e.wallet_id = target_wallet_id
  ), rule_metrics as (
    select
      ar.id as rule_id,
      ar.business_id,
      b.name as business_name,
      b.logo_url as business_logo_url,
      b.accent_color as business_accent_color,
      ar.name as rule_name,
      ar.trigger_type,
      ar.threshold_value,
      trigger_product.name as trigger_product_name,
      reward_product.name as reward_product_name,
      ar.repeatable,
      ar.max_rewards_per_wallet,
      ar.created_at,
      case
        when ar.trigger_type = 'purchase_count' then (
          select count(*)::bigint
          from public.loyalty_events e
          where e.business_id = ar.business_id
            and e.wallet_id = target_wallet_id
            and e.event_type = 'purchase'
            and e.occurred_at >= ar.created_at
        )
        when ar.trigger_type = 'visit_count' then (
          select count(*)::bigint
          from public.loyalty_events e
          where e.business_id = ar.business_id
            and e.wallet_id = target_wallet_id
            and e.event_type in ('purchase', 'visit')
            and e.occurred_at >= ar.created_at
        )
        when ar.trigger_type = 'spend_total' then (
          select coalesce(sum(e.amount_cents), 0)::bigint
          from public.loyalty_events e
          where e.business_id = ar.business_id
            and e.wallet_id = target_wallet_id
            and e.event_type = 'purchase'
            and e.occurred_at >= ar.created_at
        )
        when ar.trigger_type = 'product_redemption_count' then (
          select count(*)::bigint
          from public.loyalty_events e
          where e.business_id = ar.business_id
            and e.wallet_id = target_wallet_id
            and e.event_type = 'redemption'
            and e.product_id = ar.trigger_product_id
            and e.occurred_at >= ar.created_at
        )
        else 0::bigint
      end as metric_value,
      (
        select count(*)::bigint
        from public.loyalty_automation_grants g
        where g.rule_id = ar.id
          and g.wallet_id = target_wallet_id
          and g.pass_id is not null
      ) as rewards_earned
    from public.loyalty_automation_rules ar
    join related_businesses rb on rb.business_id = ar.business_id
    join public.businesses b on b.id = ar.business_id
    left join public.loyalty_products trigger_product on trigger_product.id = ar.trigger_product_id
    join public.loyalty_products reward_product on reward_product.id = ar.reward_product_id
    where ar.active = true
      and b.status = 'active'
  ), calculated as (
    select
      rm.*,
      (
        (rm.max_rewards_per_wallet is not null and rm.rewards_earned >= rm.max_rewards_per_wallet)
        or (not rm.repeatable and rm.rewards_earned >= 1)
      ) as is_completed
    from rule_metrics rm
  ), progress as (
    select
      c.*,
      case
        when c.is_completed then c.threshold_value
        when c.metric_value >= (c.rewards_earned + 1) * c.threshold_value then c.threshold_value
        else greatest(0::bigint, c.metric_value - (c.rewards_earned * c.threshold_value))
      end as cycle_progress
    from calculated c
  )
  select
    p.rule_id,
    p.business_id,
    p.business_name,
    p.business_logo_url,
    p.business_accent_color,
    p.rule_name,
    p.trigger_type,
    p.threshold_value,
    p.trigger_product_name,
    p.reward_product_name,
    p.metric_value,
    p.cycle_progress,
    case when p.is_completed then 0::bigint else greatest(0::bigint, p.threshold_value - p.cycle_progress) end,
    p.rewards_earned,
    (not p.is_completed and p.metric_value >= (p.rewards_earned + 1) * p.threshold_value),
    p.is_completed,
    p.repeatable,
    p.max_rewards_per_wallet,
    p.created_at
  from progress p
  order by
    case when not p.is_completed and p.metric_value >= (p.rewards_earned + 1) * p.threshold_value then 0 else 1 end,
    p.is_completed,
    p.created_at desc;
end;
$$;

revoke all on function public.wallet_loyalty_progress() from public, anon;
grant execute on function public.wallet_loyalty_progress() to authenticated;
