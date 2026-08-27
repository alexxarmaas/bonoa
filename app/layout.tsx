import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ClientObservability from "@/components/ClientObservability";
import PwaRegistration from "@/components/PwaRegistration";
import ThemeShell from "@/components/ThemeShell";
import { AuthProvider } from "@/components/auth/AuthProvider";

const canonicalOrigin = "https://bonoa.tramassso.com";

export const metadata: Metadata = {
  metadataBase: new URL(canonicalOrigin),
  applicationName: "Bonoa",
  title: {
    default: "Bonoa | Wallet digital de fidelización",
    template: "%s | Bonoa",
  },
  description: "Carnets, bonos, recompensas y beneficios. Un solo QR.",
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: canonicalOrigin,
    siteName: "Bonoa",
    title: "Bonoa | Fidelización, bonos y recompensas",
    description: "Carnets digitales, bonos, recompensas y campañas en un único lugar. Un QR. Todos tus beneficios.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Bonoa, wallet digital de fidelización" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bonoa | Fidelización, bonos y recompensas",
    description: "Carnets digitales, bonos, recompensas y campañas en un único lugar.",
    images: ["/opengraph-image"],
  },
  appleWebApp: {
    capable: true,
    title: "Bonoa",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fbff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <AuthProvider>
          <ClientObservability />
          <PwaRegistration />
          <ThemeShell>
            {children}
            <BottomNav />
          </ThemeShell>
        </AuthProvider>
      </body>
    </html>
  );
}
