-- Customer-facing progress towards automatic rewards. The RPC only reads the
-- signed-in user's wallet and exposes commercial rule data, never another user.

create or replace function public.wallet_reward_progress()
returns table (
  rule_id uuid,
  business_id uuid,
  business_name text,
  business_logo_url text,
  business_accent_color text,
  rule_name text,
  trigger_product_name text,
  reward_product_name text,
  every_n_redemptions integer,
  qualifying_redemptions bigint,
  rewards_earned bigint,
  progress_in_cycle integer,
  next_reward_in integer,
  reward_pending boolean,
  completed boolean,
  max_rewards_per_wallet integer
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
  with stats as (
    select
      r.id as rule_id,
      r.business_id,
      b.name as business_name,
      b.logo_url as business_logo_url,
      b.accent_color as business_accent_color,
      r.name as rule_name,
      tp.name as trigger_product_name,
      rp.name as reward_product_name,
      r.every_n_redemptions,
      r.max_rewards_per_wallet,
      coalesce(redemption_stats.redemptions, 0)::bigint as qualifying_redemptions,
      coalesce(grant_stats.grants, 0)::bigint as rewards_earned
    from public.loyalty_reward_rules r
    join public.businesses b
      on b.id = r.business_id and b.status = 'active'
    join public.loyalty_products tp
      on tp.id = r.trigger_product_id
    join public.loyalty_products rp
      on rp.id = r.reward_product_id and rp.active = true
    left join lateral (
      select count(*)::bigint as redemptions
      from public.redemptions rd
      join public.passes p on p.id = rd.pass_id
      where rd.business_id = r.business_id
        and rd.created_at >= r.created_at
        and p.wallet_id = target_wallet_id
        and p.loyalty_product_id = r.trigger_product_id
        and not exists (select 1 from public.loyalty_campaign_claims cc where cc.pass_id = p.id)
        and not exists (select 1 from public.loyalty_reward_grants rg where rg.pass_id = p.id)
    ) redemption_stats on true
    left join lateral (
      select count(*)::bigint as grants
      from public.loyalty_reward_grants g
      where g.rule_id = r.id
        and g.wallet_id = target_wallet_id
        and g.pass_id is not null
    ) grant_stats on true
    where r.active = true
      and exists (
        select 1
        from public.passes p
        where p.wallet_id = target_wallet_id
          and p.business_id = r.business_id
          and p.loyalty_product_id = r.trigger_product_id
      )
  ), computed as (
    select
      s.*,
      least(
        floor(s.qualifying_redemptions::numeric / s.every_n_redemptions)::integer,
        coalesce(s.max_rewards_per_wallet, 2147483647)
      ) as eligible_milestones
    from stats s
  )
  select
    c.rule_id,
    c.business_id,
    c.business_name,
    c.business_logo_url,
    c.business_accent_color,
    c.rule_name,
    c.trigger_product_name,
    c.reward_product_name,
    c.every_n_redemptions,
    c.qualifying_redemptions,
    c.rewards_earned,
    case
      when c.rewards_earned < c.eligible_milestones then c.every_n_redemptions
      else mod(c.qualifying_redemptions, c.every_n_redemptions)::integer
    end as progress_in_cycle,
    case
      when c.max_rewards_per_wallet is not null and c.rewards_earned >= c.max_rewards_per_wallet then 0
      when c.rewards_earned < c.eligible_milestones then 0
      else c.every_n_redemptions - mod(c.qualifying_redemptions, c.every_n_redemptions)::integer
    end as next_reward_in,
    c.rewards_earned < c.eligible_milestones as reward_pending,
    c.max_rewards_per_wallet is not null and c.rewards_earned >= c.max_rewards_per_wallet as completed,
    c.max_rewards_per_wallet
  from computed c
  order by
    (c.rewards_earned < c.eligible_milestones) desc,
    c.business_name,
    c.rule_name;
end;
$$;

revoke all on function public.wallet_reward_progress() from public, anon;
grant execute on function public.wallet_reward_progress() to authenticated;
