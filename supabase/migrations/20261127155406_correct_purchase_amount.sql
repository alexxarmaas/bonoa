-- Conservative pilot correction: lower a mistaken purchase amount, never remove activity.
-- Reward-bearing relationships require a separately designed reconciliation flow.
create or replace function public.correct_purchase_amount(
  target_business_id uuid, target_event_id uuid,
  expected_amount_cents bigint, next_amount_cents bigint, correction_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  target public.loyalty_events%rowtype;
  target_wallet_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.business_members bm
    where bm.business_id=target_business_id and bm.user_id=auth.uid()
      and bm.role in ('owner','manager')
  ) then raise exception 'not_authorized'; end if;
  if not exists (
    select 1 from public.businesses b where b.id=target_business_id and b.status='active'
      and b.onboarding_completed_at is not null
  ) then raise exception 'business_not_active'; end if;
  if correction_reason is null or char_length(trim(correction_reason)) not between 5 and 200
  then raise exception 'invalid_correction_reason'; end if;
  if expected_amount_cents is null or next_amount_cents is null
    or next_amount_cents < 0 or next_amount_cents >= expected_amount_cents
  then raise exception 'invalid_correction_amount'; end if;

  select e.wallet_id into target_wallet_id from public.loyalty_events e
    where e.id=target_event_id and e.business_id=target_business_id and e.event_type='purchase';
  if not found then raise exception 'purchase_not_found'; end if;

  -- Serialize against purchase/visit registration: the existing event trigger holds
  -- a share lock on this membership; activity updates also lock this same row.
  perform 1 from public.loyalty_memberships lm
    where lm.business_id=target_business_id and lm.wallet_id=target_wallet_id
      and lm.status='active' for update;
  if not found then raise exception 'club_membership_required'; end if;

  select e.* into target from public.loyalty_events e
    where e.id=target_event_id and e.business_id=target_business_id and e.event_type='purchase'
    for update;
  if not found then raise exception 'purchase_not_found'; end if;
  if target.amount_cents <> expected_amount_cents then
    -- A stale UI or a network retry must reload rather than overwrite newer activity.
    raise exception 'purchase_amount_changed';
  end if;
  if target.rewards_issued > 0
    or exists (
      select 1 from public.loyalty_automation_grants g
      join public.loyalty_automation_rules ar on ar.id=g.rule_id
      where ar.business_id=target_business_id and g.wallet_id=target.wallet_id
    )
    or exists (
      select 1 from public.referral_claims rc where rc.business_id=target_business_id
      and (rc.referred_wallet_id=target.wallet_id or rc.referrer_wallet_id=target.wallet_id)
      and rc.status='rewarded'
    )
  then raise exception 'correction_requires_reward_review'; end if;

  update public.loyalty_events set amount_cents=next_amount_cents where id=target.id;
  -- Keep the previous amount and reason in the existing append-only business audit.
  insert into public.business_audit_events(business_id,actor_id,event_type,metadata)
  values(target_business_id,auth.uid(),'loyalty_event_recorded',
    jsonb_build_object('action','purchase_amount_corrected','loyalty_event_id',target.id,
      'previous_amount_cents',target.amount_cents,'amount_cents',next_amount_cents,
      'reason',trim(correction_reason)));
  perform private.push_wallet_notification(target.wallet_id,target_business_id,'purchase',
    'Compra rectificada',
    'El comercio ha corregido una compra. El importe registrado y tu progreso se han actualizado.',
    jsonb_build_object('loyalty_event_id',target.id,'previous_amount_cents',target.amount_cents,'amount_cents',next_amount_cents));
  return jsonb_build_object('event_id',target.id,'previous_amount_cents',target.amount_cents,'amount_cents',next_amount_cents);
end;
$function$;
revoke all on function public.correct_purchase_amount(uuid,uuid,bigint,bigint,text) from public, anon, authenticated;
grant execute on function public.correct_purchase_amount(uuid,uuid,bigint,bigint,text) to authenticated;
