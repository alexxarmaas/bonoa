-- Reward rules start counting when they are created and promotional/reward
-- passes never recursively generate further rewards.

create or replace function private.apply_loyalty_reward_after_redemption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_wallet_id uuid;
  target_trigger_product_id uuid;
  redemption_count bigint;
  eligible_milestones integer;
  candidate_milestone integer;
  rule_record record;
  reward_product public.loyalty_products;
  grant_id uuid;
  reward_pass_id uuid;
begin
  select p.wallet_id, p.loyalty_product_id
    into target_wallet_id, target_trigger_product_id
  from public.passes p
  where p.id = new.pass_id;

  if target_wallet_id is null or target_trigger_product_id is null then
    return new;
  end if;

  for rule_record in
    select r.*
    from public.loyalty_reward_rules r
    where r.business_id = new.business_id
      and r.trigger_product_id = target_trigger_product_id
      and r.active = true
  loop
    perform pg_advisory_xact_lock(hashtext(rule_record.id::text || ':' || target_wallet_id::text));

    select count(*)::bigint into redemption_count
    from public.redemptions rd
    join public.passes rp on rp.id = rd.pass_id
    where rd.business_id = new.business_id
      and rd.created_at >= rule_record.created_at
      and rp.wallet_id = target_wallet_id
      and rp.loyalty_product_id = target_trigger_product_id
      and not exists (
        select 1 from public.loyalty_campaign_claims cc where cc.pass_id = rp.id
      )
      and not exists (
        select 1 from public.loyalty_reward_grants rg where rg.pass_id = rp.id
      );

    eligible_milestones := floor(redemption_count::numeric / rule_record.every_n_redemptions)::integer;
    if rule_record.max_rewards_per_wallet is not null then
      eligible_milestones := least(eligible_milestones, rule_record.max_rewards_per_wallet);
    end if;
    if eligible_milestones < 1 then
      continue;
    end if;

    for candidate_milestone in 1..eligible_milestones loop
      begin
        grant_id := null;
        insert into public.loyalty_reward_grants (rule_id, wallet_id, milestone)
        values (rule_record.id, target_wallet_id, candidate_milestone)
        on conflict (rule_id, wallet_id, milestone) do nothing
        returning id into grant_id;
        if grant_id is null then continue; end if;

        select * into reward_product
        from public.loyalty_products lp
        where lp.id = rule_record.reward_product_id
          and lp.business_id = new.business_id
          and lp.active = true;
        if reward_product.id is null then raise exception 'reward_product_unavailable'; end if;

        insert into public.passes (
          wallet_id, loyalty_product_id, business_id, status, initial_units,
          remaining_units, expires_at, issued_price_cents, issued_currency
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
            'milestone', candidate_milestone,
            'trigger_redemptions', redemption_count,
            'recovered', redemption_count > candidate_milestone * rule_record.every_n_redemptions
          )
        );
      exception when others then
        null;
      end;
    end loop;
  end loop;
  return new;
end;
$$;

revoke all on function private.apply_loyalty_reward_after_redemption() from public, anon, authenticated;
