import { supabase } from "@/lib/supabase/client";

type RpcError = { message: string };
type RpcResult<T> = PromiseLike<{ data: T | null; error: RpcError | null }>;
type RpcClient = <T>(fn: string, args?: Record<string, unknown>) => RpcResult<T>;
const rpc = supabase.rpc as unknown as RpcClient;

function unwrap<T>(data: T | null, error: RpcError | null, message: string): T {
  if (error) throw error;
  if (data === null) throw new Error(message);
  return data;
}

export type AdminOverview = {
  businesses_total: number;
  businesses_active: number;
  businesses_listed: number;
  users_total: number;
  wallets_total: number;
  memberships_total: number;
  passes_total: number;
  loyalty_events_total: number;
  risk_events_30d: number;
};

export type AdminBusiness = {
  business_id: string;
  business_name: string;
  business_slug: string;
  business_status: "active" | "inactive" | "suspended";
  directory_listed: boolean;
  directory_category: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  members: number;
  customers: number;
  passes: number;
  loyalty_events: number;
};

export type AdminUser = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  businesses: number;
  memberships: number;
  passes: number;
};

export async function isPlatformAdmin() {
  const { data, error } = await rpc<boolean>("is_platform_admin");
  if (error) throw error;
  return data === true;
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const { data, error } = await rpc<AdminOverview[]>("admin_overview");
  const rows = unwrap(data, error, "No se pudieron cargar las métricas de administración.");
  if (!rows[0]) throw new Error("No se pudieron cargar las métricas de administración.");
  return rows[0];
}

export async function getAdminBusinesses(): Promise<AdminBusiness[]> {
  const { data, error } = await rpc<AdminBusiness[]>("admin_businesses");
  if (error) throw error;
  return data ?? [];
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await rpc<AdminUser[]>("admin_users");
  if (error) throw error;
  return data ?? [];
}

export async function setAdminBusinessStatus(
  businessId: string,
  status: AdminBusiness["business_status"],
) {
  const { data, error } = await rpc<string>("admin_set_business_status", {
    target_business_id: businessId,
    next_status: status,
  });
  return unwrap(data, error, "No se pudo cambiar el estado del negocio.");
}
