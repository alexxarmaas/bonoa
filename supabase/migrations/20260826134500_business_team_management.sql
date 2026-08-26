drop policy if exists business_members_manager_insert on public.business_members;
drop policy if exists business_members_manager_update on public.business_members;
drop policy if exists business_members_manager_delete on public.business_members;
revoke insert, update, delete on public.business_members from anon, authenticated;

create or replace function public.business_members_for_management(target_business_id uuid)
returns table (
  user_id uuid,
  display_name text,
  email text,
  role public.business_role,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public, private, auth
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
    coalesce(p.display_name, split_part(coalesce(u.email, 'Usuario Bonoa'), '@', 1)),
    u.email,
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

revoke all on function public.business_members_for_management(uuid) from public, anon;
grant execute on function public.business_members_for_management(uuid) to authenticated;

create or replace function public.add_business_member(
  target_business_id uuid,
  member_email text,
  member_role public.business_role default 'staff'
)
returns public.business_members
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  caller_role public.business_role;
  target_user_id uuid;
  created_member public.business_members;
  normalized_email text := lower(trim(member_email));
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select bm.role into caller_role
  from public.business_members bm
  where bm.business_id = target_business_id and bm.user_id = auth.uid();

  if caller_role is null or caller_role not in ('owner', 'manager') then
    raise exception 'not authorized for this business';
  end if;
  if normalized_email is null or normalized_email = '' then
    raise exception 'member email is required';
  end if;
  if caller_role = 'manager' and member_role <> 'staff' then
    raise exception 'only owners can assign elevated roles';
  end if;

  select u.id into target_user_id
  from auth.users u
  where lower(u.email) = normalized_email
  limit 1;

  if not found then
    raise exception 'user is not registered in Bonoa';
  end if;
  if exists (
    select 1 from public.business_members bm
    where bm.business_id = target_business_id and bm.user_id = target_user_id
  ) then
    raise exception 'user is already a business member';
  end if;

  insert into public.business_members (business_id, user_id, role)
  values (target_business_id, target_user_id, member_role)
  returning * into created_member;

  return created_member;
end;
$$;

revoke all on function public.add_business_member(uuid, text, public.business_role) from public, anon;
grant execute on function public.add_business_member(uuid, text, public.business_role) to authenticated;

create or replace function public.set_business_member_role(
  target_business_id uuid,
  target_user_id uuid,
  new_role public.business_role
)
returns public.business_members
language plpgsql
security definer
set search_path = public, private
as $$
declare
  caller_role public.business_role;
  current_role public.business_role;
  updated_member public.business_members;
  owner_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select bm.role into caller_role
  from public.business_members bm
  where bm.business_id = target_business_id and bm.user_id = auth.uid();

  if caller_role is null or caller_role <> 'owner' then
    raise exception 'owner role required';
  end if;

  select bm.role into current_role
  from public.business_members bm
  where bm.business_id = target_business_id and bm.user_id = target_user_id
  for update;

  if not found then raise exception 'business member not found'; end if;

  if current_role = 'owner' and new_role <> 'owner' then
    select count(*) into owner_count
    from public.business_members bm
    where bm.business_id = target_business_id and bm.role = 'owner';
    if owner_count <= 1 then
      raise exception 'business must keep at least one owner';
    end if;
  end if;

  update public.business_members
  set role = new_role
  where business_id = target_business_id and user_id = target_user_id
  returning * into updated_member;

  return updated_member;
end;
$$;

revoke all on function public.set_business_member_role(uuid, uuid, public.business_role) from public, anon;
grant execute on function public.set_business_member_role(uuid, uuid, public.business_role) to authenticated;

create or replace function public.remove_business_member(
  target_business_id uuid,
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  caller_role public.business_role;
  target_role public.business_role;
  owner_count integer;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  select bm.role into caller_role
  from public.business_members bm
  where bm.business_id = target_business_id and bm.user_id = auth.uid();
  if caller_role is null or caller_role not in ('owner', 'manager') then
    raise exception 'not authorized for this business';
  end if;

  select bm.role into target_role
  from public.business_members bm
  where bm.business_id = target_business_id and bm.user_id = target_user_id
  for update;
  if not found then raise exception 'business member not found'; end if;

  if caller_role = 'manager' and target_role <> 'staff' then
    raise exception 'managers can only remove staff';
  end if;

  if target_role = 'owner' then
    select count(*) into owner_count
    from public.business_members bm
    where bm.business_id = target_business_id and bm.role = 'owner';
    if owner_count <= 1 then
      raise exception 'business must keep at least one owner';
    end if;
  end if;

  delete from public.business_members
  where business_id = target_business_id and user_id = target_user_id;
  return true;
end;
$$;

revoke all on function public.remove_business_member(uuid, uuid) from public, anon;
grant execute on function public.remove_business_member(uuid, uuid) to authenticated;
