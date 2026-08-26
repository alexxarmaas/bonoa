create schema if not exists private;

alter function public.set_updated_at() set search_path = public;
alter function public.set_updated_at() set schema private;
alter function public.handle_new_user() set schema private;
alter function public.is_business_member(uuid) set schema private;
alter function public.is_business_manager(uuid) set schema private;

revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.set_updated_at() from public, anon, authenticated;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_business_member(uuid) to authenticated;
grant execute on function private.is_business_manager(uuid) to authenticated;

revoke all on function public.redeem_pass(uuid, numeric, uuid) from public, anon;
grant execute on function public.redeem_pass(uuid, numeric, uuid) to authenticated;
