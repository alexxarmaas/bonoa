import { supabase } from "@/lib/supabase/client";
import type { Database, Json } from "@/lib/supabase/database.types";

type PassStatus = Database["public"]["Enums"]["pass_status"];
type ProductType = Database["public"]["Enums"]["loyalty_product_type"];

type RpcResult<T> = Promise<{ data: T | null; error: { message?: string } | null }>;
type AnalyticsRpc = (
  name: string,
  args: Record<string, string | number | null>,
) => RpcResult<unknown>;

const rpc = supabase.rpc.bind(supabase) as unknown as AnalyticsRpc;

export type BusinessDashboardMetrics = {
  total_passes: number;
  active_passes: number;
  exhausted_passes: number;
  expired_passes: number;
  cancelled_passes: number;
  unique_wallets: number;
  redemptions_total: number;
  redemptions_today: number;
  redemptions_7d: number;
  units_redeemed_30d: number;
  issued_30d: number;
  expiring_30d: number;
};

export type BusinessProductMetric = {
  product_id: string;
  product_name: string;
  product_type: ProductType;
  active: boolean;
  passes_issued: number;
  active_passes: number;
  redemptions: number;
  units_redeemed: number;
};

export type BusinessManagedPass = {
  pass_id: string;
  product_id: string;
  product_name: string;
  product_type: ProductType;
  pass_status: PassStatus;
  initial_units: number;
  remaining_units: number;
  purchased_at: string;
  expires_at: string | null;
  updated_at: string;
};

export type BusinessAuditEvent = {
  event_id: string;
  event_type: string;
  pass_id: string | null;
  product_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  metadata: Json;
  created_at: string;
};

function unwrap<T>(value: unknown): T {
  return value as T;
}

export async function getBusinessDashboardMetrics(businessId: string): Promise<BusinessDashboardMetrics> {
  const { data, error } = await rpc("business_dashboard_metrics", { target_business_id: businessId });
  if (error) throw error;
  const rows = unwrap<BusinessDashboardMetrics[]>(data ?? []);
  return rows[0] ?? {
    total_passes: 0,
    active_passes: 0,
    exhausted_passes: 0,
    expired_passes: 0,
    cancelled_passes: 0,
    unique_wallets: 0,
    redemptions_total: 0,
    redemptions_today: 0,
    redemptions_7d: 0,
    units_redeemed_30d: 0,
    issued_30d: 0,
    expiring_30d: 0,
  };
}

export async function getBusinessProductMetrics(businessId: string): Promise<BusinessProductMetric[]> {
  const { data, error } = await rpc("business_product_metrics", { target_business_id: businessId });
  if (error) throw error;
  return unwrap<BusinessProductMetric[]>(data ?? []);
}

export async function getBusinessManagedPasses(input: {
  businessId: string;
  status?: PassStatus | null;
  productId?: string | null;
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<BusinessManagedPass[]> {
  const { data, error } = await rpc("business_passes_for_management", {
    target_business_id: input.businessId,
    status_filter: input.status ?? null,
    product_filter: input.productId ?? null,
    search_query: input.query?.trim() || "",
    page_limit: input.limit ?? 50,
    page_offset: input.offset ?? 0,
  });
  if (error) throw error;
  return unwrap<BusinessManagedPass[]>(data ?? []);
}

export async function getBusinessAuditFeed(
  businessId: string,
  limit = 50,
  offset = 0,
): Promise<BusinessAuditEvent[]> {
  const { data, error } = await rpc("business_audit_feed", {
    target_business_id: businessId,
    page_limit: limit,
    page_offset: offset,
  });
  if (error) throw error;
  return unwrap<BusinessAuditEvent[]>(data ?? []);
}
