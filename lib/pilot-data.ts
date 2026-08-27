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
  publicly_listed: boolean;
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

const LIMITS = {
  businessName: 120,
  businessDescription: 1000,
  phone: 40,
  url: 300,
  logoUrl: 1200,
  address: 300,
  productName: 120,
  productDescription: 500,
  initialUnits: 1_000_000,
  validityDays: 3650,
  salePriceCents: 100_000_000,
} as const;

function clean(value: string) {
  const normalized = value.trim();
  return normalized || null;
}

function requireText(value: string, label: string, min: number, max: number) {
  const normalized = value.trim();
  if (normalized.length < min) throw new Error(`${label} debe tener al menos ${min} caracteres.`);
  if (normalized.length > max) throw new Error(`${label} no puede superar ${max} caracteres.`);
  return normalized;
}

function optionalText(value: string, label: string, max: number) {
  const normalized = clean(value);
  if (normalized && normalized.length > max) throw new Error(`${label} no puede superar ${max} caracteres.`);
  return normalized;
}

function optionalHttpUrl(value: string, label: string, max: number = LIMITS.url) {
  const normalized = clean(value);
  if (!normalized) return null;
  if (normalized.length > max) throw new Error(`${label} es demasiado larga.`);
  let parsed: URL;
  try { parsed = new URL(normalized); }
  catch { throw new Error(`${label} debe ser una URL completa.`); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error(`${label} debe empezar por http:// o https://.`);
  return parsed.toString();
}

function validateInitialUnits(type: "uses" | "balance", value: number) {
  if (!Number.isFinite(value) || value <= 0 || value > LIMITS.initialUnits) throw new Error("La cantidad inicial del bono no es válida.");
  if (type === "uses" && !Number.isInteger(value)) throw new Error("Los bonos por usos necesitan un número entero de usos.");
  if (type === "balance" && Math.round(value * 100) !== value * 100) throw new Error("El saldo inicial puede tener como máximo dos decimales.");
}

function validateValidityDays(value: number | null) {
  if (value === null) return;
  if (!Number.isInteger(value) || value < 1 || value > LIMITS.validityDays) throw new Error(`La validez debe ser un número entero entre 1 y ${LIMITS.validityDays} días.`);
}

function validateSalePrice(value: number | null) {
  if (value === null) return;
  if (!Number.isInteger(value) || value < 0 || value > LIMITS.salePriceCents) throw new Error("El precio de venta no es válido.");
}

export function formatMoney(cents: number | null, currency = "EUR") {
  if (cents === null) return "Precio no indicado";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency, minimumFractionDigits: 2 }).format(cents / 100);
}

export async function getPilotBusiness(businessId: string): Promise<PilotBusiness> {
  const { data, error } = await supabase.from("businesses").select("*").eq("id", businessId).single();
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
    .filter("publicly_listed", "eq", true)
    .order("created_at", { ascending: false });
  if (productsError) throw productsError;

  return { business: business as PilotBusiness, products: (products ?? []) as PilotProduct[] };
}

