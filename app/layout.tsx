import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  applicationName: "Bonoa",
  title: "Bonoa | Wallet digital de fidelización",
  description: "Carnets, bonos, recompensas y beneficios. Un solo QR.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Bonoa",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#060606",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <AuthProvider>
          {children}
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
