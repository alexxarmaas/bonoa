import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import PwaRegistration from "@/components/PwaRegistration";
import ThemeShell from "@/components/ThemeShell";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  applicationName: "Bonoa",
  title: "Bonoa | Wallet digital de fidelización",
  description: "Carnets, bonos, recompensas y beneficios. Un solo QR.",
  manifest: "/manifest.webmanifest",
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
