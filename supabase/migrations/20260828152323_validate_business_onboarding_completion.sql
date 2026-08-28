create or replace function public.setup_loyalty_program_template(target_business_id uuid, template_key text, reward_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  trigger_kind text;
  threshold bigint;
  minimum_cents bigint := 0;
  resolved_name text;
  reward_product_id uuid;
  rule_id uuid;
begin
  if auth.uid() is null or not private.is_business_manager(target_business_id) then raise exception 'not_authorized'; end if;
  if template_key='five_visits' then trigger_kind:='visit_count'; threshold:=5; resolved_name:='5 visitas = premio';
  elsif template_key='ten_purchases' then trigger_kind:='purchase_count'; threshold:=10; resolved_name:='10 compras = premio';
  elsif template_key='ten_purchases_50' then trigger_kind:='purchase_count'; threshold:=10; minimum_cents:=5000; resolved_name:='10 compras de 50 € = premio';
  elsif template_key='spend_100' then trigger_kind:='spend_total'; threshold:=10000; resolved_name:='100 € acumulados = premio';
  else raise exception 'invalid_template'; end if;
  if char_length(trim(coalesce(reward_name,''))) not between 2 and 120 then raise exception 'invalid_reward_name'; end if;

  insert into public.loyalty_products(business_id,name,description,type,initial_units,validity_days,active,sale_price_cents,currency,publicly_listed)
  values(target_business_id,trim(reward_name),'Premio automático del carnet de fidelización','uses'::public.loyalty_product_type,1,90,true,0,'EUR',false)
  returning id into reward_product_id;

  insert into public.loyalty_automation_rules(business_id,name,trigger_type,threshold_value,trigger_product_id,reward_product_id,repeatable,max_rewards_per_wallet,active,created_by,minimum_purchase_cents)
  values(target_business_id,resolved_name,trigger_kind,threshold,null,reward_product_id,true,null,true,auth.uid(),minimum_cents)
  returning id into rule_id;

  return jsonb_build_object('rule_id',rule_id,'reward_product_id',reward_product_id,'template_key',template_key);
end;
$$;

create or replace function private.validate_business_onboarding_completion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.onboarding_completed_at is not null and old.onboarding_completed_at is null then
    if char_length(trim(coalesce(new.name, ''))) < 2
      or char_length(trim(coalesce(new.description, ''))) < 20
      or char_length(trim(coalesce(new.phone, ''))) < 6
      or char_length(trim(coalesce(new.address, ''))) < 4
      or nullif(trim(coalesce(new.logo_url, '')), '') is null
      or new.directory_category is null
      or new.directory_listed is not true
      or char_length(trim(coalesce(new.club_name, ''))) < 2
      or char_length(trim(coalesce(new.club_message, ''))) < 8
      or char_length(trim(coalesce(new.membership_badge_label, ''))) < 2
    then
      raise exception 'business onboarding requirements incomplete';
    end if;

    if not exists (
      select 1
      from public.loyalty_automation_rules r
      where r.business_id = new.id
        and r.active is true
    ) then
      raise exception 'business onboarding requirements incomplete';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.validate_business_onboarding_completion() from public;

drop trigger if exists businesses_validate_onboarding_completion on public.businesses;
create trigger businesses_validate_onboarding_completion
before update of onboarding_completed_at on public.businesses
for each row execute function private.validate_business_onboarding_completion();
