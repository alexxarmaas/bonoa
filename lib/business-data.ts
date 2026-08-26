import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type ProductRow = Database["public"]["Tables"]["loyalty_products"]["Row"];
type PassRow = Database["public"]["Tables"]["passes"]["Row"];
type BusinessRole = Database["public"]["Enums"]["business_role"];
type ProductType = Database["public"]["Enums"]["loyalty_product_type"];
type PassStatus = Database["public"]["Enums"]["pass_status"];

type IdempotentIssueRpc = (
  fn: "issue_pass_idempotent",
  args: {
    target_product_id: string;
    target_wallet_token: string;
    target_qr_version: number;
    request_id: string;
  },
) => PromiseLike<{ data: PassRow | null; error: { message: string } | null }>;

export type BusinessSummary = BusinessRow & { role: BusinessRole };
export type BusinessTeamMember = Database["public"]["Functions"]["business_members_for_management"]["Returns"][number];

export type ScannedWalletPass = {
  pass_id: string;
  product_id: string;
  product_name: string;
  product_type: ProductType;
  remaining_units: number;
  initial_units: number;
  pass_status: PassStatus;
  expires_at: string | null;
};

export type BonoaQrIdentity = {
  token: string;
  version: number;
};

export function slugifyBusinessName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parseBonoaQr(value: string): BonoaQrIdentity | null {
  const match = value.trim().match(/^bonoa:v(\d+):([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i);
  if (!match) return null;

  const version = Number(match[1]);
  if (!Number.isInteger(version) || version < 1) return null;

  return { version, token: match[2].toLowerCase() };
}

export async function getMyBusinesses(userId: string): Promise<BusinessSummary[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("business_members")
    .select("business_id, role")
    .eq("user_id", userId);

  if (membershipError) throw membershipError;
  if (!memberships?.length) return [];

  const { data: businesses, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .in("id", memberships.map((membership) => membership.business_id));

  if (businessError) throw businessError;

  const roleByBusiness = new Map(memberships.map((membership) => [membership.business_id, membership.role]));
  return (businesses ?? []).map((business) => ({ ...business, role: roleByBusiness.get(business.id) ?? "staff" }));
}

export async function createBusiness(name: string, slug: string): Promise<BusinessRow> {
  const { data, error } = await supabase.rpc("create_business", {
    business_name: name,
    business_slug: slug,
  });

  if (error) throw error;
  if (!data) throw new Error("No se pudo crear el negocio.");
  return data;
}

export async function getBusinessAccess(businessId: string, userId: string) {
  const [{ data: business, error: businessError }, { data: membership, error: membershipError }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", businessId).maybeSingle(),
    supabase.from("business_members").select("role").eq("business_id", businessId).eq("user_id", userId).maybeSingle(),
  ]);

  if (businessError) throw businessError;
  if (membershipError) throw membershipError;
  if (!business || !membership) return null;

  return { business, role: membership.role };
}

export async function getBusinessTeam(businessId: string): Promise<BusinessTeamMember[]> {
  const { data, error } = await supabase.rpc("business_members_for_management", {
    target_business_id: businessId,
  });
  if (error) throw error;
  return data ?? [];
}

export async function addBusinessMember(businessId: string, email: string, role: BusinessRole) {
  const { data, error } = await supabase.rpc("add_business_member", {
    target_business_id: businessId,
    member_email: email.trim(),
    member_role: role,
  });
  if (error) throw error;
  return data;
}

export async function setBusinessMemberRole(businessId: string, userId: string, role: BusinessRole) {
  const { data, error } = await supabase.rpc("set_business_member_role", {
    target_business_id: businessId,
    target_user_id: userId,
    new_role: role,
  });
  if (error) throw error;
  return data;
}

export async function removeBusinessMember(businessId: string, userId: string) {
  const { data, error } = await supabase.rpc("remove_business_member", {
    target_business_id: businessId,
    target_user_id: userId,
  });
  if (error) throw error;
  return data;
}

export async function getBusinessProducts(businessId: string): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from("loyalty_products")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createBusinessProduct(input: {
  businessId: string;
  name: string;
  description?: string;
  type: ProductType;
  initialUnits: number;
  validityDays?: number | null;
}): Promise<ProductRow> {
  if (input.type === "uses" && !Number.isInteger(input.initialUnits)) {
    throw new Error("Los bonos por usos necesitan un número entero de usos.");
  }

  const { data, error } = await supabase
    .from("loyalty_products")
    .insert({
      business_id: input.businessId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      type: input.type,
      initial_units: input.initialUnits,
      validity_days: input.validityDays ?? null,
      active: true,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function setBusinessProductActive(productId: string, active: boolean): Promise<ProductRow> {
  const { data, error } = await supabase
    .from("loyalty_products")
    .update({ active })
    .eq("id", productId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getBusinessMetrics(businessId: string) {
  const [{ count: passes, error: passError }, { count: redemptions, error: redemptionError }] = await Promise.all([
    supabase.from("passes").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("redemptions").select("id", { count: "exact", head: true }).eq("business_id", businessId),
  ]);

  if (passError) throw passError;
  if (redemptionError) throw redemptionError;
  return { passes: passes ?? 0, redemptions: redemptions ?? 0 };
}

export async function getBusinessRecentRedemptions(businessId: string) {
  const { data, error } = await supabase
    .from("redemptions")
    .select("id, pass_id, units, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error) throw error;
  return data ?? [];
}

export async function lookupWalletPasses(
  businessId: string,
  qr: BonoaQrIdentity,
): Promise<ScannedWalletPass[]> {
  const { data, error } = await supabase.rpc("business_wallet_passes", {
    target_business_id: businessId,
    target_wallet_token: qr.token,
    target_qr_version: qr.version,
  });

  if (error) throw error;
  return (data ?? []).map((pass) => ({ ...pass, expires_at: pass.expires_at ?? null }));
}

export async function issuePass(productId: string, qr: BonoaQrIdentity, requestId = crypto.randomUUID()) {
  // database.types.ts is generated from migrations during release preparation. The
  // live project already exposes this RPC and it intentionally returns the same
  // passes row shape as issue_pass.
  const issuePassIdempotent = supabase.rpc as unknown as IdempotentIssueRpc;
  const { data, error } = await issuePassIdempotent("issue_pass_idempotent", {
    target_product_id: productId,
    target_wallet_token: qr.token,
    target_qr_version: qr.version,
    request_id: requestId,
  });

  if (error) throw error;
  if (!data) throw new Error("No se pudo emitir el bono.");
  return data;
}

export async function redeemPass(passId: string, units: number, requestId = crypto.randomUUID()) {
  const { data, error } = await supabase.rpc("redeem_pass", {
    target_pass_id: passId,
    units_to_redeem: units,
    request_id: requestId,
  });

  if (error) throw error;
  return data;
}
