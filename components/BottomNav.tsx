"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdHistory, MdNotificationsNone, MdPersonOutline, MdQrCode2, MdWallet } from "react-icons/md";
import { useAuth } from "@/components/auth/AuthProvider";

const items = [
  { href: "/wallet", label: "Wallet", icon: MdWallet },
  { href: "/qr", label: "QR", icon: MdQrCode2 },
  { href: "/history", label: "Historial", icon: MdHistory },
  { href: "/notifications", label: "Avisos", icon: MdNotificationsNone },
  { href: "/profile", label: "Perfil", icon: MdPersonOutline },
];

const standaloneFlows = ["/login", "/register", "/forgot-password", "/reset-password", "/business", "/demo", "/c/", "/promo/", "/r/"];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user || pathname === "/" || standaloneFlows.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-[#dbe7f5] bg-white/92 px-2 pt-2 shadow-[0_-12px_35px_rgba(15,23,42,.08)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[9px] font-bold transition ${active ? "bg-[#eff6ff] text-[#0f172a]" : "text-[#64748b] hover:bg-[#f8fbff] hover:text-[#0f172a]"}`}
            >
              <Icon size={21} className={active ? "text-[#2563eb]" : ""} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
