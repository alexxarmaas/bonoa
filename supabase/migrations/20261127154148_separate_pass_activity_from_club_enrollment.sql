-- Receiving or redeeming a pass is independent of explicitly joining the club.
-- Only the explicit join flows (public join, accepted invitation or referral)
-- create/reactivate memberships. Activity keeps existing members up to date.
create or replace function private.capture_loyalty_membership_from_pass()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  update public.loyalty_memberships lm
    set last_activity_at=greatest(lm.last_activity_at,coalesce(new.purchased_at,now())),
        updated_at=now()
    where lm.business_id=new.business_id and lm.wallet_id=new.wallet_id
      and lm.status='active';
  return new;
end;
$function$;
create or replace function private.capture_loyalty_membership_from_event()
returns trigger language plpgsql security definer set search_path = ''
as $function$
begin
  update public.loyalty_memberships lm
    set last_activity_at=greatest(lm.last_activity_at,coalesce(new.occurred_at,now())),
        updated_at=now()
    where lm.business_id=new.business_id and lm.wallet_id=new.wallet_id
      and lm.status='active';
  return new;
end;
$function$;
revoke all on function private.capture_loyalty_membership_from_pass() from public, anon, authenticated;
revoke all on function private.capture_loyalty_membership_from_event() from public, anon, authenticated;
