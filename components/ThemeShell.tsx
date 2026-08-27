"use client";

import { usePathname } from "next/navigation";

export default function ThemeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <div className={isLanding ? "min-h-screen" : "bonoa-product-theme min-h-screen"}>
      {children}
    </div>
  );
}
