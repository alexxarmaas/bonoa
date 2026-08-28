import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];
type BusinessUpdate = Database["public"]["Tables"]["businesses"]["Update"];
type ProductRow = Database["public"]["Tables"]["loyalty_products"]["Row"];

export const DIRECTORY_CATEGORIES = [
  { value: "restauracion", label: "Restauración" },
  { value: "automocion", label: "Automoción" },
  { value: "belleza", label: "Belleza" },
  { value: "deporte", label: "Deporte" },
  { value: "comercio", label: "Comercio" },
  { value: "ocio", label: "Ocio" },
  { value: "servicios", label: "Servicios" },
  { value: "otros", label: "Otros" },
] as const;

export type DirectoryCategory = (typeof DIRECTORY_CATEGORIES)[number]["value"];

type DirectoryBusinessRow = BusinessRow & {
  accent_color: string;
  address: string | null;
  description: string | null;
  directory_category: DirectoryCategory | null;
  directory_listed: boolean;
};

type DirectoryProductRow = ProductRow & {
  currency: string;
  publicly_listed: boolean;
  sale_price_cents: number | null;
};

export type DirectoryOffer = Pick<
  DirectoryProductRow,
  "id" | "name" | "description" | "sale_price_cents" | "currency" | "type" | "initial_units"
>;

export type DirectoryBusiness = Pick<
  DirectoryBusinessRow,
  | "id"
  | "name"
  | "slug"
  | "logo_url"
  | "description"
  | "address"
  | "accent_color"
  | "directory_category"
  | "created_at"
> & {
  offers: DirectoryOffer[];
};

export type BusinessDirectorySettings = Pick<
  DirectoryBusinessRow,
  "id" | "name" | "slug" | "directory_listed" | "directory_category"
>;

const categoryValues = new Set<string>(DIRECTORY_CATEGORIES.map((item) => item.value));

export function directoryCategoryLabel(category: DirectoryCategory | null) {
  return DIRECTORY_CATEGORIES.find((item) => item.value === category)?.label ?? "Otros";
}

export async function getDirectoryBusinesses(): Promise<DirectoryBusiness[]> {
  const { data: businessData, error: businessError } = await supabase
    .from("businesses")
    .select("*")
    .eq("status", "active")
    .filter("directory_listed", "eq", true)
    .order("created_at", { ascending: false });

  if (businessError) throw businessError;

  const businesses = (businessData ?? []) as unknown as DirectoryBusinessRow[];
  if (!businesses.length) return [];

  const businessIds = businesses.map((business) => business.id);
  const { data: productData, error: productError } = await supabase
    .from("loyalty_products")
    .select("*")
    .in("business_id", businessIds)
    .eq("active", true)
    .filter("publicly_listed", "eq", true)
    .order("created_at", { ascending: false });

  if (productError) throw productError;

  const offersByBusiness = new Map<string, DirectoryOffer[]>();
  ((productData ?? []) as unknown as DirectoryProductRow[]).forEach((product) => {
    const current = offersByBusiness.get(product.business_id) ?? [];
    current.push({
      id: product.id,
      name: product.name,
      description: product.description,
      sale_price_cents: product.sale_price_cents,
      currency: product.currency,
      type: product.type,
      initial_units: product.initial_units,
    });
    offersByBusiness.set(product.business_id, current);
  });

  return businesses.map((business) => ({
    id: business.id,
    name: business.name,
    slug: business.slug,
    logo_url: business.logo_url,
    description: business.description,
    address: business.address,
    accent_color: business.accent_color,
    directory_category: business.directory_category,
    created_at: business.created_at,
    offers: (offersByBusiness.get(business.id) ?? []).slice(0, 3),
  }));
}

export async function getBusinessDirectorySettings(businessId: string): Promise<BusinessDirectorySettings> {
  const { data, error } = await supabase.from("businesses").select("*").eq("id", businessId).single();
  if (error) throw error;
  const business = data as unknown as DirectoryBusinessRow;
  return {
    id: business.id,
    name: business.name,
    slug: business.slug,
    directory_listed: business.directory_listed,
    directory_category: business.directory_category,
  };
}

export async function updateBusinessDirectorySettings(
  businessId: string,
  input: { listed: boolean; category: DirectoryCategory | null },
): Promise<void> {
  if (input.listed && !input.category) throw new Error("Elige una categoría antes de publicar el negocio.");
  if (input.category && !categoryValues.has(input.category)) throw new Error("La categoría seleccionada no es válida.");

  const payload = {
    directory_listed: input.listed,
    directory_category: input.category,
    updated_at: new Date().toISOString(),
  } as unknown as BusinessUpdate;

  const { error } = await supabase.from("businesses").update(payload).eq("id", businessId);
  if (error) throw error;
}
