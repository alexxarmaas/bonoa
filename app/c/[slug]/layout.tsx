import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

function publicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const client = publicSupabase();
  if (!client) return { title: "Escaparate · Bonoa" };

  const { data: business } = await client
    .from("businesses")
    .select("name, description, logo_url")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!business) {
    return {
      title: "Escaparate no disponible · Bonoa",
      robots: { index: false, follow: false },
    };
  }

  const title = `${business.name} · Bonos en Bonoa`;
  const description = business.description?.trim() || `Consulta los bonos y ventajas disponibles de ${business.name} en Bonoa.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: business.logo_url ? [{ url: business.logo_url, alt: `Logo de ${business.name}` }] : undefined,
    },
    twitter: {
      card: business.logo_url ? "summary_large_image" : "summary",
      title,
      description,
      images: business.logo_url ? [business.logo_url] : undefined,
    },
  };
}

export default function StorefrontLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
