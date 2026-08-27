import { supabase } from "@/lib/supabase/client";

export type OnboardingTemplateKey = "five_visits" | "ten_purchases" | "ten_purchases_50" | "spend_100";

type RpcError = { message: string };
type RpcResult<T> = PromiseLike<{ data: T | null; error: RpcError | null }>;
type RpcClient = <T>(fn: string, args?: Record<string, unknown>) => RpcResult<T>;
const rpc = supabase.rpc as unknown as RpcClient;

function unwrap<T>(data: T | null, error: RpcError | null, message: string): T {
  if (error) throw error;
  if (data === null) throw new Error(message);
  return data;
}

export type CustomerDetail = {
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
  segment: "new" | "active" | "loyal" | "at_risk";
  days_since_activity: number;
  passes: Array<{ pass_id: string; product_id: string; product_name: string; remaining_units: number; initial_units: number; status: string; expires_at: string | null }>;
  progress: Array<{ rule_id: string; rule_name: string; trigger_type: string; threshold_value: number; minimum_purchase_cents: number; reward_product_name: string; metric_value: number }>;
};

export type CustomerTimelineEvent = {
  event_id: string;
  event_type: string;
  title: string;
  detail: string;
  amount_cents: number;
  units: number | null;
  occurred_at: string;
  reference_code: string;
};

export type PublicProgramRule = {
  business_id: string;
  business_name: string;
  business_slug: string;
  business_logo_url: string | null;
  business_accent_color: string;
  club_name: string | null;
  club_message: string | null;
  membership_badge_label: string;
  rule_id: string | null;
  rule_name: string | null;
  trigger_type: string | null;
  threshold_value: number | null;
  minimum_purchase_cents: number | null;
  reward_product_name: string | null;
};

export type CampaignPerformance = { campaign_id: string; claims: number; converted_customers: number; identified_revenue_cents: number };
export type ReferralProgram = { business_id: string; active: boolean; headline: string; minimum_purchase_cents: number; referrer_reward_product_id: string; referrer_reward_product_name: string; referred_reward_product_id: string | null; referred_reward_product_name: string | null };
export type ReferralLink = { code: string; business_slug: string; headline: string };
export type PublicReferral = { code: string; business_id: string; business_name: string; business_slug: string; business_logo_url: string | null; business_accent_color: string; headline: string; minimum_purchase_cents: number; referrer_reward: string; referred_reward: string | null };
export type ReferralStats = { invites: number; claims: number; converted: number };
export type FraudSettings = { enabled: boolean; min_event_interval_seconds: number; max_events_per_wallet_hour: number };
export type RiskEvent = { risk_id: string; risk_type: "duplicate_event" | "rate_limit" | "self_referral" | "referral_reuse"; customer_code: string | null; actor_id: string | null; metadata: Record<string, unknown>; created_at: string };

export async function updateBusinessClubProfile(businessId: string, input: { clubName: string; clubMessage: string; badgeLabel: string }) {
  const { data, error } = await rpc<Record<string, unknown>>("update_business_club_profile", {
    target_business_id: businessId,
    target_club_name: input.clubName.trim() || null,
    target_club_message: input.clubMessage.trim() || null,
    target_badge_label: input.badgeLabel.trim() || "MIEMBRO",
  });
  return unwrap(data, error, "No se pudo actualizar el carnet.");
}

export async function setupLoyaltyProgramTemplate(businessId: string, templateKey: OnboardingTemplateKey, rewardName: string) {
  const { data, error } = await rpc<Record<string, unknown>>("setup_loyalty_program_template", {
    target_business_id: businessId,
    template_key: templateKey,
    reward_name: rewardName.trim(),
  });
  return unwrap(data, error, "No se pudo crear la fidelización inicial.");
}

export async function getBusinessCustomerDetail(businessId: string, walletId: string): Promise<CustomerDetail> {
  const { data, error } = await rpc<CustomerDetail>("business_customer_detail", { target_business_id: businessId, target_wallet_id: walletId });
  return unwrap(data, error, "No se pudo cargar el cliente.");
}

export async function getBusinessCustomerTimeline(businessId: string, walletId: string, limit = 100): Promise<CustomerTimelineEvent[]> {
  const { data, error } = await rpc<CustomerTimelineEvent[]>("business_customer_timeline", { target_business_id: businessId, target_wallet_id: walletId, target_limit: limit });
  if (error) throw error;
  return data ?? [];
}

