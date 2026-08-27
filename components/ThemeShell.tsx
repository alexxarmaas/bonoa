"use client";

import { usePathname } from "next/navigation";
import PwaInstallCard from "@/components/PwaInstallCard";
import LandingLegalBar from "@/components/landing/LandingLegalBar";

export default function ThemeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const usesNativeLightTheme = pathname === "/" || pathname.startsWith("/demo");

  return (
    <div className={usesNativeLightTheme ? "min-h-screen" : "bonoa-product-theme min-h-screen"}>
      {children}
      {pathname === "/" ? <LandingLegalBar /> : null}
      {pathname === "/wallet" ? <PwaInstallCard /> : null}
    </div>
  );
}
