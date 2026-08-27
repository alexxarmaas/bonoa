-- Cover foreign keys used by deletes, administration and reporting as the
-- loyalty tables grow beyond the pilot dataset.

create index if not exists loyalty_campaigns_created_by_idx
  on public.loyalty_campaigns (created_by)
  where created_by is not null;

create index if not exists loyalty_reward_rules_created_by_idx
  on public.loyalty_reward_rules (created_by)
  where created_by is not null;

create index if not exists loyalty_reward_rules_reward_product_idx
  on public.loyalty_reward_rules (reward_product_id);

create index if not exists loyalty_reward_grants_pass_idx
  on public.loyalty_reward_grants (pass_id)
  where pass_id is not null;
