-- Keep one clear owner for each loyalty signal:
-- - loyalty_reward_rules: product redemption milestones
-- - loyalty_automation_rules: visits, purchases and spend
-- This prevents two engines from rewarding the same redemption.

update public.loyalty_automation_rules
set active = false, updated_at = now()
where trigger_type = 'product_redemption_count';

alter table public.loyalty_automation_rules
  drop constraint if exists loyalty_automation_trigger_product;

alter table public.loyalty_automation_rules
  drop constraint if exists loyalty_automation_rules_trigger_type_check;

alter table public.loyalty_automation_rules
  add constraint loyalty_automation_rules_trigger_type_check
  check (trigger_type in ('purchase_count', 'visit_count', 'spend_total'));

alter table public.loyalty_automation_rules
  add constraint loyalty_automation_trigger_product
  check (trigger_product_id is null);

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
  reward_business_id uuid;
  result public.loyalty_automation_rules;
begin
  if auth.uid() is null or not private.is_business_manager(target_business_id) then
    raise exception 'not_authorized';
  end if;
  if char_length(trim(coalesce(rule_name, ''))) < 2 or char_length(trim(rule_name)) > 120 then
    raise exception 'invalid_rule_name';
  end if;
  if rule_trigger_type not in ('purchase_count', 'visit_count', 'spend_total') then
    raise exception 'invalid_trigger_type';
  end if;
  if target_trigger_product_id is not null then
    raise exception 'trigger_product_not_allowed';
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

  insert into public.loyalty_automation_rules (
    business_id, name, trigger_type, threshold_value, trigger_product_id,
    reward_product_id, repeatable, max_rewards_per_wallet, active, created_by
  ) values (
    target_business_id, trim(rule_name), rule_trigger_type, rule_threshold_value, null,
    target_reward_product_id, coalesce(rule_repeatable, true), reward_limit, true, auth.uid()
  ) returning * into result;

  insert into public.business_audit_events (business_id, actor_id, event_type, product_id, metadata)
  values (
    target_business_id, auth.uid(), 'automation_rule_created', target_reward_product_id,
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
    select ar.*
    from public.loyalty_automation_rules ar
    where ar.business_id = event_row.business_id
      and ar.active = true
      and ar.trigger_type in ('purchase_count', 'visit_count', 'spend_total')
    order by ar.created_at, ar.id
  loop
    perform pg_advisory_xact_lock(hashtext(rule_row.id::text || ':' || event_row.wallet_id::text));

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
        and e.event_type = 'visit'
        and e.occurred_at >= rule_row.created_at;
    else
      select coalesce(sum(e.amount_cents), 0)::bigint into metric_value
      from public.loyalty_events e
      where e.business_id = event_row.business_id
        and e.wallet_id = event_row.wallet_id
        and e.event_type = 'purchase'
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
      begin
        grant_id := null;
        insert into public.loyalty_automation_grants (rule_id, wallet_id, milestone)
        values (rule_row.id, event_row.wallet_id, milestone_no)
        on conflict (rule_id, wallet_id, milestone) do nothing
        returning id into grant_id;
        if grant_id is null then continue; end if;

        select * into reward_product
        from public.loyalty_products lp
        where lp.id = rule_row.reward_product_id
          and lp.business_id = event_row.business_id
          and lp.active = true;
        if reward_product.id is null then raise exception 'reward_product_unavailable'; end if;

        insert into public.passes (
          wallet_id, loyalty_product_id, business_id, status, initial_units,
          remaining_units, expires_at, issued_price_cents, issued_currency
        ) values (
          event_row.wallet_id, reward_product.id, event_row.business_id,
          'active'::public.pass_status, reward_product.initial_units, reward_product.initial_units,
          case when reward_product.validity_days is null then null else now() + make_interval(days => reward_product.validity_days) end,
          0, reward_product.currency
        ) returning * into reward_pass;

        update public.loyalty_automation_grants set pass_id = reward_pass.id where id = grant_id;

        insert into public.business_audit_events (business_id, actor_id, event_type, pass_id, product_id, metadata)
        values (
          event_row.business_id, event_row.recorded_by, 'reward_issued', reward_pass.id, reward_product.id,
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

revoke all on function public.create_loyalty_automation_rule(uuid, text, text, bigint, uuid, uuid, boolean, integer) from public, anon;
grant execute on function public.create_loyalty_automation_rule(uuid, text, text, bigint, uuid, uuid, boolean, integer) to authenticated;
revoke all on function private.process_loyalty_event_automations(uuid) from public, anon, authenticated;
