-- Allow a Bonoa account to be removed without losing the operational audit trail.
-- Historical redemptions remain, but the operator reference is anonymized.

alter table public.redemptions
  alter column performed_by drop not null;

alter table public.redemptions
  drop constraint if exists redemptions_performed_by_fkey;

alter table public.redemptions
  add constraint redemptions_performed_by_fkey
  foreign key (performed_by)
  references auth.users(id)
  on delete set null;

comment on column public.redemptions.performed_by is
  'Operator that performed the redemption. Set to NULL when the auth user is deleted so the immutable redemption history can be retained without blocking account deletion.';
