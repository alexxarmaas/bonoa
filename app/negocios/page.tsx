"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  MdArrowForward,
  MdFavorite,
  MdFavoriteBorder,
  MdLocationOn,
  MdLocalOffer,
  MdMap,
  MdMyLocation,
  MdNearMe,
  MdNewReleases,
  MdRefresh,
  MdSearch,
  MdStar,
  MdStorefront,
} from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import BonoaLogo from "@/components/brand/BonoaLogo";
import {
  DIRECTORY_CATEGORIES,
  directoryCategoryLabel,
  directoryCoordinates,
  distanceKm,
  getDirectoryBusinesses,
  type DirectoryBusiness,
  type DirectoryCategory,
  type DirectoryCoordinates,
} from "@/lib/business-directory";
import { friendlyError } from "@/lib/errors";

const ALL = "all" as const;
type CategoryFilter = DirectoryCategory | typeof ALL;
const FAVORITES_KEY = "bonoa:directory:favorites";

function formatPrice(cents: number | null, currency: string) {
  if (cents === null) return null;
  return new Intl.NumberFormat("es-ES", { style: "currency", currency, minimumFractionDigits: 2 }).format(cents / 100);
}

function isNewBusiness(createdAt: string) {
  const created = new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return Date.now() - created <= 30 * 24 * 60 * 60 * 1000;
}

