create index if not exists wallet_notifications_business_idx
  on public.wallet_notifications (business_id, created_at desc)
  where business_id is not null;
