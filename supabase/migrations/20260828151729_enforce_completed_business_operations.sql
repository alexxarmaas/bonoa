create or replace function private.enforce_completed_business_operation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_business public.businesses%rowtype;
begin
  -- Maintenance/migrations running outside a user request are not blocked.
  if auth.uid() is null then
    return new;
  end if;

  select b.*
    into target_business
  from public.businesses b
  where b.id = new.business_id;

  if not found then
    raise exception 'not authorized for this business';
  end if;

  if target_business.status <> 'active' then
    raise exception 'business is not active';
  end if;

  if target_business.onboarding_completed_at is null then
    raise exception 'business onboarding incomplete';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_completed_business_operation() from public;

-- A business that has not completed onboarding must not be able to acquire
-- customers, emit passes, record loyalty activity or redeem passes even when
-- an RPC is called directly instead of going through the UI.
drop trigger if exists loyalty_memberships_require_completed_business on public.loyalty_memberships;
create trigger loyalty_memberships_require_completed_business
before insert on public.loyalty_memberships
for each row execute function private.enforce_completed_business_operation();

drop trigger if exists passes_require_completed_business on public.passes;
create trigger passes_require_completed_business
before insert on public.passes
for each row execute function private.enforce_completed_business_operation();

drop trigger if exists loyalty_events_require_completed_business on public.loyalty_events;
create trigger loyalty_events_require_completed_business
before insert on public.loyalty_events
for each row execute function private.enforce_completed_business_operation();

drop trigger if exists redemptions_require_completed_business on public.redemptions;
create trigger redemptions_require_completed_business
before insert on public.redemptions
for each row execute function private.enforce_completed_business_operation();