export async function updatePilotBusiness(businessId: string, input: BusinessProfileInput): Promise<PilotBusiness> {
  const payload = {
    name: requireText(input.name, "El nombre del negocio", 2, LIMITS.businessName),
    description: optionalText(input.description, "La descripción", LIMITS.businessDescription),
    phone: optionalText(input.phone, "El teléfono", LIMITS.phone),
    website_url: optionalHttpUrl(input.websiteUrl, "La web"),
    instagram_url: optionalHttpUrl(input.instagramUrl, "El enlace de Instagram"),
    address: optionalText(input.address, "La dirección", LIMITS.address),
    logo_url: optionalHttpUrl(input.logoUrl, "La URL del logotipo", LIMITS.logoUrl),
    accent_color: input.accentColor.trim(),
    updated_at: new Date().toISOString(),
  } as unknown as BusinessUpdate;
  if (!/^#[0-9a-f]{6}$/i.test(payload.accent_color ?? "")) throw new Error("El color de marca debe tener formato hexadecimal, por ejemplo #ff5a1f.");

  const { data, error } = await supabase.from("businesses").update(payload).eq("id", businessId).select("*").single();
  if (error) throw error;
  return data as PilotBusiness;
}

export async function uploadBusinessLogo(businessId: string, file: File): Promise<string> {
  const allowed = new Map([["image/png", "png"], ["image/jpeg", "jpg"], ["image/webp", "webp"]]);
  const extension = allowed.get(file.type);
  if (!extension) throw new Error("El logo debe ser PNG, JPG o WEBP.");
  if (file.size <= 0) throw new Error("El archivo del logo está vacío.");
  if (file.size > 2 * 1024 * 1024) throw new Error("El logo no puede superar 2 MB.");

  const path = `${businessId}/logo.${extension}`;
  const { error } = await supabase.storage.from("business-assets").upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
  if (error) throw error;
  const { data } = supabase.storage.from("business-assets").getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function getPilotProducts(businessId: string): Promise<PilotProduct[]> {
  const { data, error } = await supabase.from("loyalty_products").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
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
  publiclyListed?: boolean;
}): Promise<PilotProduct> {
  validateInitialUnits(input.type, input.initialUnits);
  validateValidityDays(input.validityDays);
  validateSalePrice(input.salePriceCents);

  const payload = {
    business_id: input.businessId,
    name: requireText(input.name, "El nombre del bono", 2, LIMITS.productName),
    description: optionalText(input.description, "La descripción del bono", LIMITS.productDescription),
    type: input.type,
    initial_units: input.initialUnits,
    validity_days: input.validityDays,
    sale_price_cents: input.salePriceCents,
    currency: "EUR",
    active: true,
    publicly_listed: input.publiclyListed ?? true,
  } as unknown as ProductInsert;

  const { data, error } = await supabase.from("loyalty_products").insert(payload).select("*").single();
  if (error) throw error;
  return data as PilotProduct;
}

export async function updatePilotProduct(
  productId: string,
  changes: Partial<Pick<PilotProduct, "name" | "description" | "initial_units" | "validity_days" | "sale_price_cents" | "active" | "publicly_listed">>,
): Promise<PilotProduct> {
  const normalized = { ...changes };
  if (typeof normalized.name === "string") normalized.name = requireText(normalized.name, "El nombre del bono", 2, LIMITS.productName);
  if (typeof normalized.description === "string") normalized.description = optionalText(normalized.description, "La descripción del bono", LIMITS.productDescription);
  if (normalized.validity_days !== undefined) validateValidityDays(normalized.validity_days);
  if (normalized.sale_price_cents !== undefined) validateSalePrice(normalized.sale_price_cents);
  if (normalized.initial_units !== undefined && (!Number.isFinite(normalized.initial_units) || normalized.initial_units <= 0 || normalized.initial_units > LIMITS.initialUnits)) throw new Error("La cantidad inicial del bono no es válida.");

  const { data, error } = await supabase
    .from("loyalty_products")
    .update({ ...normalized, updated_at: new Date().toISOString() } as unknown as Database["public"]["Tables"]["loyalty_products"]["Update"])
    .eq("id", productId)
    .select("*")
    .single();
  if (error) throw error;
  return data as PilotProduct;
}

export async function getPilotOnboarding(businessId: string) {
  const [business, productsResult, passResult] = await Promise.all([
    getPilotBusiness(businessId),
    supabase.from("loyalty_products").select("id, sale_price_cents", { count: "exact" }).eq("business_id", businessId).eq("active", true),
    supabase.from("passes").select("id", { count: "exact", head: true }).eq("business_id", businessId),
  ]);
  if (productsResult.error) throw productsResult.error;
  if (passResult.error) throw passResult.error;

  const profileReady = Boolean(business.description?.trim() && (business.phone?.trim() || business.website_url?.trim() || business.instagram_url?.trim()));
  const brandReady = Boolean(business.logo_url?.trim());
  const productReady = (productsResult.count ?? 0) > 0;
  const pricedProductReady = (productsResult.data ?? []).some((product) => product.sale_price_cents !== null);
  const firstPassIssued = (passResult.count ?? 0) > 0;

  return {
    business,
    profileReady,
    brandReady,
    productReady,
    pricedProductReady,
    firstPassIssued,
    completed: [profileReady, brandReady, productReady, pricedProductReady, firstPassIssued].filter(Boolean).length,
    total: 5,
  };
}
