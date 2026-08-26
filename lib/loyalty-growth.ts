import { supabase } from "@/lib/supabase/client";
import type { BonoaQrIdentity } from "@/lib/business-data";

type RpcError = { message: string };
type RpcResult<T> = PromiseLike<{ data: T | null; error: RpcError | null }>;
type RpcClient = <T>(fn: string, args?: Record<string, unknown>) => RpcResult<T>;

const rpc = supabase.rpc as unknown as RpcClient;

export type CustomerSegment = "new" | "active" | "loyal" | "at_risk";
export type LoyaltyEventType = "purchase" | "visit";
export type AutomationTrigger = "purchase_count" | "visit_count" | "spend_total" | "product_redemption_count";

export type BusinessCustomer = {
  wallet_id: string;
  customer_code: string;
  first_seen: string;
  last_activity: string;
  passes_issued: number;
  active_passes: number;
  redemptions: number;
  purchases: number;
  visits: number;
  spend_cents: number;
  rewards_earned: number;
  issued_value_cents: number;
  segment: CustomerSegment;
  days_since_activity: number;
};

export type LoyaltyCampaign = {
  campaign_id: string;
  campaign_name: string;
  message: string | null;
  share_code: string;
  product_id: string;
  product_name: string;
  starts_at: string;
  ends_at: string | null;
  max_claims: number | null;
  claims: number;
  active: boolean;
  state: "active" | "upcoming" | "ended" | "exhausted" | "disabled";
  created_at: string;
};

export type RewardRule = {
  rule_id: string;
  rule_name: string;
  trigger_product_id: string;
  trigger_product_name: string;
  reward_product_id: string;
  reward_product_name: string;
  every_n_redemptions: number;
  max_rewards_per_wallet: number | null;
  active: boolean;
  rewards_issued: number;
  customers_rewarded: number;
  created_at: string;
};

export type AutomationRule = {
  rule_id: string;
  rule_name: string;
  trigger_type: AutomationTrigger;
  threshold_value: number;
  trigger_product_id: string | null;
  trigger_product_name: string | null;
  reward_product_id: string;
  reward_product_name: string;
  repeatable: boolean;
  max_rewards_per_wallet: number | null;
  active: boolean;
  rewards_issued: number;
  customers_rewarded: number;
  created_at: string;
};

export type LoyaltyEventResult = {
  event_id: string;
  event_type: LoyaltyEventType;
  amount_cents: number;
  rewards_issued: number;
  already_recorded: boolean;
};

export type LoyaltyEventSummary = {
  purchases_30d: number;
  visits_30d: number;
  spend_30d_cents: number;
  rewards_30d: number;
};

export type WalletRewardProgress = {
  rule_id: string;
  business_id: string;
  business_name: string;
  business_logo_url: string | null;
  business_accent_color: string;
  rule_name: string;
  trigger_product_name: string;
  reward_product_name: string;
  every_n_redemptions: number;
  qualifying_redemptions: number;
  rewards_earned: number;
  progress_in_cycle: number;
  next_reward_in: number;
  reward_pending: boolean;
  completed: boolean;
  max_rewards_per_wallet: number | null;
};

export type WalletLoyaltyProgress = {
  rule_id: string;
  business_id: string;
  business_name: string;
  business_logo_url: string | null;
  business_accent_color: string;
  rule_name: string;
  trigger_type: AutomationTrigger;
  threshold_value: number;
  trigger_product_name: string | null;
  reward_product_name: string;
  metric_value: number;
  progress_value: number;
  remaining_value: number;
  rewards_earned: number;
  reward_pending: boolean;
  completed: boolean;
  repeatable: boolean;
  max_rewards_per_wallet: number | null;
  created_at: string;
};

export type PublicCampaign = {
  campaign_id: string;
  campaign_name: string;
  campaign_message: string | null;
  business_name: string;
  business_slug: string;
  business_logo_url: string | null;
  business_accent_color: string;
  product_name: string;
  product_description: string | null;
  product_type: "uses" | "balance";
  initial_units: number;
  validity_days: number | null;
  ends_at: string | null;
  claims_remaining: number | null;
  state: "active" | "upcoming" | "ended" | "exhausted" | "disabled";
};

