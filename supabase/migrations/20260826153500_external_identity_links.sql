create table public.external_identities (
  provider text not null,
  external_user_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  email_snapshot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (provider, external_user_id),
  constraint external_identities_provider_user_unique unique (provider, user_id),
  constraint external_identities_provider_check check (provider in ('tramassso'))
);

create index external_identities_user_idx on public.external_identities (user_id);

alter table public.external_identities enable row level security;
revoke all on table public.external_identities from anon, authenticated;

create trigger external_identities_set_updated_at
before update on public.external_identities
for each row execute function private.set_updated_at();
