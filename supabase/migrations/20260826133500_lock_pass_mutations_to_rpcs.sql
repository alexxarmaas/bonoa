drop policy if exists passes_business_insert on public.passes;
drop policy if exists passes_business_update on public.passes;
revoke insert, update, delete on public.passes from anon, authenticated;
