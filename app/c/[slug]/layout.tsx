import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

const canonicalOrigin = "https://bonoa.tramassso.com";

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
  const url = `${canonicalOrigin}/c/${slug}`;
  const client = publicSupabase();
  const fallbackDescription = "Únete a este negocio en Bonoa y lleva tu carnet, progreso y recompensas siempre contigo.";

  if (!client) {
    return {
      title: "Club digital",
      description: fallbackDescription,
      alternates: { canonical: url },
    };
  }

  const { data: business } = await client
    .from("businesses")
    .select("name, description")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!business) {
    return {
      title: "Escaparate no disponible",
      description: fallbackDescription,
      alternates: { canonical: url },
      robots: { index: false, follow: false },
    };
  }

  const title = `${business.name} en Bonoa`;
  const description = business.description?.trim() || `Únete al club de ${business.name} en Bonoa y lleva tu progreso, bonos y recompensas en una sola wallet.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Bonoa",
      url,
      images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: `${business.name} en Bonoa` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export default function StorefrontLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
