import { supabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type BusinessUpdate = Database["public"]["Tables"]["businesses"]["Update"];

export type RequiredBusinessProfileInput = {
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
  name: 120,
  description: 1000,
  phone: 40,
  url: 300,
  address: 300,
  logoUrl: 1200,
} as const;

function requiredText(value: string, label: string, min: number, max: number) {
  const normalized = value.trim();
  if (normalized.length < min) throw new Error(`${label} debe tener al menos ${min} caracteres.`);
  if (normalized.length > max) throw new Error(`${label} no puede superar ${max} caracteres.`);
  return normalized;
}

function optionalUrl(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > LIMITS.url) throw new Error(`${label} es demasiado larga.`);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${label} debe ser una URL completa.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${label} debe empezar por http:// o https://.`);
  }
  return parsed.toString();
}

function requiredUrl(value: string, label: string, max = LIMITS.logoUrl) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} es obligatorio.`);
  if (normalized.length > max) throw new Error(`${label} es demasiado larga.`);
  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${label} no es válida.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${label} debe ser una URL web válida.`);
  }
  return parsed.toString();
}

export async function saveRequiredBusinessProfile(businessId: string, input: RequiredBusinessProfileInput) {
  const accentColor = input.accentColor.trim();
  if (!/^#[0-9a-f]{6}$/i.test(accentColor)) {
    throw new Error("El color de marca debe tener formato hexadecimal, por ejemplo #2563eb.");
  }

  const payload = {
    name: requiredText(input.name, "El nombre del negocio", 2, LIMITS.name),
    description: requiredText(input.description, "La descripción", 20, LIMITS.description),
    phone: requiredText(input.phone, "El teléfono", 6, LIMITS.phone),
    website_url: optionalUrl(input.websiteUrl, "La web"),
    instagram_url: optionalUrl(input.instagramUrl, "Instagram"),
    address: requiredText(input.address, "La dirección o zona", 4, LIMITS.address),
    logo_url: requiredUrl(input.logoUrl, "El logotipo"),
    accent_color: accentColor,
    updated_at: new Date().toISOString(),
  } as unknown as BusinessUpdate;

  const { error } = await supabase.from("businesses").update(payload).eq("id", businessId);
  if (error) throw error;
}

export async function markBusinessOnboardingCompleted(businessId: string) {
  const completedAt = new Date().toISOString();
  const payload = {
    onboarding_completed_at: completedAt,
    updated_at: completedAt,
  } as unknown as BusinessUpdate;

  const { error } = await supabase.from("businesses").update(payload).eq("id", businessId);
  if (error) throw error;
  return completedAt;
}
