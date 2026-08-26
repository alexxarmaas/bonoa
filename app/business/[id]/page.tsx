"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowBack, MdArrowForward, MdAutoAwesome, MdCampaign, MdGroups, MdHistory, MdLocalActivity, MdQrCodeScanner, MdShoppingBag, MdStorefront, MdStyle, MdToggleOff, MdToggleOn } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess, getBusinessMetrics, getBusinessRecentRedemptions } from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import { getLoyaltyEventSummary, type LoyaltyEventSummary } from "@/lib/loyalty-growth";
import { formatMoney, getPilotProducts, updatePilotProduct, type PilotProduct } from "@/lib/pilot-data";

type Access = Awaited<ReturnType<typeof getBusinessAccess>>;
type Redemption = Awaited<ReturnType<typeof getBusinessRecentRedemptions>>[number];
const emptyLoyalty: LoyaltyEventSummary = { purchases_30d: 0, visits_30d: 0, spend_30d_cents: 0, rewards_30d: 0 };

function BusinessDashboardContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [access, setAccess] = useState<Access>(null);
  const [products, setProducts] = useState<PilotProduct[]>([]);
  const [metrics, setMetrics] = useState({ passes: 0, redemptions: 0 });
  const [loyalty, setLoyalty] = useState<LoyaltyEventSummary>(emptyLoyalty);
  const [recent, setRecent] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!user) return;
    getBusinessAccess(businessId, user.id)
      .then(async (currentAccess) => {
        if (!active) return;
        if (!currentAccess) {
          setAccess(null);
          return;
        }
        const [currentProducts, currentMetrics, currentLoyalty, currentRecent] = await Promise.all([
          getPilotProducts(businessId),
          getBusinessMetrics(businessId),
          getLoyaltyEventSummary(businessId),
          getBusinessRecentRedemptions(businessId),
        ]);
        if (!active) return;
        setAccess(currentAccess);
        setProducts(currentProducts);
        setMetrics(currentMetrics);
        setLoyalty(currentLoyalty);
        setRecent(currentRecent);
      })
      .catch((cause) => {
        if (active) setError(friendlyError(cause, "No hemos podido cargar este negocio."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [businessId, user]);

  const canManage = access?.role === "owner" || access?.role === "manager";
  const activeProducts = products.filter((product) => product.active).length;

  const toggleProduct = async (product: PilotProduct) => {
    setTogglingId(product.id);
    setError(null);
    try {
      const updated = await updatePilotProduct(product.id, { active: !product.active });
      setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo cambiar el estado del bono."));
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return <main className="bonoa-shell"><div className="h-80 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;
  if (!access) return <main className="bonoa-shell"><Link href="/business" className="text-xs font-bold text-orange-300">← Volver</Link><div className="mt-8 rounded-[2rem] border border-red-400/15 bg-red-400/5 p-8 text-center text-sm text-red-200">No tienes acceso a este espacio.</div></main>;

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/business" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver"><MdArrowBack size={20} /></Link>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{access.role}</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">{access.business.name}</h1></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/business/${businessId}/engage`} className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white shadow-[0_16px_40px_rgba(255,68,31,.15)]"><MdLocalActivity size={19} /> Compra / visita</Link>
          <Link href={`/business/${businessId}/scan`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-black text-zinc-200"><MdQrCodeScanner size={19} /> Bonos</Link>
        </div>
      </header>

      {error ? <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}

      <section className="mt-8 rounded-[2rem] border border-orange-400/12 bg-orange-400/[0.035] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Fidelización · últimos 30 días</p><h2 className="mt-2 text-2xl font-black text-white">¿Tus clientes están volviendo?</h2><p className="mt-2 text-xs leading-5 text-zinc-500">Compras, visitas y premios registrados con el QR universal de Bonoa.</p></div>
          <Link href={`/business/${businessId}/growth`} className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2.5 text-xs font-black text-orange-100"><MdAutoAwesome size={17} /> Gestionar fidelización</Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-5"><MdShoppingBag className="text-emerald-300" size={19} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Compras</p><p className="mt-2 text-3xl font-black text-white">{loyalty.purchases_30d}</p></div>
          <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-5"><MdLocalActivity className="text-sky-300" size={19} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Visitas</p><p className="mt-2 text-3xl font-black text-white">{loyalty.visits_30d}</p></div>
          <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-5"><MdAutoAwesome className="text-amber-200" size={19} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Premios</p><p className="mt-2 text-3xl font-black text-white">{loyalty.rewards_30d}</p></div>
          <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-5"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Gasto identificado</p><p className="mt-3 text-2xl font-black text-white">{formatMoney(loyalty.spend_30d_cents)}</p><p className="mt-1 text-[10px] text-zinc-600">Solo compras con importe registrado.</p></div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <Link href={`/business/${businessId}/customers`} className="group rounded-[1.6rem] border border-sky-400/12 bg-sky-400/[0.035] p-5 transition hover:border-sky-300/20 hover:bg-sky-400/[0.055] sm:p-6"><div className="flex items-start justify-between gap-4"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-sky-300/15 bg-sky-300/[0.06] text-sky-200"><MdGroups size={22} /></div><MdArrowForward className="text-zinc-700 transition group-hover:translate-x-1 group-hover:text-sky-200" size={20} /></div><p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">Clientes</p><h2 className="mt-2 text-lg font-black text-white">Quién vuelve y quién se pierde</h2><p className="mt-2 text-xs leading-5 text-zinc-500">Segmentación automática sin convertir Bonoa en un CRM invasivo.</p></Link>
        <Link href={`/business/${businessId}/growth`} className="group rounded-[1.6rem] border border-orange-400/15 bg-orange-400/[0.04] p-5 transition hover:border-orange-300/25 hover:bg-orange-400/[0.065] sm:p-6"><div className="flex items-start justify-between gap-4"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-300/15 bg-orange-300/[0.06] text-orange-200"><MdCampaign size={22} /></div><MdArrowForward className="text-zinc-700 transition group-hover:translate-x-1 group-hover:text-orange-200" size={20} /></div><p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-200">Fidelización</p><h2 className="mt-2 text-lg font-black text-white">Automatiza el motivo para volver</h2><p className="mt-2 text-xs leading-5 text-zinc-500">Cada 5 compras, cada 100 €, cada 8 visitas… tú defines la regla.</p></Link>
        <Link href={`/business/${businessId}/counter`} className="group rounded-[1.6rem] border border-white/8 bg-white/[0.025] p-5 transition hover:border-white/15 sm:p-6"><div className="flex items-start justify-between gap-4"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-300"><MdStorefront size={22} /></div><MdArrowForward className="text-zinc-700 transition group-hover:translate-x-1 group-hover:text-white" size={20} /></div><p className="mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Operación</p><h2 className="mt-2 text-lg font-black text-white">Modo mostrador</h2><p className="mt-2 text-xs leading-5 text-zinc-500">La vista rápida para el equipo que atiende al cliente.</p></Link>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="bonoa-card rounded-[1.5rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Bonos emitidos</p><p className="mt-3 text-3xl font-black text-white">{metrics.passes}</p></div>
        <div className="bonoa-card rounded-[1.5rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Consumos</p><p className="mt-3 text-3xl font-black text-white">{metrics.redemptions}</p></div>
        <div className="bonoa-card rounded-[1.5rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Productos activos</p><p className="mt-3 text-3xl font-black text-white">{activeProducts}<span className="ml-1 text-sm text-zinc-600">/{products.length}</span></p></div>
        <div className="bonoa-card rounded-[1.5rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Estado</p><p className="mt-3 text-sm font-black uppercase tracking-[0.16em] text-emerald-300">{access.business.status}</p></div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Catálogo</p><h2 className="mt-1 text-xl font-black text-white">Bonos y recompensas</h2></div>{canManage ? <Link href={`/business/${businessId}/catalog`} className="inline-flex items-center gap-1.5 text-xs font-black text-orange-200">Gestionar <MdArrowForward size={16} /></Link> : null}</div>
          <div className="space-y-3">
            {products.map((product) => <article key={product.id} className={`bonoa-card flex items-center gap-4 rounded-[1.4rem] p-4 sm:p-5 ${product.active ? "" : "opacity-60"}`}><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdStyle size={21} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-white">{product.name}</p><span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${product.active ? "border-emerald-400/15 bg-emerald-400/5 text-emerald-300" : "border-white/10 text-zinc-500"}`}>{product.active ? "activo" : "inactivo"}</span></div><p className="mt-1 text-xs text-zinc-500">{product.initial_units} {product.type === "uses" ? "usos" : "€"} · {formatMoney(product.sale_price_cents, product.currency)} · {product.validity_days ? `${product.validity_days} días` : "sin caducidad"}</p></div>{canManage ? <button type="button" disabled={togglingId !== null} onClick={() => void toggleProduct(product)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-bold ${product.active ? "border-white/10 text-zinc-400" : "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"} disabled:opacity-40`}>{product.active ? <MdToggleOn size={19} /> : <MdToggleOff size={19} />}{togglingId === product.id ? "Guardando…" : product.active ? "Desactivar" : "Activar"}</button> : null}</article>)}
            {!products.length ? <Link href={`/business/${businessId}/catalog`} className="block rounded-[1.4rem] border border-dashed border-white/10 p-8 text-center text-sm text-zinc-600 transition hover:border-orange-400/20 hover:text-orange-200">Crea tu primera recompensa en Catálogo →</Link> : null}
          </div>
        </div>
        <div><div className="mb-4 flex items-center gap-2"><MdHistory className="text-orange-300" size={19} /><h2 className="text-xl font-black text-white">Últimos consumos</h2></div><div className="bonoa-card rounded-[1.6rem] p-4">{recent.length ? <div className="divide-y divide-white/8">{recent.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><p className="text-xs font-bold text-white">Consumo de bono</p><p className="mt-1 text-[10px] text-zinc-600">{new Date(item.created_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</p></div><span className="text-sm font-black text-white">-{item.units}</span></div>)}</div> : <p className="py-6 text-center text-xs text-zinc-600">Aún no hay consumos.</p>}</div></div>
      </section>

      <footer className="mt-8 flex items-center gap-2 text-[11px] text-zinc-600"><MdStorefront size={15} /> Bonoa Business · Actividad, bonos y recompensas quedan trazados.</footer>
    </main>
  );
}

export default function BusinessDashboardPage() {
  return <AuthGuard><BusinessDashboardContent /></AuthGuard>;
}
