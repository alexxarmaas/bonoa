"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { MdArrowBack, MdPrint, MdQrCode2, MdStorefront } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import { getPilotBusiness, type PilotBusiness } from "@/lib/pilot-data";

function PrintPosterContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [business, setBusiness] = useState<PilotBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([getBusinessAccess(businessId, user.id), getPilotBusiness(businessId)])
      .then(([access, currentBusiness]) => {
        if (!active) return;
        if (!access) throw new Error("No tienes acceso a este negocio.");
        setBusiness(currentBusiness);
      })
      .catch((cause) => { if (active) setError(friendlyError(cause, "No hemos podido preparar el cartel.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId, user]);

  const publicUrl = useMemo(() => {
    if (!business || typeof window === "undefined") return "";
    return `${window.location.origin}/c/${business.slug}`;
  }, [business]);

  if (loading) return <main className="bonoa-shell"><div className="h-[38rem] animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;
  if (!business) return <main className="bonoa-shell"><div className="rounded-[2rem] border border-red-400/15 bg-red-400/5 p-8 text-center text-sm text-red-200">{error ?? "No se pudo cargar el negocio."}</div></main>;

  const accent = business.accent_color || "#ff5a1f";

  return (
    <main className="min-h-screen bg-[#070707] pb-16 print:bg-white print:pb-0">
      <div className="bonoa-shell print:hidden">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Link href={`/business/${businessId}/counter`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Material de mostrador</p><h1 className="mt-1 text-2xl font-black text-white">Cartel QR</h1></div></div>
          <button type="button" onClick={() => window.print()} className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white"><MdPrint size={18} /> Imprimir / guardar PDF</button>
        </header>
        <p className="mt-4 text-xs leading-5 text-zinc-500">Preparado para A4. Puedes imprimirlo o guardarlo como PDF desde el navegador y colocarlo en el mostrador.</p>
      </div>

      <section className="mx-auto mt-8 w-[min(92vw,760px)] overflow-hidden rounded-[2.5rem] border border-white/10 bg-white text-[#111] shadow-2xl print:mt-0 print:w-full print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="h-3" style={{ background: accent }} />
        <div className="px-8 py-10 text-center sm:px-14 sm:py-14 print:px-14 print:py-16">
          <div className="mx-auto grid h-24 w-24 place-items-center overflow-hidden rounded-[1.8rem] border border-black/10 bg-zinc-50">
            {business.logo_url ? <img src={business.logo_url} alt={`Logo de ${business.name}`} className="h-full w-full object-contain p-2" /> : <MdStorefront size={38} style={{ color: accent }} />}
          </div>
          <p className="mt-7 text-[11px] font-black uppercase tracking-[0.26em]" style={{ color: accent }}>Bonos y fidelización</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{business.name}</h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-zinc-600">Escanea para consultar los bonos disponibles, precios y condiciones. Si ya tienes uno, podrás abrir tu wallet Bonoa.</p>

          <div className="mx-auto mt-9 w-fit rounded-[2rem] border-2 border-black/10 bg-white p-5 shadow-sm">
            {publicUrl ? <QRCodeSVG value={publicUrl} size={280} level="M" includeMargin={false} /> : <MdQrCode2 size={280} />}
          </div>

          <p className="mt-7 text-xl font-black">Escanea con la cámara de tu móvil</p>
          <p className="mt-2 break-all text-sm text-zinc-500">{publicUrl}</p>

          <div className="mx-auto mt-10 h-px max-w-md bg-zinc-200" />
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Powered by BONŌA · Tramassso</p>
        </div>
      </section>
    </main>
  );
}

export default function BusinessPrintPosterPage() {
  return <AuthGuard><PrintPosterContent /></AuthGuard>;
}
