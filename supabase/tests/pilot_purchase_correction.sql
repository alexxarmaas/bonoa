-- Synthetic acceptance test. Every fixture is rolled back, including on failure.
-- Run with a database administrator, never with a public application key.
do $test$
declare
 owner_id uuid := gen_random_uuid();
 client_id uuid := gen_random_uuid();
 other_id uuid := gen_random_uuid();
 b uuid := gen_random_uuid();
 other_b uuid := gen_random_uuid();
 w uuid; token uuid; version integer; invitation uuid;
 product uuid := gen_random_uuid(); rule uuid := gen_random_uuid();
 purchase_id uuid := gen_random_uuid();
 event_result record; reward_id uuid; direct_pass_id uuid; low_purchase_id uuid; corrected jsonb;
 redemption_id uuid := gen_random_uuid();
 direct_redemption_id uuid := gen_random_uuid();
begin
 begin
  insert into auth.users(id,email,raw_user_meta_data)
  values(owner_id,owner_id::text||'@qa.invalid','{"display_name":"QA owner"}'),
        (client_id,client_id::text||'@qa.invalid','{"display_name":"QA client"}'),
        (other_id,other_id::text||'@qa.invalid','{"display_name":"QA outsider"}');
  insert into public.businesses(id,name,slug,status,onboarding_completed_at)
  values(b,'QA temporary','qa-'||b::text,'active',now()),
        (other_b,'QA other','qa-'||other_b::text,'active',now());
  insert into public.business_members(business_id,user_id,role) values(b,owner_id,'owner'),(other_b,other_id,'owner');
  insert into public.loyalty_products(id,business_id,name,initial_units) values(product,b,'QA reward',1);
  insert into public.loyalty_automation_rules(id,business_id,name,trigger_type,threshold_value,minimum_purchase_cents,reward_product_id,active)
  values(rule,b,'QA qualifying purchase','purchase_count',1,5000,product,true);
  select id,public_token,qr_version into w,token,version from public.wallets where user_id=client_id;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  begin
   perform public.register_loyalty_event(b,token,version,'purchase',5000,gen_random_uuid());
   raise exception 'FAIL purchase without membership allowed';
  exception when others then
   if sqlerrm <> 'club_membership_required' then raise; end if;
  end;
  begin
   perform public.register_loyalty_event(b,token,version,'visit',0,gen_random_uuid());
   raise exception 'FAIL visit without membership allowed';
  exception when others then
   if sqlerrm <> 'club_membership_required' then raise; end if;
  end;
  select (public.issue_pass_idempotent(token,version,product,gen_random_uuid())).id into direct_pass_id;
  perform public.redeem_pass(direct_pass_id,1,direct_redemption_id);
  execute 'reset role';
  if exists(select 1 from public.loyalty_memberships where business_id=b and wallet_id=w) then raise exception 'FAIL pass implicitly enrolled customer'; end if;
  execute 'set local role authenticated';
  if public.request_club_join_by_qr(b,token,version) <> 'pending' then raise exception 'FAIL request pending'; end if;
  execute 'reset role';
  select id into invitation from public.club_join_requests where business_id=b and wallet_id=w;
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  begin
   perform public.respond_club_join_request(invitation,true);
   raise exception 'FAIL outsider approved invitation';
  exception when others then
   if sqlerrm <> 'join_request_not_found' then raise; end if;
  end;
  begin
   perform public.register_loyalty_event(b,token,version,'purchase',5000,gen_random_uuid());
   raise exception 'FAIL other commerce registered purchase';
  exception when others then
   if sqlerrm <> 'not_authorized' then raise; end if;
  end;
  begin
   perform public.redeem_pass(direct_pass_id,1,direct_redemption_id);
   raise exception 'FAIL outsider replayed redemption';
  exception when others then
   if sqlerrm <> 'not authorized for this business' then raise; end if;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',client_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',client_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if not exists(select 1 from public.wallet_pending_club_joins() where request_id=invitation) then raise exception 'FAIL pending invitation invisible'; end if;
  if public.respond_club_join_request(invitation,true) <> 'approved' then raise exception 'FAIL approval'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if public.request_club_join_by_qr(b,token,version) <> 'already_member' then raise exception 'FAIL membership not active'; end if;
  select * into event_result from public.register_loyalty_event(b,token,version,'purchase',4900,gen_random_uuid());
  if event_result.rewards_issued <> 0 then raise exception 'FAIL unqualified purchase rewarded'; end if;
  low_purchase_id := event_result.event_id;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',other_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  begin
   perform public.correct_purchase_amount(b,low_purchase_id,4900,4000,'QA tenant denial');
   raise exception 'FAIL cross-tenant correction allowed';
  exception when others then if sqlerrm <> 'not_authorized' then raise; end if; end;
  execute 'reset role';
  insert into public.business_members(business_id,user_id,role) values(b,other_id,'staff');
  execute 'set local role authenticated';
  begin
   perform public.correct_purchase_amount(b,low_purchase_id,4900,4000,'QA staff denial');
   raise exception 'FAIL staff correction allowed';
  exception when others then if sqlerrm <> 'not_authorized' then raise; end if; end;
  execute 'reset role';
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  corrected := public.correct_purchase_amount(b,low_purchase_id,4900,4000,'QA amount correction');
  if (corrected->>'amount_cents')::bigint <> 4000 then raise exception 'FAIL correction amount'; end if;
  begin
   perform public.correct_purchase_amount(b,low_purchase_id,4900,3000,'QA stale retry');
   raise exception 'FAIL stale correction allowed';
  exception when others then if sqlerrm <> 'purchase_amount_changed' then raise; end if; end;
  execute 'reset role';
  if (select amount_cents from public.loyalty_events where id=low_purchase_id) <> 4000 then raise exception 'FAIL corrected amount not saved'; end if;
  if not exists(select 1 from public.business_audit_events where business_id=b and metadata->>'action'='purchase_amount_corrected' and metadata->>'loyalty_event_id'=low_purchase_id::text) then raise exception 'FAIL correction audit missing'; end if;
  if not exists(select 1 from public.wallet_notifications where wallet_id=w and title='Compra rectificada') then raise exception 'FAIL correction notification missing'; end if;
  execute 'set local role authenticated';
  select * into event_result from public.register_loyalty_event(b,token,version,'purchase',5000,purchase_id);
  if event_result.rewards_issued <> 1 or event_result.already_recorded then raise exception 'FAIL qualifying reward'; end if;
  begin
   perform public.correct_purchase_amount(b,low_purchase_id,4000,3000,'QA reward guard');
   raise exception 'FAIL correction with rewards allowed';
  exception when others then if sqlerrm <> 'correction_requires_reward_review' then raise; end if; end;
  select * into event_result from public.register_loyalty_event(b,token,version,'purchase',5000,purchase_id);
  if not event_result.already_recorded then raise exception 'FAIL purchase idempotency'; end if;
  execute 'reset role';
  select pass_id into reward_id from public.loyalty_automation_grants where rule_id=rule and wallet_id=w;
  if reward_id is null then raise exception 'FAIL reward not persisted'; end if;
  execute 'set local role authenticated';
  perform public.redeem_pass(reward_id,1,redemption_id);
  perform public.redeem_pass(reward_id,1,redemption_id);
  begin
   perform public.redeem_pass(reward_id,2,redemption_id);
   raise exception 'FAIL changed units accepted on replay';
  exception when others then
   if sqlerrm <> 'request_id has already been used for another redemption' then raise; end if;
  end;
  execute 'reset role';
  if (select count(*) from public.redemptions where pass_id=reward_id) <> 1 then raise exception 'FAIL duplicate redemption'; end if;
  if (select remaining_units from public.passes where id=reward_id) <> 0 then raise exception 'FAIL balance'; end if;
  if (select count(*) from public.loyalty_events where business_id=b and wallet_id=w and event_type='purchase') <> 2 then raise exception 'FAIL duplicate purchase'; end if;
  raise exception using errcode='ZX001',message='rollback_test_fixtures';
 exception when sqlstate 'ZX001' then
  null;
 end;
end;
$test$;
select 'PASS: pilot consent and rewards plus correction, stale retry, audit, notification and reward guard; fixtures rolled back' as result;
