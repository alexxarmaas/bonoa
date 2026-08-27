import { supabase } from "@/lib/supabase/client";
import type { AutomationTrigger, CustomerSegment } from "@/lib/loyalty-growth";

type RpcError = { message: string };
type RpcResult<T> = PromiseLike<{ data: T | null; error: RpcError | null }>;
type RpcClient = <T>(fn: string, args?: Record<string, unknown>) => RpcResult<T>;

const rpc = supabase.rpc as unknown as RpcClient;

export type WalletMembership = {
  membership_id: string;
  business_id: string;
  business_name: string;
  business_logo_url: string | null;
  business_accent_color: string;
  joined_at: string;
  last_activity_at: string;
  purchases: number;
  visits: number;
  spend_cents: number;
  rewards_earned: number;
  segment: CustomerSegment;
};

export type MembershipRuleProgress = {
  rule_id: string;
  business_id: string;
  rule_name: string;
  trigger_type: AutomationTrigger;
  threshold_value: number;
  minimum_purchase_cents: number;
  trigger_product_name: string | null;
  reward_product_name: string;
  metric_value: number;
  progress_value: number;
  remaining_value: number;
  rewards_earned: number;
  completed: boolean;
  repeatable: boolean;
  max_rewards_per_wallet: number | null;
  created_at: string;
};

export type WalletNotification = {
  notification_id: string;
  business_id: string | null;
  business_name: string | null;
  notification_type: "purchase" | "visit" | "redemption" | "reward" | "campaign" | "system";
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type WalletTransaction = {
  transaction_id: string;
  transaction_type: "purchase" | "visit" | "redemption" | "pass_issued" | "reward" | "campaign";
  business_id: string;
  business_name: string;
  product_id: string | null;
  product_name: string | null;
  amount_cents: number;
  units: number;
  balance_before: number | null;
  balance_after: number | null;
  occurred_at: string;
  reference_code: string;
};

export type BusinessLoyaltyOpportunities = {
  members_total: number;
  recurrent_customers: number;
  loyal_customers: number;
  at_risk_customers: number;
  new_7d: number;
  near_reward_customers: number;
  purchases_30d: number;
  spend_30d_cents: number;
  rewards_30d: number;
};

export async function getWalletMemberships(): Promise<WalletMembership[]> {
  const { data, error } = await rpc<WalletMembership[]>("wallet_memberships");
  if (error) throw error;
  return data ?? [];
}

export async function getMembershipRuleProgress(): Promise<MembershipRuleProgress[]> {
  const { data, error } = await rpc<MembershipRuleProgress[]>("wallet_membership_rule_progress");
  if (error) throw error;
  return data ?? [];
}

export async function getWalletNotifications(limit = 50): Promise<WalletNotification[]> {
  const { data, error } = await rpc<WalletNotification[]>("wallet_notifications_feed", { target_limit: limit });
  if (error) throw error;
  return data ?? [];
}

export async function markWalletNotificationRead(notificationId: string) {
  const { data, error } = await rpc<boolean>("mark_wallet_notification_read", { target_notification_id: notificationId });
  if (error) throw error;
  return Boolean(data);
}

export async function markAllWalletNotificationsRead() {
  const { data, error } = await rpc<number>("mark_all_wallet_notifications_read");
  if (error) throw error;
  return data ?? 0;
}

export async function getWalletTransactions(limit = 100): Promise<WalletTransaction[]> {
  const { data, error } = await rpc<WalletTransaction[]>("wallet_transaction_history", { target_limit: limit });
  if (error) throw error;
  return data ?? [];
}

export async function getBusinessLoyaltyOpportunities(businessId: string): Promise<BusinessLoyaltyOpportunities> {
  const { data, error } = await rpc<BusinessLoyaltyOpportunities[]>("business_loyalty_opportunities", { target_business_id: businessId });
  if (error) throw error;
  return data?.[0] ?? {
    members_total: 0,
    recurrent_customers: 0,
    loyal_customers: 0,
    at_risk_customers: 0,
    new_7d: 0,
    near_reward_customers: 0,
    purchases_30d: 0,
    spend_30d_cents: 0,
    rewards_30d: 0,
  };
}

export function membershipSegmentLabel(segment: CustomerSegment) {
  return { new: "Nuevo", active: "Miembro", loyal: "Fiel", at_risk: "En riesgo" }[segment];
}

export function qualifiedPurchaseLabel(minimumPurchaseCents: number) {
  if (!minimumPurchaseCents) return null;
  return `Compras de al menos ${(minimumPurchaseCents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}`;
}
