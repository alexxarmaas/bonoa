"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export default function LandingHeaderActions() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="h-10 w-40 animate-pulse rounded-full bg-slate-100" aria-hidden="true" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/business" className="hidden rounded-full px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:inline-flex">
          Mi negocio
        </Link>
        <Link href="/wallet" className="rounded-full bg-[#2563EB] px-4 py-2.5 text-xs font-black text-white shadow-[0_12px_28px_rgba(37,99,235,.22)] transition hover:bg-[#1d4ed8]">
          Mi wallet
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link href="/login?next=/wallet" className="hidden rounded-full px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 sm:inline-flex">
        Acceder
      </Link>
      <Link href="/register" className="rounded-full bg-[#2563EB] px-4 py-2.5 text-xs font-black text-white shadow-[0_12px_28px_rgba(37,99,235,.22)] transition hover:bg-[#1d4ed8]">
        Crear cuenta
      </Link>
    </div>
  );
}
