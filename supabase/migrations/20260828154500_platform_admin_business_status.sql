create or replace function public.admin_set_business_status(
  target_business_id uuid,
  next_status text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_status text;
begin
  if not private.is_platform_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  if next_status <> all (array['active'::text, 'inactive'::text, 'suspended'::text]) then
    raise exception 'invalid_business_status';
  end if;

  select b.status into previous_status
  from public.businesses b
  where b.id = target_business_id
  for update;

  if previous_status is null then
    raise exception 'business_not_found';
  end if;

  update public.businesses
  set status = next_status,
      updated_at = now(),
      directory_listed = case when next_status = 'active' then directory_listed else false end
  where id = target_business_id;

  insert into public.business_audit_events (business_id, actor_id, event_type, metadata)
  values (
    target_business_id,
    auth.uid(),
    'business_updated',
    jsonb_build_object(
      'admin_action', 'status_change',
      'previous_status', previous_status,
      'next_status', next_status
    )
  );

  return next_status;
end;
$$;

revoke all on function public.admin_set_business_status(uuid, text) from public, anon;
grant execute on function public.admin_set_business_status(uuid, text) to authenticated;
