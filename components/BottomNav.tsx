"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MdHistory, MdPersonOutline, MdQrCode2, MdWallet } from "react-icons/md";
import { useAuth } from "@/components/auth/AuthProvider";

const items = [
  { href: "/", label: "Wallet", icon: MdWallet },
  { href: "/qr", label: "QR", icon: MdQrCode2 },
  { href: "/history", label: "Historial", icon: MdHistory },
  { href: "/profile", label: "Perfil", icon: MdPersonOutline },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user || pathname.startsWith("/login") || pathname.startsWith("/register")) return null;

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/88 px-3 pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
        {items.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition ${active ? "bg-white/8 text-white" : "text-zinc-500 hover:text-zinc-200"}`}
            >
              <Icon size={22} className={active ? "text-orange-400" : ""} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
