"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  MdArrowForward,
  MdLocationOn,
  MdLocalOffer,
  MdNewReleases,
  MdRefresh,
  MdSearch,
  MdStorefront,
} from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import BonoaLogo from "@/components/brand/BonoaLogo";
import {
  DIRECTORY_CATEGORIES,
  directoryCategoryLabel,
  getDirectoryBusinesses,
  type DirectoryBusiness,
  type DirectoryCategory,
} from "@/lib/business-directory";
import { friendlyError } from "@/lib/errors";

const ALL = "all" as const;
type CategoryFilter = DirectoryCategory | typeof ALL;

function formatPrice(cents: number | null, currency: string) {
  if (cents === null) return null;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function isNewBusiness(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return Date.now() - created <= 30 * 24 * 60 * 60 * 1000;
}

function DirectoryContent() {
  const [businesses, setBusinesses] = useState<DirectoryBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>(ALL);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setBusinesses(await getDirectoryBusinesses());
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido cargar los negocios de Bonōa."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return businesses.filter((business) => {
      if (category !== ALL && business.directory_category !== category) return false;
      if (!normalized) return true;
      const offerText = business.offers.map((offer) => `${offer.name} ${offer.description ?? ""}`).join(" ");
      return `${business.name} ${business.description ?? ""} ${business.address ?? ""} ${offerText}`
        .toLocaleLowerCase("es")
        .includes(normalized);
    });
  }, [businesses, category, query]);

  return (
    <main className="bonoa-shell pb-28">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" aria-label="Ir a la portada"><BonoaLogo /></Link>
        <nav className="hidden items-center gap-6 text-xs font-semibold text-[#64748b] md:flex">
          <Link href="/wallet" className="transition hover:text-[#0f172a]">Wallet</Link>
          <Link href="/negocios" className="font-black text-[#2563eb]">Negocios</Link>
          <Link href="/qr" className="transition hover:text-[#0f172a]">Mi QR</Link>
          <Link href="/history" className="transition hover:text-[#0f172a]">Historial</Link>
          <Link href="/notifications" className="transition hover:text-[#0f172a]">Avisos</Link>
          <Link href="/profile" className="transition hover:text-[#0f172a]">Perfil</Link>
        </nav>
        <Link href="/wallet" className="rounded-full border border-[#dbe7f5] bg-white px-4 py-2.5 text-xs font-black text-[#334155] shadow-sm md:hidden">Mi wallet</Link>
      </header>

      <section className="bonoa-card bonoa-glow relative mt-9 overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#2563eb]/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#2563eb]">La red Bonōa</p>
          <h1 className="mt-3 text-4xl font-black leading-[1.03] tracking-[-0.055em] text-[#0f172a] sm:text-5xl">
            Descubre negocios.<br /><span className="text-brand-gradient">Sigue sumando ventajas.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#475569] sm:text-base">
            Encuentra comercios que ya usan Bonōa, descubre sus bonos y promociones y entra directamente en su escaparate.
          </p>
        </div>
      </section>

      <section className="mt-7">
        <div className="bonoa-card rounded-[1.7rem] p-4 sm:p-5">
          <div className="relative">
            <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={21} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar negocio, bono o zona…"
              className="w-full rounded-2xl border border-[#dbe7f5] bg-[#f8fbff] py-3.5 pl-12 pr-4 text-sm font-semibold text-[#0f172a] outline-none transition placeholder:font-normal placeholder:text-[#94a3b8] focus:border-[#93c5fd] focus:bg-white"
            />
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setCategory(ALL)}
              className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-black transition ${category === ALL ? "bg-[#0f172a] text-white" : "border border-[#dbe7f5] bg-white text-[#64748b] hover:border-[#bfdbfe] hover:text-[#1d4ed8]"}`}
            >
              Todos
            </button>
            {DIRECTORY_CATEGORIES.map((item) => (
              <button
                type="button"
                key={item.value}
                onClick={() => setCategory(item.value)}
                className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-black transition ${category === item.value ? "bg-[#2563eb] text-white" : "border border-[#dbe7f5] bg-white text-[#64748b] hover:border-[#bfdbfe] hover:text-[#1d4ed8]"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#06b6d4]">Dónde usar Bonōa</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#0f172a]">Negocios disponibles</h2>
          </div>
          {!loading && !error ? <p className="text-xs font-bold text-[#64748b]">{filtered.length} {filtered.length === 1 ? "negocio" : "negocios"}</p> : null}
        </div>

        {error ? (
          <div className="rounded-[1.7rem] border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-bold text-red-700">{error}</p>
            <button type="button" onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-700">
              <MdRefresh size={17} /> Reintentar
            </button>
          </div>
        ) : loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="bonoa-card h-72 animate-pulse rounded-[1.7rem]" />)}
          </div>
        ) : filtered.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((business) => {
              const accent = /^#[0-9a-f]{6}$/i.test(business.accent_color ?? "") ? business.accent_color : "#2563eb";
              return (
                <article key={business.id} className="bonoa-card group flex min-h-72 flex-col overflow-hidden rounded-[1.7rem] p-5 transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(15,23,42,.10)]">
                  <div className="flex items-start gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[1.25rem] border border-[#dbe7f5] bg-white shadow-sm">
                      {business.logo_url ? <img src={business.logo_url} alt={`Logo de ${business.name}`} className="h-full w-full object-contain p-2" /> : <MdStorefront size={28} style={{ color: accent }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#eff6ff] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#2563eb]">{directoryCategoryLabel(business.directory_category)}</span>
                        {isNewBusiness(business.created_at) ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700"><MdNewReleases size={12} /> Nuevo</span> : null}
                      </div>
                      <h3 className="mt-2 truncate text-lg font-black tracking-tight text-[#0f172a]">{business.name}</h3>
                      {business.address ? <p className="mt-1 flex items-start gap-1 text-[11px] leading-5 text-[#64748b]"><MdLocationOn className="mt-0.5 shrink-0 text-[#94a3b8]" size={14} /> <span className="line-clamp-2">{business.address}</span></p> : null}
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-3 text-xs leading-5 text-[#64748b]">{business.description || "Descubre los bonos y ventajas que este negocio ofrece a través de Bonōa."}</p>

                  <div className="mt-4 flex-1">
                    {business.offers.length ? (
                      <div className="space-y-2">
                        {business.offers.slice(0, 2).map((offer) => {
                          const price = formatPrice(offer.sale_price_cents, offer.currency);
                          return (
                            <div key={offer.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e8eef7] bg-[#f8fbff] px-3.5 py-3">
                              <div className="min-w-0"><p className="truncate text-[11px] font-black text-[#334155]">{offer.name}</p><p className="mt-0.5 text-[9px] text-[#94a3b8]">Bono disponible</p></div>
                              {price ? <span className="shrink-0 text-[11px] font-black text-[#0f172a]">{price}</span> : <MdLocalOffer className="shrink-0 text-[#06b6d4]" size={17} />}
                            </div>
                          );
                        })}
                      </div>
                    ) : <div className="rounded-2xl border border-dashed border-[#dbe7f5] px-4 py-3 text-[10px] leading-5 text-[#94a3b8]">Consulta su escaparate para ver sus ventajas y campañas activas.</div>}
                  </div>

                  <Link href={`/c/${business.slug}`} className="mt-5 inline-flex items-center justify-between rounded-2xl border border-[#dbe7f5] bg-white px-4 py-3 text-xs font-black text-[#334155] transition group-hover:border-[#93c5fd] group-hover:text-[#1d4ed8]">
                    Ver negocio <MdArrowForward size={17} />
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[1.7rem] border border-dashed border-[#cbd5e1] bg-white/60 p-10 text-center">
            <MdStorefront className="mx-auto text-[#94a3b8]" size={34} />
            <p className="mt-4 text-sm font-black text-[#0f172a]">No encontramos negocios con esos filtros</p>
            <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#64748b]">Prueba otra búsqueda o vuelve a mostrar todas las categorías.</p>
            <button type="button" onClick={() => { setQuery(""); setCategory(ALL); }} className="mt-4 rounded-full border border-[#dbe7f5] bg-white px-4 py-2.5 text-xs font-black text-[#334155]">Limpiar filtros</button>
          </div>
        )}
      </section>

      <p className="mt-10 text-center text-[11px] leading-5 text-[#94a3b8]">BONŌA · Descubre negocios, bonos y recompensas desde una sola wallet.</p>
    </main>
  );
}

export default function BusinessesDirectoryPage() {
  return <AuthGuard><DirectoryContent /></AuthGuard>;
}
