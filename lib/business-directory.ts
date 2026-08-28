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

export type DirectoryCoordinates = {
  latitude: number;
  longitude: number;
};

type DirectoryBusinessRow = BusinessRow & {
  accent_color: string;
  address: string | null;
  description: string | null;
  directory_category: DirectoryCategory | null;
  directory_listed: boolean;
  directory_latitude: number | null;
  directory_longitude: number | null;
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
  | "directory_latitude"
  | "directory_longitude"
  | "created_at"
> & {
  offers: DirectoryOffer[];
};

export type BusinessDirectorySettings = Pick<
  DirectoryBusinessRow,
  | "id"
  | "name"
  | "slug"
  | "directory_listed"
  | "directory_category"
  | "directory_latitude"
  | "directory_longitude"
>;

const categoryValues = new Set<string>(DIRECTORY_CATEGORIES.map((item) => item.value));

export function directoryCategoryLabel(category: DirectoryCategory | null) {
  return DIRECTORY_CATEGORIES.find((item) => item.value === category)?.label ?? "Otros";
}

export function directoryCoordinates(business: DirectoryBusiness): DirectoryCoordinates | null {
  if (business.directory_latitude === null || business.directory_longitude === null) return null;
  return { latitude: business.directory_latitude, longitude: business.directory_longitude };
}

export function distanceKm(from: DirectoryCoordinates, to: DirectoryCoordinates) {
  const radiusKm = 6371;
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = radians(to.latitude - from.latitude);
  const deltaLon = radians(to.longitude - from.longitude);
  const lat1 = radians(from.latitude);
  const lat2 = radians(to.latitude);
  const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    directory_latitude: business.directory_latitude,
    directory_longitude: business.directory_longitude,
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
    directory_latitude: business.directory_latitude,
    directory_longitude: business.directory_longitude,
  };
}

export async function updateBusinessDirectorySettings(
  businessId: string,
  input: {
    listed: boolean;
    category: DirectoryCategory | null;
    latitude?: number | null;
    longitude?: number | null;
  },
): Promise<void> {
  if (input.listed && !input.category) throw new Error("Elige una categoría antes de publicar el negocio.");
  if (input.category && !categoryValues.has(input.category)) throw new Error("La categoría seleccionada no es válida.");

  const hasLatitude = input.latitude !== undefined && input.latitude !== null;
  const hasLongitude = input.longitude !== undefined && input.longitude !== null;
  if (hasLatitude !== hasLongitude) throw new Error("La ubicación debe incluir latitud y longitud.");
  if (hasLatitude && (input.latitude! < -90 || input.latitude! > 90)) throw new Error("La latitud no es válida.");
  if (hasLongitude && (input.longitude! < -180 || input.longitude! > 180)) throw new Error("La longitud no es válida.");

  const payload = {
    directory_listed: input.listed,
    directory_category: input.category,
    ...(input.latitude !== undefined ? { directory_latitude: input.latitude } : {}),
    ...(input.longitude !== undefined ? { directory_longitude: input.longitude } : {}),
    updated_at: new Date().toISOString(),
  } as unknown as BusinessUpdate;

  const { error } = await supabase.from("businesses").update(payload).eq("id", businessId);
  if (error) throw error;
}