export type CampaignClaim = {
  pass_id: string;
  product_name: string;
  initial_units: number;
  expires_at: string | null;
  already_claimed: boolean;
};

function assertData<T>(data: T | null, error: RpcError | null, fallback: string): T {
  if (error) throw error;
  if (data === null) throw new Error(fallback);
  return data;
}

export async function getBusinessCustomers(businessId: string): Promise<BusinessCustomer[]> {
  const { data, error } = await rpc<BusinessCustomer[]>("business_customer_loyalty_snapshot", { target_business_id: businessId });
  if (error) throw error;
  return data ?? [];
}

export async function getBusinessCampaigns(businessId: string): Promise<LoyaltyCampaign[]> {
  const { data, error } = await rpc<LoyaltyCampaign[]>("business_loyalty_campaigns", { target_business_id: businessId });
  if (error) throw error;
  return data ?? [];
}

export async function createCampaign(input: { businessId: string; productId: string; name: string; message?: string; startsAt?: string | null; endsAt?: string | null; maxClaims?: number | null }) {
  const { data, error } = await rpc<Record<string, unknown>>("create_loyalty_campaign", {
    target_business_id: input.businessId,
    target_product_id: input.productId,
    campaign_name: input.name.trim(),
    campaign_message: input.message?.trim() || null,
    campaign_starts_at: input.startsAt || new Date().toISOString(),
    campaign_ends_at: input.endsAt || null,
    campaign_max_claims: input.maxClaims ?? null,
  });
  return assertData(data, error, "No se pudo crear la campaña.");
}

export async function setCampaignActive(campaignId: string, active: boolean) {
  const { data, error } = await rpc<Record<string, unknown>>("set_loyalty_campaign_active", { target_campaign_id: campaignId, next_active: active });
  return assertData(data, error, "No se pudo actualizar la campaña.");
}

export async function getBusinessRewardRules(businessId: string): Promise<RewardRule[]> {
  const { data, error } = await rpc<RewardRule[]>("business_loyalty_reward_rules", { target_business_id: businessId });
  if (error) throw error;
  return data ?? [];
}

export async function getBusinessAutomationRules(businessId: string): Promise<AutomationRule[]> {
  const { data, error } = await rpc<AutomationRule[]>("business_loyalty_automation_rules", { target_business_id: businessId });
  if (error) throw error;
  return data ?? [];
}

export async function getLoyaltyEventSummary(businessId: string): Promise<LoyaltyEventSummary> {
  const { data, error } = await rpc<LoyaltyEventSummary[]>("business_loyalty_event_summary", { target_business_id: businessId });
  if (error) throw error;
  return data?.[0] ?? { purchases_30d: 0, visits_30d: 0, spend_30d_cents: 0, rewards_30d: 0 };
}

export async function registerLoyaltyEvent(input: { businessId: string; qr: BonoaQrIdentity; type: LoyaltyEventType; amountCents?: number; requestId?: string }): Promise<LoyaltyEventResult> {
  const { data, error } = await rpc<LoyaltyEventResult[]>("register_loyalty_event", {
    target_business_id: input.businessId,
    target_wallet_token: input.qr.token,
    target_qr_version: input.qr.version,
    target_event_type: input.type,
    target_amount_cents: input.type === "visit" ? 0 : Math.max(0, Math.round(input.amountCents ?? 0)),
    request_id: input.requestId ?? crypto.randomUUID(),
  });
  if (error) throw error;
  const event = data?.[0];
  if (!event) throw new Error("No se pudo registrar la actividad.");
  return event;
}

