create or replace function public.business_members_for_management(target_business_id uuid)
returns table(
  user_id uuid,
  display_name text,
  email text,
  role public.business_role,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = 'public', 'private', 'auth'
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;
  if not private.is_business_manager(target_business_id) then
    raise exception 'not authorized for this business';
  end if;

  return query
  select
    bm.user_id,
    coalesce(p.display_name, split_part(coalesce(u.email, 'Usuario Bonoa'), '@', 1))::text,
    u.email::text,
    bm.role,
    bm.created_at
  from public.business_members bm
  join auth.users u on u.id = bm.user_id
  left join public.profiles p on p.id = bm.user_id
  where bm.business_id = target_business_id
  order by
    case bm.role when 'owner' then 0 when 'manager' then 1 else 2 end,
    bm.created_at asc;
end;
$$;
