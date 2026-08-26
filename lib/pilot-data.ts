import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type BusinessUpdate = Database["public"]["Tables"]["businesses"]["Update"];
type ProductRow = Database["public"]["Tables"]["loyalty_products"]["Row"];
type ProductInsert = Database["public"]["Tables"]["loyalty_products"]["Insert"];

export type PilotBusiness = BusinessRow & {
  description: string | null;
  phone: string | null;
  website_url: string | null;
  instagram_url: string | null;
  address: string | null;
  accent_color: string;
};

export type PilotProduct = ProductRow & {
  sale_price_cents: number | null;
  currency: string;
};

export type PilotPassSnapshot = {
  issued_price_cents: number | null;
  issued_currency: string | null;
};

export type BusinessProfileInput = {
  name: string;
  description: string;
  phone: string;
  websiteUrl: string;
  instagramUrl: string;
  address: string;
  logoUrl: string;
  accentColor: string;
};

function clean(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

export function formatMoney(cents: number | null, currency = "EUR") {
  if (cents === null) return "Precio no indicado";
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export async function getPilotBusiness(businessId: string): Promise<PilotBusiness> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  if (error) throw error;
  return data as PilotBusiness;
}

export async function getPublicBusinessBySlug(slug: string): Promise<{ business: PilotBusiness; products: PilotProduct[] } | null> {
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (businessError) throw businessError;
  if (!business) return null;

  const { data: products, error: productsError } = await supabase
    .from("loyalty_products")
    .select("*")
    .eq("business_id", business.id)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (productsError) throw productsError;
  return {
    business: business as PilotBusiness,
    products: (products ?? []) as PilotProduct[],
  };
}

export async function updatePilotBusiness(businessId: string, input: BusinessProfileInput): Promise<PilotBusiness> {
  const payload = {
    name: input.name.trim(),
    description: clean(input.description),
    phone: clean(input.phone),
    website_url: clean(input.websiteUrl),
    instagram_url: clean(input.instagramUrl),
    address: clean(input.address),
    logo_url: clean(input.logoUrl),
    accent_color: input.accentColor,
    updated_at: new Date().toISOString(),
  } as unknown as BusinessUpdate;

  const { data, error } = await supabase
    .from("businesses")
    .update(payload)
    .eq("id", businessId)
    .select("*")
    .single();

  if (error) throw error;
  return data as PilotBusiness;
}

export async function uploadBusinessLogo(businessId: string, file: File): Promise<string> {
  const allowed = new Map([
    ["image/png", "png"],
    ["image/jpeg", "jpg"],
    ["image/webp", "webp"],
  ]);
  const extension = allowed.get(file.type);
  if (!extension) throw new Error("El logo debe ser PNG, JPG o WEBP.");
  if (file.size > 2 * 1024 * 1024) throw new Error("El logo no puede superar 2 MB.");

  const path = `${businessId}/logo.${extension}`;
  const { error } = await supabase.storage
    .from("business-assets")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (error) throw error;
  const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function getPilotProducts(businessId: string): Promise<PilotProduct[]> {
  const { data, error } = await supabase
    .from("loyalty_products")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PilotProduct[];
}

export async function createPilotProduct(input: {
  businessId: string;
  name: string;
  description: string;
  type: "uses" | "balance";
  initialUnits: number;
  validityDays: number | null;
  salePriceCents: number | null;
}): Promise<PilotProduct> {
  const payload = {
    business_id: input.businessId,
    name: input.name.trim(),
    description: clean(input.description),
    type: input.type,
    initial_units: input.initialUnits,
    validity_days: input.validityDays,
    sale_price_cents: input.salePriceCents,
    currency: "EUR",
    active: true,
  } as unknown as ProductInsert;

  const { data, error } = await supabase
    .from("loyalty_products")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw error;
  return data as PilotProduct;
}

export async function updatePilotProduct(productId: string, changes: Partial<Pick<PilotProduct, "name" | "description" | "initial_units" | "validity_days" | "sale_price_cents" | "active">>): Promise<PilotProduct> {
  const { data, error } = await supabase
    .from("loyalty_products")
    .update({ ...changes, updated_at: new Date().toISOString() } as unknown as Database["public"]["Tables"]["loyalty_products"]["Update"])
    .eq("id", productId)
    .select("*")
    .single();

  if (error) throw error;
  return data as PilotProduct;
}

export async function getPilotOnboarding(businessId: string) {
  const [business, productsResult, passResult] = await Promise.all([
    getPilotBusiness(businessId),
    supabase.from("loyalty_products").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("active", true),
    supabase.from("passes").select("id", { count: "exact", head: true }).eq("business_id", businessId),
  ]);

  if (productsResult.error) throw productsResult.error;
  if (passResult.error) throw passResult.error;

  const profileReady = Boolean(
    business.description?.trim() &&
    (business.phone?.trim() || business.website_url?.trim() || business.instagram_url?.trim())
  );
  const productReady = (productsResult.count ?? 0) > 0;
  const firstPassIssued = (passResult.count ?? 0) > 0;

  return {
    business,
    profileReady,
    productReady,
    firstPassIssued,
    completed: [profileReady, productReady, firstPassIssued].filter(Boolean).length,
    total: 3,
  };
}
