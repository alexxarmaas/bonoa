revoke execute on function public.wallet_memberships() from public, anon;
grant execute on function public.wallet_memberships() to authenticated, service_role;

create index if not exists business_referral_programs_referrer_reward_product_idx
  on public.business_referral_programs (referrer_reward_product_id)
  where referrer_reward_product_id is not null;

create index if not exists business_referral_programs_referred_reward_product_idx
  on public.business_referral_programs (referred_reward_product_id)
  where referred_reward_product_id is not null;

create index if not exists business_risk_events_wallet_idx
  on public.business_risk_events (wallet_id)
  where wallet_id is not null;

create index if not exists business_risk_events_actor_idx
  on public.business_risk_events (actor_id)
  where actor_id is not null;

create index if not exists referral_claims_first_purchase_event_idx
  on public.referral_claims (first_purchase_event_id)
  where first_purchase_event_id is not null;

create index if not exists referral_claims_invite_idx
  on public.referral_claims (invite_id);

create index if not exists referral_claims_referred_reward_pass_idx
  on public.referral_claims (referred_reward_pass_id)
  where referred_reward_pass_id is not null;

create index if not exists referral_claims_referred_wallet_idx
  on public.referral_claims (referred_wallet_id);

create index if not exists referral_claims_referrer_reward_pass_idx
  on public.referral_claims (referrer_reward_pass_id)
  where referrer_reward_pass_id is not null;

create index if not exists referral_invites_referrer_wallet_idx
  on public.referral_invites (referrer_wallet_id);
