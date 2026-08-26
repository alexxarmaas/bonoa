"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdAccessTime, MdArrowForward, MdContentCopy, MdInstagram, MdLanguage, MdLocationOn, MdPhone, MdShare, MdStorefront } from "react-icons/md";
import { formatMoney, getPublicBusinessBySlug, type PilotBusiness, type PilotProduct } from "@/lib/pilot-data";

type CatalogState = { business: PilotBusiness; products: PilotProduct[] };

export default function PublicBusinessCatalogPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [catalog, setCatalog] = useState<CatalogState | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    getPublicBusinessBySlug(slug)
      .then((value) => {
        if (!active) return;
        if (!value) {
          setMissing(true);
          return;
        }
        setCatalog(value);
      })
      .catch(() => { if (active) setMissing(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const phoneHref = useMemo(() => catalog?.business.phone ? `tel:${catalog.business.phone.replace(/[^+\d]/g, "")}` : null, [catalog]);

  const share = async () => {
    if (!catalog) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${catalog.business.name} · Bonoa`, text: "Consulta sus bonos disponibles en Bonoa.", url });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (loading) return <main className="bonoa-shell min-h-screen"><div className="mt-8 h-[32rem] animate-pulse rounded-[2.5rem] border border-white/8 bg-white/[0.03]" /></main>;

  if (missing || !catalog) {
    return <main className="bonoa-shell grid min-h-screen place-items-center py-20"><div className="max-w-md text-center"><MdStorefront size={44} className="mx-auto text-zinc-700" /><h1 className="mt-5 text-2xl font-black text-white">Este escaparate no está disponible</h1><p className="mt-3 text-sm leading-6 text-zinc-500">Puede que el negocio esté inactivo o que el enlace haya cambiado.</p><Link href="/" className="mt-6 inline-flex rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-zinc-300">Ir a Bonoa</Link></div></main>;
  }

  const { business, products } = catalog;
  const accent = business.accent_color || "#ff5a1f";

  return (
    <main className="min-h-screen pb-24">
      <section className="border-b border-white/8 bg-[radial-gradient(circle_at_top,rgba(255,255,255,.06),transparent_42%)]">
        <div className="bonoa-shell py-8 sm:py-12">
          <div className="flex items-start justify-between gap-4">
            <Link href="/" className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">BONŌA</Link>
            <button type="button" onClick={() => void share()} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300"><MdShare size={17} /> {copied ? "Copiado" : "Compartir"}</button>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[1.8rem] border bg-black/30" style={{ borderColor: `${accent}55`, boxShadow: `0 16px 50px ${accent}18` }}>
                {business.logo_url ? <img src={business.logo_url} alt={`Logo de ${business.name}`} className="h-full w-full object-contain p-2" /> : <MdStorefront size={38} style={{ color: accent }} />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: accent }}>Bonos disponibles</p>
                <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">{business.name}</h1>
                {business.description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">{business.description}</p> : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
              {phoneHref ? <a href={phoneHref} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300"><MdPhone size={16} /> Llamar</a> : null}
              {business.website_url ? <a href={business.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300"><MdLanguage size={16} /> Web</a> : null}
              {business.instagram_url ? <a href={business.instagram_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300"><MdInstagram size={16} /> Instagram</a> : null}
            </div>
          </div>

          {business.address ? <div className="mt-6 flex items-center gap-2 text-xs text-zinc-500"><MdLocationOn size={17} style={{ color: accent }} /> {business.address}</div> : null}
        </div>
      </section>

      <section className="bonoa-shell pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: accent }}>Fidelización</p><h2 className="mt-1 text-2xl font-black text-white">Elige cómo quieres volver</h2></div>
          <span className="text-xs text-zinc-600">{products.length} {products.length === 1 ? "bono activo" : "bonos activos"}</span>
        </div>

        {products.length ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{products.map((product) => (
          <article key={product.id} className="relative overflow-hidden rounded-[2rem] border border-white/8 bg-white/[0.035] p-6">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-600">{product.type === "uses" ? "Bono por usos" : "Bono de saldo"}</p><h3 className="mt-2 text-xl font-black text-white">{product.name}</h3></div><span className="rounded-full border px-3 py-1.5 text-xs font-black" style={{ borderColor: `${accent}40`, color: accent }}>{formatMoney(product.sale_price_cents, product.currency)}</span></div>
            {product.description ? <p className="mt-4 text-xs leading-5 text-zinc-500">{product.description}</p> : null}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-600">Incluye</p><p className="mt-1 text-lg font-black text-white">{product.initial_units} {product.type === "uses" ? "usos" : "€"}</p></div>
              <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-600"><MdAccessTime size={13} /> Validez</p><p className="mt-1 text-lg font-black text-white">{product.validity_days ? `${product.validity_days} días` : "Sin límite"}</p></div>
            </div>
            <p className="mt-5 text-[11px] leading-5 text-zinc-600">Solicítalo en el establecimiento. Durante el piloto, el pago se realiza directamente con el negocio y el bono se activa en tu wallet Bonoa.</p>
          </article>
        ))}</div> : <div className="mt-6 rounded-[2rem] border border-dashed border-white/10 p-10 text-center text-sm text-zinc-600">Este negocio todavía no tiene bonos públicos activos.</div>}

        <div className="mt-8 rounded-[2rem] border border-white/8 bg-white/[0.025] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div><p className="text-sm font-black text-white">¿Ya tienes un bono?</p><p className="mt-1 text-xs leading-5 text-zinc-500">Entra en tu wallet para consultar saldo, usos y caducidad en tiempo real.</p></div>
          <Link href="/login" className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white sm:mt-0" style={{ background: accent }}>Abrir mi wallet <MdArrowForward size={17} /></Link>
        </div>

        <footer className="mt-8 flex items-center justify-center gap-2 text-[10px] text-zinc-700"><MdContentCopy size={13} /> Escaparate generado por Bonoa</footer>
      </section>
    </main>
  );
}
