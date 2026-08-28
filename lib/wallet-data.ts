import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type PassRow = Database["public"]["Tables"]["passes"]["Row"];
type ProductRow = Database["public"]["Tables"]["loyalty_products"]["Row"];
type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type PilotPassRow = PassRow & { issued_price_cents: number | null; issued_currency: string | null };

export type WalletPassStatus = "active" | "expiring_soon" | "exhausted" | "expired" | "cancelled";

export type WalletPass = {
  id: string;
  businessId: string;
  businessName: string;
  businessLogoUrl: string | null;
  businessAccentColor: string;
  productId: string;
  productName: string;
  description: string;
  productType: "uses" | "balance";
  initialUnits: number;
  remainingUnits: number;
  purchasedAt: string;
  expiresAt: string | null;
  status: WalletPassStatus;
  issuedPriceCents: number | null;
  issuedCurrency: string | null;
};

export type WalletIdentity = {
  id: string;
  publicToken: string;
  qrVersion: number;
};

export type WalletRedemption = {
  id: string;
  passId: string;
  businessName: string;
  productName: string;
  units: number;
  createdAt: string;
};

function displayStatus(pass: PassRow): WalletPassStatus {
  if (pass.status !== "active") return pass.status;
  if (!pass.expires_at) return "active";

  const expiresAt = new Date(pass.expires_at).getTime();
  const now = Date.now();
  if (expiresAt <= now) return "expired";

  const fourteenDays = 14 * 24 * 60 * 60 * 1000;
  return expiresAt - now <= fourteenDays ? "expiring_soon" : "active";
}

function mapWalletIdentity(data: Database["public"]["Tables"]["wallets"]["Row"]): WalletIdentity {
  return { id: data.id, publicToken: data.public_token, qrVersion: data.qr_version };
}

export async function getWalletIdentity(userId: string): Promise<WalletIdentity | null> {
  const { data, error } = await supabase
    .from("wallets")
    .select("id, public_token, qr_version")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return { id: data.id, publicToken: data.public_token, qrVersion: data.qr_version };
}

export async function rotateWalletQr(): Promise<WalletIdentity> {
  const { data, error } = await supabase.rpc("rotate_wallet_qr");
  if (error) throw error;
  if (!data) throw new Error("No se pudo renovar el QR.");
  return mapWalletIdentity(data);
}

export async function getWalletPasses(userId: string): Promise<WalletPass[]> {
  const wallet = await getWalletIdentity(userId);
  if (!wallet) return [];

  const { data: passes, error: passError } = await supabase
    .from("passes")
    .select("*")
    .eq("wallet_id", wallet.id)
    .order("purchased_at", { ascending: false });

  if (passError) throw passError;
  if (!passes?.length) return [];

  const productIds = [...new Set(passes.map((pass) => pass.loyalty_product_id))];
  const businessIds = [...new Set(passes.map((pass) => pass.business_id))];

  const [{ data: products, error: productError }, { data: businesses, error: businessError }] = await Promise.all([
    supabase.from("loyalty_products").select("*").in("id", productIds),
    supabase.from("businesses").select("*").in("id", businessIds),
  ]);

  if (productError) throw productError;
  if (businessError) throw businessError;

  const productMap = new Map<string, ProductRow>((products ?? []).map((product) => [product.id, product]));
  const businessMap = new Map<string, BusinessRow>((businesses ?? []).map((business) => [business.id, business]));

  return passes.map((pass) => {
    const product = productMap.get(pass.loyalty_product_id);
    const business = businessMap.get(pass.business_id);
    const pilotPass = pass as PilotPassRow;

    return {
      id: pass.id,
      businessId: pass.business_id,
      businessName: business?.name ?? "Establecimiento",
      businessLogoUrl: business?.logo_url ?? null,
      businessAccentColor: business?.accent_color ?? "#ff5a1f",
      productId: pass.loyalty_product_id,
      productName: product?.name ?? "Bono",
      description: product?.description ?? "Fidelización Bonoa",
      productType: product?.type ?? "uses",
      initialUnits: Number(pass.initial_units),
      remainingUnits: Number(pass.remaining_units),
      purchasedAt: pass.purchased_at,
      expiresAt: pass.expires_at,
      status: displayStatus(pass),
      issuedPriceCents: pilotPass.issued_price_cents ?? null,
      issuedCurrency: pilotPass.issued_currency ?? null,
    };
  });
}

export async function getWalletPass(userId: string, passId: string): Promise<WalletPass | null> {
  const passes = await getWalletPasses(userId);
  return passes.find((pass) => pass.id === passId) ?? null;
}

export async function getWalletHistory(userId: string): Promise<WalletRedemption[]> {
  const passes = await getWalletPasses(userId);
  if (!passes.length) return [];

  const passMap = new Map(passes.map((pass) => [pass.id, pass]));
  const { data, error } = await supabase
    .from("redemptions")
    .select("id, pass_id, units, created_at")
    .in("pass_id", passes.map((pass) => pass.id))
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).flatMap((redemption): WalletRedemption[] => {
    if (!redemption.pass_id) return [];
    const pass = passMap.get(redemption.pass_id);
    return [{
      id: redemption.id,
      passId: redemption.pass_id,
      businessName: pass?.businessName ?? "Establecimiento",
      productName: pass?.productName ?? "Bono",
      units: Number(redemption.units),
      createdAt: redemption.created_at,
    }];
  });
}