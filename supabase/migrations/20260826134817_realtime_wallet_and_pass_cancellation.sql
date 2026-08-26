do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'passes'
  ) then
    alter publication supabase_realtime add table public.passes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'redemptions'
  ) then
    alter publication supabase_realtime add table public.redemptions;
  end if;
end $$;

create or replace function public.cancel_pass(target_pass_id uuid)
returns public.passes
language plpgsql
security definer
set search_path = public, private
as $$
declare
  current_user_id uuid := auth.uid();
  current_pass public.passes%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into current_pass
  from public.passes
  where id = target_pass_id
  for update;

  if not found then
    raise exception 'Pass not found';
  end if;

  if not private.is_business_manager(current_pass.business_id, current_user_id) then
    raise exception 'Not authorized for this business';
  end if;

  if current_pass.status = 'cancelled' then
    return current_pass;
  end if;

  if current_pass.status = 'exhausted' then
    raise exception 'Exhausted pass cannot be cancelled';
  end if;

  update public.passes
  set status = 'cancelled', updated_at = now()
  where id = target_pass_id
  returning * into current_pass;

  return current_pass;
end;
$$;

revoke all on function public.cancel_pass(uuid) from public, anon;
grant execute on function public.cancel_pass(uuid) to authenticated;