function formatDistance(km: number | null) {
  if (km === null) return null;
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

function mapEmbedUrl(business: DirectoryBusiness) {
  const coordinates = directoryCoordinates(business);
  if (!coordinates) return null;
  const { latitude, longitude } = coordinates;
  const delta = 0.012;
  const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;
}

function DirectoryContent() {
  const [businesses, setBusinesses] = useState<DirectoryBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>(ALL);
  const [userLocation, setUserLocation] = useState<DirectoryCoordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [nearestFirst, setNearestFirst] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [mapBusinessId, setMapBusinessId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getDirectoryBusinesses();
      setBusinesses(next);
      if (!mapBusinessId) setMapBusinessId(next.find((item) => directoryCoordinates(item))?.id ?? null);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido cargar los negocios de Bonōa."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(FAVORITES_KEY) ?? "[]");
      if (Array.isArray(stored)) setFavorites(new Set(stored.filter((value): value is string => typeof value === "string")));
    } catch {
      setFavorites(new Set());
    }
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const toggleFavorite = (businessId: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(businessId)) next.delete(businessId);
      else next.add(businessId);
      window.localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const locate = () => {
    if (!navigator.geolocation) {
      setLocationError("Este dispositivo no permite obtener tu ubicación.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setNearestFirst(true);
        setLocating(false);
      },
      () => {
        setLocationError("No hemos podido acceder a tu ubicación. Puedes seguir usando el directorio sin compartirla.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 },
    );
  };

  const distanceByBusiness = useMemo(() => {
    const result = new Map<string, number | null>();
    businesses.forEach((business) => {
      const target = directoryCoordinates(business);
      result.set(business.id, userLocation && target ? distanceKm(userLocation, target) : null);
    });
    return result;
  }, [businesses, userLocation]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    const result = businesses.filter((business) => {
      if (category !== ALL && business.directory_category !== category) return false;
      if (favoritesOnly && !favorites.has(business.id)) return false;
      if (!normalized) return true;
      const offerText = business.offers.map((offer) => `${offer.name} ${offer.description ?? ""}`).join(" ");
      return `${business.name} ${business.description ?? ""} ${business.address ?? ""} ${offerText}`.toLocaleLowerCase("es").includes(normalized);
    });
    if (nearestFirst && userLocation) {
      result.sort((a, b) => (distanceByBusiness.get(a.id) ?? Number.POSITIVE_INFINITY) - (distanceByBusiness.get(b.id) ?? Number.POSITIVE_INFINITY));
    }
    return result;
  }, [businesses, category, distanceByBusiness, favorites, favoritesOnly, nearestFirst, query, userLocation]);

  const featured = useMemo(() => {
    return businesses
      .filter((business) => business.offers.length > 0)
      .sort((a, b) => b.offers.length - a.offers.length || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [businesses]);

  const mapBusiness = businesses.find((business) => business.id === mapBusinessId && directoryCoordinates(business)) ?? businesses.find((business) => directoryCoordinates(business)) ?? null;
  const mapUrl = mapBusiness ? mapEmbedUrl(mapBusiness) : null;

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
          <h1 className="mt-3 text-4xl font-black leading-[1.03] tracking-[-0.055em] text-[#0f172a] sm:text-5xl">Descubre negocios.<br /><span className="text-brand-gradient">Sigue sumando ventajas.</span></h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-[#475569] sm:text-base">Encuentra comercios que ya usan Bonōa, descubre sus bonos y promociones y, si quieres, ordénalos por distancia.</p>
        </div>
      </section>

      <section className="mt-7">
        <div className="bonoa-card rounded-[1.7rem] p-4 sm:p-5">
          <div className="relative"><MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={21} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar negocio, bono o zona…" className="w-full rounded-2xl border border-[#dbe7f5] bg-[#f8fbff] py-3.5 pl-12 pr-4 text-sm font-semibold text-[#0f172a] outline-none transition placeholder:font-normal placeholder:text-[#94a3b8] focus:border-[#93c5fd] focus:bg-white" /></div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button type="button" onClick={() => setCategory(ALL)} className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-black transition ${category === ALL ? "bg-[#0f172a] text-white" : "border border-[#dbe7f5] bg-white text-[#64748b]"}`}>Todos</button>
            {DIRECTORY_CATEGORIES.map((item) => <button type="button" key={item.value} onClick={() => setCategory(item.value)} className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-black transition ${category === item.value ? "bg-[#2563eb] text-white" : "border border-[#dbe7f5] bg-white text-[#64748b]"}`}>{item.label}</button>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#e8eef7] pt-4">
            <button type="button" onClick={userLocation ? () => setNearestFirst((value) => !value) : locate} disabled={locating} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-black ${nearestFirst ? "bg-cyan-500 text-white" : "border border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]"}`}><MdNearMe size={16} /> {locating ? "Localizando…" : nearestFirst ? "Más cercanos primero" : "Cerca de mí"}</button>
            <button type="button" onClick={() => setFavoritesOnly((value) => !value)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[11px] font-black ${favoritesOnly ? "bg-rose-500 text-white" : "border border-[#fecdd3] bg-rose-50 text-rose-600"}`}><MdFavorite size={16} /> Favoritos {favorites.size ? `(${favorites.size})` : ""}</button>
            {userLocation ? <span className="self-center text-[10px] text-[#94a3b8]">Tu posición se usa solo en esta sesión para calcular distancias.</span> : null}
          </div>
          {locationError ? <p className="mt-3 text-[11px] font-semibold text-amber-700">{locationError}</p> : null}
        </div>
      </section>

      {!loading && !error && featured.length ? (
        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2"><MdStar className="text-amber-400" size={20} /><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">Con ventajas activas</p><h2 className="mt-1 text-xl font-black text-[#0f172a]">Destacados</h2></div></div>
          <div className="grid gap-3 md:grid-cols-3">{featured.map((business) => <Link key={business.id} href={`/c/${business.slug}`} className="rounded-[1.5rem] border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-[#0f172a]">{business.name}</p><p className="mt-1 text-[10px] font-bold text-amber-700">{business.offers.length} {business.offers.length === 1 ? "ventaja pública" : "ventajas públicas"}</p></div><MdArrowForward className="text-amber-500" /></div></Link>)}</div>
        </section>
      ) : null}

      {mapUrl && mapBusiness ? (
        <section className="mt-8 overflow-hidden rounded-[1.8rem] border border-[#dbe7f5] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#06b6d4]"><MdMap size={16} /> Mapa</p><h2 className="mt-1 text-lg font-black text-[#0f172a]">{mapBusiness.name}</h2>{formatDistance(distanceByBusiness.get(mapBusiness.id) ?? null) ? <p className="mt-1 text-xs text-[#64748b]">A {formatDistance(distanceByBusiness.get(mapBusiness.id) ?? null)} de ti</p> : null}</div><Link href={`/c/${mapBusiness.slug}`} className="rounded-full border border-[#dbe7f5] px-4 py-2 text-xs font-black text-[#334155]">Ver negocio</Link></div>
          <iframe src={mapUrl} title={`Mapa de ${mapBusiness.name}`} className="h-72 w-full border-0 sm:h-80" loading="lazy" referrerPolicy="no-referrer" />
        </section>
      ) : null}

      <section className="mt-8">
        <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#06b6d4]">Dónde usar Bonōa</p><h2 className="mt-2 text-2xl font-black tracking-tight text-[#0f172a]">Negocios disponibles</h2></div>{!loading && !error ? <p className="text-xs font-bold text-[#64748b]">{filtered.length} {filtered.length === 1 ? "negocio" : "negocios"}</p> : null}</div>

        {error ? <div className="rounded-[1.7rem] border border-red-200 bg-red-50 p-6 text-center"><p className="text-sm font-bold text-red-700">{error}</p><button type="button" onClick={() => void load()} className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2.5 text-xs font-black text-red-700"><MdRefresh size={17} /> Reintentar</button></div> : loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="bonoa-card h-72 animate-pulse rounded-[1.7rem]" />)}</div> : filtered.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((business) => {
              const accent = /^#[0-9a-f]{6}$/i.test(business.accent_color ?? "") ? business.accent_color : "#2563eb";
              const favorite = favorites.has(business.id);
              const distance = formatDistance(distanceByBusiness.get(business.id) ?? null);
              const hasLocation = Boolean(directoryCoordinates(business));
              return (
                <article key={business.id} className="bonoa-card group flex min-h-72 flex-col overflow-hidden rounded-[1.7rem] p-5 transition hover:-translate-y-0.5 hover:shadow-[0_20px_55px_rgba(15,23,42,.10)]">
                  <div className="flex items-start gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[1.25rem] border border-[#dbe7f5] bg-white shadow-sm">{business.logo_url ? <img src={business.logo_url} alt={`Logo de ${business.name}`} className="h-full w-full object-contain p-2" /> : <MdStorefront size={28} style={{ color: accent }} />}</div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-[#eff6ff] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#2563eb]">{directoryCategoryLabel(business.directory_category)}</span>{isNewBusiness(business.created_at) ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-emerald-700"><MdNewReleases size={12} /> Nuevo</span> : null}{distance ? <span className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2.5 py-1 text-[9px] font-black uppercase text-cyan-700"><MdMyLocation size={12} /> {distance}</span> : null}</div><h3 className="mt-2 truncate text-lg font-black tracking-tight text-[#0f172a]">{business.name}</h3>{business.address ? <p className="mt-1 flex items-start gap-1 text-[11px] leading-5 text-[#64748b]"><MdLocationOn className="mt-0.5 shrink-0 text-[#94a3b8]" size={14} /> <span className="line-clamp-2">{business.address}</span></p> : null}</div>
                    <button type="button" onClick={() => toggleFavorite(business.id)} className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${favorite ? "border-rose-200 bg-rose-50 text-rose-500" : "border-[#dbe7f5] bg-white text-[#94a3b8]"}`} aria-label={favorite ? "Quitar de favoritos" : "Añadir a favoritos"}>{favorite ? <MdFavorite size={18} /> : <MdFavoriteBorder size={18} />}</button>
                  </div>

                  <p className="mt-4 line-clamp-3 text-xs leading-5 text-[#64748b]">{business.description || "Descubre los bonos y ventajas que este negocio ofrece a través de Bonōa."}</p>
                  <div className="mt-4 flex-1">{business.offers.length ? <div className="space-y-2">{business.offers.slice(0, 2).map((offer) => { const price = formatPrice(offer.sale_price_cents, offer.currency); return <div key={offer.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[#e8eef7] bg-[#f8fbff] px-3.5 py-3"><div className="min-w-0"><p className="truncate text-[11px] font-black text-[#334155]">{offer.name}</p><p className="mt-0.5 text-[9px] text-[#94a3b8]">Bono disponible</p></div>{price ? <span className="shrink-0 text-[11px] font-black text-[#0f172a]">{price}</span> : <MdLocalOffer className="shrink-0 text-[#06b6d4]" size={17} />}</div>; })}</div> : <div className="rounded-2xl border border-dashed border-[#dbe7f5] px-4 py-3 text-[10px] leading-5 text-[#94a3b8]">Consulta su escaparate para ver sus ventajas y campañas activas.</div>}</div>

                  <div className="mt-5 flex gap-2">{hasLocation ? <button type="button" onClick={() => setMapBusinessId(business.id)} className="inline-flex items-center gap-1.5 rounded-2xl border border-[#dbe7f5] bg-white px-3 py-3 text-[10px] font-black text-[#64748b]"><MdMap size={16} /> Mapa</button> : null}<Link href={`/c/${business.slug}`} className="inline-flex flex-1 items-center justify-between rounded-2xl border border-[#dbe7f5] bg-white px-4 py-3 text-xs font-black text-[#334155] transition group-hover:border-[#93c5fd] group-hover:text-[#1d4ed8]">Ver negocio <MdArrowForward size={17} /></Link></div>
                </article>
              );
            })}
          </div>
        ) : <div className="rounded-[1.7rem] border border-dashed border-[#cbd5e1] bg-white/60 p-10 text-center"><MdStorefront className="mx-auto text-[#94a3b8]" size={34} /><p className="mt-4 text-sm font-black text-[#0f172a]">No encontramos negocios con esos filtros</p><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#64748b]">Prueba otra búsqueda o vuelve a mostrar todas las categorías.</p><button type="button" onClick={() => { setQuery(""); setCategory(ALL); setFavoritesOnly(false); setNearestFirst(false); }} className="mt-4 rounded-full border border-[#dbe7f5] bg-white px-4 py-2.5 text-xs font-black text-[#334155]">Limpiar filtros</button></div>}
      </section>

      <p className="mt-10 text-center text-[11px] leading-5 text-[#94a3b8]">BONŌA · Descubre negocios, bonos y recompensas desde una sola wallet.</p>
    </main>
  );
}

export default function BusinessesDirectoryPage() {
  return <AuthGuard><DirectoryContent /></AuthGuard>;
}