export async function createAutomationRule(input: { businessId: string; name: string; triggerType: AutomationTrigger; thresholdValue: number; triggerProductId?: string | null; rewardProductId: string; repeatable?: boolean; maxRewards?: number | null }) {
  const threshold = input.triggerType === "spend_total" ? Math.round(input.thresholdValue * 100) : Math.round(input.thresholdValue);
  const { data, error } = await rpc<Record<string, unknown>>("create_loyalty_automation_rule", {
    target_business_id: input.businessId,
    rule_name: input.name.trim(),
    rule_trigger_type: input.triggerType,
    rule_threshold_value: threshold,
    target_trigger_product_id: input.triggerType === "product_redemption_count" ? input.triggerProductId ?? null : null,
    target_reward_product_id: input.rewardProductId,
    rule_repeatable: input.repeatable ?? true,
    reward_limit: input.maxRewards ?? null,
  });
  return assertData(data, error, "No se pudo crear la automatización.");
}

export async function setAutomationRuleActive(ruleId: string, active: boolean) {
  const { data, error } = await rpc<Record<string, unknown>>("set_loyalty_automation_rule_active", { target_rule_id: ruleId, next_active: active });
  return assertData(data, error, "No se pudo actualizar la automatización.");
}

export async function getWalletLoyaltyProgress(): Promise<WalletLoyaltyProgress[]> {
  const { data, error } = await rpc<WalletLoyaltyProgress[]>("wallet_loyalty_progress");
  if (error) throw error;
  return data ?? [];
}

export async function getWalletRewardProgress(): Promise<WalletRewardProgress[]> {
  const { data, error } = await rpc<WalletRewardProgress[]>("wallet_reward_progress");
  if (error) throw error;
  return data ?? [];
}

export async function createRewardRule(input: { businessId: string; triggerProductId: string; rewardProductId: string; name: string; every: number; maxRewards?: number | null }) {
  const { data, error } = await rpc<Record<string, unknown>>("create_loyalty_reward_rule", {
    target_business_id: input.businessId,
    target_trigger_product_id: input.triggerProductId,
    target_reward_product_id: input.rewardProductId,
    rule_name: input.name.trim(),
    redemption_threshold: input.every,
    reward_limit: input.maxRewards ?? null,
  });
  return assertData(data, error, "No se pudo crear la recompensa automática.");
}

export async function setRewardRuleActive(ruleId: string, active: boolean) {
  const { data, error } = await rpc<Record<string, unknown>>("set_loyalty_reward_rule_active", { target_rule_id: ruleId, next_active: active });
  return assertData(data, error, "No se pudo actualizar la recompensa.");
}

export async function getPublicCampaign(code: string): Promise<PublicCampaign | null> {
  const { data, error } = await rpc<PublicCampaign[]>("public_loyalty_campaign", { campaign_code: code.trim() });
  if (error) throw error;
  return data?.[0] ?? null;
}

export async function claimCampaign(code: string): Promise<CampaignClaim> {
  const { data, error } = await rpc<CampaignClaim[]>("claim_loyalty_campaign", { campaign_code: code.trim() });
  if (error) throw error;
  const claim = data?.[0];
  if (!claim) throw new Error("No se pudo añadir la recompensa a tu wallet.");
  return claim;
}

export function campaignUrl(code: string) {
  if (typeof window === "undefined") return `/promo/${code}`;
  return `${window.location.origin}/promo/${code}`;
}

export function segmentLabel(segment: CustomerSegment) {
  return { new: "Nuevo", active: "Activo", loyal: "Fiel", at_risk: "En riesgo" }[segment];
}

export function automationTriggerLabel(trigger: AutomationTrigger, thresholdValue: number, productName?: string | null) {
  if (trigger === "purchase_count") return `Cada ${thresholdValue} compra${thresholdValue === 1 ? "" : "s"}`;
  if (trigger === "visit_count") return `Cada ${thresholdValue} visita${thresholdValue === 1 ? "" : "s"}`;
  if (trigger === "spend_total") return `Cada ${(thresholdValue / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" })} gastados`;
  return `Cada ${thresholdValue} consumo${thresholdValue === 1 ? "" : "s"} de ${productName || "un producto"}`;
}
