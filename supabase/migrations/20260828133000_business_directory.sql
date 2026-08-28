alter table public.businesses
  add column if not exists directory_listed boolean not null default false,
  add column if not exists directory_category text;

alter table public.businesses
  drop constraint if exists businesses_directory_category_check,
  add constraint businesses_directory_category_check check (
    directory_category is null
    or directory_category = any (array[
      'restauracion'::text,
      'automocion'::text,
      'belleza'::text,
      'deporte'::text,
      'comercio'::text,
      'ocio'::text,
      'servicios'::text,
      'otros'::text
    ])
  );

create index if not exists businesses_directory_active_idx
  on public.businesses (directory_category, created_at desc)
  where status = 'active' and directory_listed = true;

comment on column public.businesses.directory_listed is
  'Opt-in flag that allows an active business to appear in the Bonoa customer directory.';
comment on column public.businesses.directory_category is
  'Customer-facing category used to filter businesses in the Bonoa directory.';

create or replace function private.audit_business_directory_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.directory_listed is distinct from new.directory_listed
     or old.directory_category is distinct from new.directory_category then
    insert into public.business_audit_events (business_id, actor_id, event_type, metadata)
    values (
      new.id,
      auth.uid(),
      'business_updated',
      jsonb_build_object(
        'directory_listed', new.directory_listed,
        'directory_category', new.directory_category
      )
    );
  end if;
  return new;
end;
$$;

revoke all on function private.audit_business_directory_change() from public, anon, authenticated;

drop trigger if exists audit_business_directory_change on public.businesses;
create trigger audit_business_directory_change
after update of directory_listed, directory_category on public.businesses
for each row
when (
  old.directory_listed is distinct from new.directory_listed
  or old.directory_category is distinct from new.directory_category
)
execute function private.audit_business_directory_change();
