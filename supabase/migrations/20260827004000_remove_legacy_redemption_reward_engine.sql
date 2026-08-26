-- The generalized loyalty automation engine supersedes the first redemption-only
-- reward prototype. No legacy rules or grants exist in the current project.

drop trigger if exists apply_loyalty_reward_after_redemption on public.redemptions;

drop function if exists private.apply_loyalty_reward_after_redemption();
drop function if exists public.wallet_reward_progress();
drop function if exists public.business_loyalty_reward_rules(uuid);
drop function if exists public.set_loyalty_reward_rule_active(uuid, boolean);
drop function if exists public.create_loyalty_reward_rule(uuid, uuid, uuid, text, integer, integer);

drop table if exists public.loyalty_reward_grants;
drop table if exists public.loyalty_reward_rules;
