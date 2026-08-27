-- Retain an anonymized administrative trail for deletion requests and allow
-- wallet deletion even when a pass has historical redemptions.

alter table public.account_deletion_requests
  alter column user_id drop not null;

alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_user_id_fkey;

alter table public.account_deletion_requests
  add constraint account_deletion_requests_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete set null;

comment on column public.account_deletion_requests.user_id is
  'User associated with the deletion request while the account exists. Set to NULL after account deletion so the administrative request record can be retained without retaining the auth identity.';

alter table public.redemptions
  alter column pass_id drop not null;

alter table public.redemptions
  drop constraint if exists redemptions_pass_id_fkey;

alter table public.redemptions
  add constraint redemptions_pass_id_fkey
  foreign key (pass_id)
  references public.passes(id)
  on delete set null;

comment on column public.redemptions.pass_id is
  'Pass associated with the redemption while it exists. Set to NULL when a wallet/account deletion removes the pass, retaining only the business-level immutable redemption record.';
