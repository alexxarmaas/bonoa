"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { MdContentCopy, MdFullscreen, MdOpenInNew, MdPointOfSale, MdPrint, MdQrCodeScanner, MdStyle } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import { getPilotBusiness, type PilotBusiness } from "@/lib/pilot-data";

function CounterContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [business, setBusiness] = useState<PilotBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([getBusinessAccess(businessId, user.id), getPilotBusiness(businessId)])
      .then(([access, currentBusiness]) => {
        if (!active) return;
        if (!access) throw new Error("No tienes acceso a este negocio.");
        setBusiness(currentBusiness);
      })
      .catch((cause) => { if (active) setError(friendlyError(cause, "No hemos podido abrir el modo mostrador.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId, user]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setError("Este navegador no permite activar pantalla completa.");
    }
  };

  const copyStorefront = async () => {
    if (!business) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/c/${business.slug}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("No hemos podido copiar el enlace público.");
    }
  };

  if (loading) return <main className="bonoa-shell"><div className="h-[34rem] animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;
  if (!business) return <main className="bonoa-shell"><div className="rounded-[2rem] border border-red-400/15 bg-red-400/5 p-8 text-center text-sm text-red-200">{error ?? "No tienes acceso a este negocio."}</div></main>;

  const accent = business.accent_color || "#ff5a1f";
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/c/${business.slug}` : `/c/${business.slug}`;

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border bg-black/30" style={{ borderColor: `${accent}45` }}>
            {business.logo_url ? <img src={business.logo_url} alt="" className="h-full w-full object-contain p-1.5" /> : <MdPointOfSale size={28} style={{ color: accent }} />}
          </div>
          <div><p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: accent }}>Modo mostrador</p><h1 className="mt-1 text-2xl font-black text-white">{business.name}</h1><p className="mt-1 text-xs text-zinc-600">Operativa rápida para móvil o tablet.</p></div>
        </div>
        <button type="button" onClick={() => void toggleFullscreen()} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300"><MdFullscreen size={19} /> Pantalla completa</button>
      </header>

      {error ? <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}

      <section className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="space-y-4">
          <Link href={`/business/${businessId}/scan`} className="group block rounded-[2.2rem] p-[1px]" style={{ background: `linear-gradient(135deg, ${accent}, transparent 70%)` }}>
            <div className="rounded-[2.15rem] bg-[#090909] p-7 sm:p-10">
              <div className="grid h-16 w-16 place-items-center rounded-[1.4rem]" style={{ background: `${accent}18`, color: accent }}><MdQrCodeScanner size={34} /></div>
              <h2 className="mt-7 text-3xl font-black tracking-tight text-white">Escanear cliente</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-500">Asigna un bono nuevo o descuenta usos/saldo de una wallet existente. Es la acción principal del mostrador.</p>
              <div className="mt-7 inline-flex rounded-full px-5 py-3 text-xs font-black text-white transition group-hover:scale-[1.02]" style={{ background: accent }}>Abrir escáner</div>
            </div>
          </Link>

          <div className="grid gap-3 sm:grid-cols-2">
            <Link href={`/business/${businessId}/catalog`} className="bonoa-card rounded-[1.6rem] p-5 transition hover:border-orange-400/20"><MdStyle size={21} style={{ color: accent }} /><p className="mt-3 text-sm font-black text-white">Catálogo</p><p className="mt-1 text-[11px] leading-5 text-zinc-600">Consultar precios, usos y validez.</p></Link>
            <Link href={`/business/${businessId}/passes`} className="bonoa-card rounded-[1.6rem] p-5 transition hover:border-orange-400/20"><MdPointOfSale size={21} style={{ color: accent }} /><p className="mt-3 text-sm font-black text-white">Bonos emitidos</p><p className="mt-1 text-[11px] leading-5 text-zinc-600">Buscar un bono y revisar su estado.</p></Link>
          </div>
        </div>

        <aside className="bonoa-card rounded-[2rem] p-6 sm:p-7">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>Para el cliente</p>
          <h2 className="mt-2 text-xl font-black text-white">Escaparate de bonos</h2>
          <p className="mt-2 text-xs leading-5 text-zinc-500">Deja este QR visible en el mostrador para que cualquiera consulte los bonos activos sin iniciar sesión.</p>
          <div className="mx-auto mt-6 w-fit rounded-[1.6rem] bg-white p-4"><QRCodeSVG value={publicUrl} size={190} level="M" /></div>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => void copyStorefront()} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300"><MdContentCopy size={16} /> {copied ? "Copiado" : "Copiar enlace"}</button>
            <Link href={`/c/${business.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300"><MdOpenInNew size={16} /> Abrir</Link>
            <Link href={`/business/${businessId}/print`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300"><MdPrint size={16} /> Cartel A4</Link>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default function BusinessCounterPage() {
  return <AuthGuard><CounterContent /></AuthGuard>;
}
