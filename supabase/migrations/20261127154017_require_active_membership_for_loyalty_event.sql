-- An invitation must be accepted before a commerce records a purchase or visit.
-- Pass issuance and redemption retain their existing independent flows.
create or replace function private.require_active_membership_for_loyalty_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.event_type in ('purchase', 'visit') then
    perform 1 from public.loyalty_memberships lm
      where lm.business_id = new.business_id
        and lm.wallet_id = new.wallet_id
        and lm.status = 'active'
      for share;
    if not found then
      raise exception 'club_membership_required';
    end if;
  end if;
  return new;
end;
$function$;
revoke all on function private.require_active_membership_for_loyalty_event() from public, anon, authenticated;
drop trigger if exists loyalty_events_require_active_membership on public.loyalty_events;
create trigger loyalty_events_require_active_membership
  before insert on public.loyalty_events
  for each row execute function private.require_active_membership_for_loyalty_event();