export async function getBusinessWalletSnapshot(businessId: string, qr: { token: string; version: number }): Promise<CustomerDetail> {
  const { data, error } = await rpc<CustomerDetail>("business_wallet_snapshot", { target_business_id: businessId, target_wallet_token: qr.token, target_qr_version: qr.version });
  return unwrap(data, error, "No se pudo cargar el cliente.");
}

export async function getPublicBusinessProgram(slug: string): Promise<PublicProgramRule[]> {
  const { data, error } = await rpc<PublicProgramRule[]>("public_business_loyalty_program", { target_slug: slug });
  if (error) throw error;
  return data ?? [];
}

export async function joinPublicBusiness(slug: string) {
  const { data, error } = await rpc<string>("join_public_business", { target_business_slug: slug });
  return unwrap(data, error, "No se pudo añadir el carnet.");
}

export async function refreshWalletSystemNotifications() {
  const { data, error } = await rpc<number>("refresh_wallet_system_notifications");
  if (error) throw error;
  return data ?? 0;
}

export async function getBusinessCampaignPerformance(businessId: string): Promise<CampaignPerformance[]> {
  const { data, error } = await rpc<CampaignPerformance[]>("business_campaign_performance", { target_business_id: businessId });
  if (error) throw error;
  return data ?? [];
}

export async function getBusinessReferralProgram(businessId: string): Promise<ReferralProgram | null> {
  const { data, error } = await rpc<ReferralProgram>("business_referral_program", { target_business_id: businessId });
  if (error) throw error;
  return data;
}

export async function saveBusinessReferralProgram(input: { businessId: string; referrerRewardProductId: string; referredRewardProductId: string | null; minimumPurchaseCents: number; headline: string; active: boolean }) {
  const { data, error } = await rpc<Record<string, unknown>>("upsert_business_referral_program", {
    target_business_id: input.businessId,
    target_referrer_reward_product_id: input.referrerRewardProductId,
    target_referred_reward_product_id: input.referredRewardProductId,
    target_minimum_purchase_cents: input.minimumPurchaseCents,
    target_headline: input.headline,
    target_active: input.active,
  });
  return unwrap(data, error, "No se pudo guardar el programa de referidos.");
}

export async function getWalletReferralLink(businessId: string): Promise<ReferralLink> {
  const { data, error } = await rpc<ReferralLink>("wallet_referral_link", { target_business_id: businessId });
  return unwrap(data, error, "Este negocio no tiene referidos activos.");
}

export async function getPublicReferral(code: string): Promise<PublicReferral | null> {
  const { data, error } = await rpc<PublicReferral>("public_referral", { referral_code: code });
  if (error) throw error;
  return data;
}

export async function claimReferral(code: string) {
  const { data, error } = await rpc<{ claim_id?: string; status: string; reason?: string; already_claimed?: boolean }>("claim_referral", { referral_code: code });
  return unwrap(data, error, "No se pudo aceptar la invitación.");
}

export async function getBusinessReferralStats(businessId: string): Promise<ReferralStats> {
  const { data, error } = await rpc<ReferralStats>("business_referral_stats", { target_business_id: businessId });
  return unwrap(data, error, "No se pudieron cargar los referidos.");
}

export async function getBusinessFraudSettings(businessId: string): Promise<FraudSettings> {
  const { data, error } = await rpc<FraudSettings>("get_business_fraud_settings", { target_business_id: businessId });
  return unwrap(data, error, "No se pudo cargar la protección antifraude.");
}

export async function saveBusinessFraudSettings(businessId: string, settings: FraudSettings) {
  const { data, error } = await rpc<FraudSettings>("update_business_fraud_settings", {
    target_business_id: businessId,
    target_enabled: settings.enabled,
    target_min_interval: settings.min_event_interval_seconds,
    target_max_hour: settings.max_events_per_wallet_hour,
  });
  return unwrap(data, error, "No se pudo guardar la protección antifraude.");
}

export async function getBusinessRiskEvents(businessId: string, limit = 50): Promise<RiskEvent[]> {
  const { data, error } = await rpc<RiskEvent[]>("business_risk_events_feed", { target_business_id: businessId, target_limit: limit });
  if (error) throw error;
  return data ?? [];
}
