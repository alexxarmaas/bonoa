-- Cover foreign keys used by the loyalty growth engine.
-- These indexes keep wallet/rule/grant lookups predictable as pilot data grows.

create index if not exists loyalty_events_wallet_idx
  on public.loyalty_events (wallet_id);

create index if not exists loyalty_events_recorded_by_idx
  on public.loyalty_events (recorded_by);

create index if not exists loyalty_automation_rules_reward_product_idx
  on public.loyalty_automation_rules (reward_product_id);

create index if not exists loyalty_automation_rules_created_by_idx
  on public.loyalty_automation_rules (created_by);

create index if not exists loyalty_automation_grants_pass_idx
  on public.loyalty_automation_grants (pass_id);
