"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  MdArrowBack,
  MdArrowForward,
  MdAutoAwesome,
  MdCampaign,
  MdGroups,
  MdLocalActivity,
  MdQrCodeScanner,
  MdShoppingBag,
  MdStorefront,
  MdStyle,
  MdToggleOff,
  MdToggleOn,
  MdTrendingUp,
  MdWarningAmber,
} from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess, getBusinessMetrics } from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import { getBusinessLoyaltyOpportunities, type BusinessLoyaltyOpportunities } from "@/lib/membership-retention";
import { formatMoney, getPilotProducts, updatePilotProduct, type PilotProduct } from "@/lib/pilot-data";

type Access = Awaited<ReturnType<typeof getBusinessAccess>>;

const emptyOpportunities: BusinessLoyaltyOpportunities = {
  members_total: 0,
  recurrent_customers: 0,
  loyal_customers: 0,
  at_risk_customers: 0,
  new_7d: 0,
  near_reward_customers: 0,
  purchases_30d: 0,
  spend_30d_cents: 0,
  rewards_30d: 0,
};

function BusinessDashboardContent() {
  const { user } = useAuth();
  const { id: businessId } = useParams<{ id: string }>();
  const [access, setAccess] = useState<Access>(null);
  const [products, setProducts] = useState<PilotProduct[]>([]);
  const [metrics, setMetrics] = useState({ passes: 0, redemptions: 0 });
  const [opportunities, setOpportunities] = useState<BusinessLoyaltyOpportunities>(emptyOpportunities);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const currentAccess = await getBusinessAccess(businessId, user.id);
      if (!currentAccess) {
        setAccess(null);
        return;
      }
      const [nextProducts, nextMetrics, nextOpportunities] = await Promise.all([
        getPilotProducts(businessId),
        getBusinessMetrics(businessId),
        getBusinessLoyaltyOpportunities(businessId),
      ]);
      setAccess(currentAccess);
      setProducts(nextProducts);
      setMetrics(nextMetrics);
      setOpportunities(nextOpportunities);
      setError(null);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido cargar este negocio."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [businessId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const canManage = access?.role === "owner" || access?.role === "manager";
  const activeProducts = products.filter((product) => product.active).length;
  const recurrenceRate = opportunities.members_total > 0
    ? Math.round((opportunities.recurrent_customers / opportunities.members_total) * 100)
    : 0;

  const opportunityCards = useMemo(() => [
    {
      title: `${opportunities.at_risk_customers} cliente${opportunities.at_risk_customers === 1 ? "" : "s"} en riesgo`,
      body: opportunities.at_risk_customers ? "Llevan más de 45 días sin volver. Crea una campaña solo para ellos." : "No hay clientes en riesgo ahora mismo.",
      href: `/business/${businessId}/growth`,
      cta: opportunities.at_risk_customers ? "Crear campaña de retorno" : "Ver campañas",
      icon: MdWarningAmber,
      urgent: opportunities.at_risk_customers > 0,
    },
    {
      title: `${opportunities.near_reward_customers} cerca de un premio`,
      body: opportunities.near_reward_customers ? "Están a una compra/visita o al 20 % final de un objetivo de gasto." : "Nadie está todavía en el tramo final de un objetivo.",
      href: `/business/${businessId}/customers`,
      cta: "Ver clientes",
      icon: MdAutoAwesome,
      urgent: false,
    },
    {
      title: `${opportunities.new_7d} nuevo${opportunities.new_7d === 1 ? "" : "s"} esta semana`,
      body: "Primeras relaciones creadas con tu carnet Bonoa durante los últimos 7 días.",
      href: `/business/${businessId}/customers`,
      cta: "Revisar nuevos clientes",
      icon: MdTrendingUp,
      urgent: false,
    },
  ], [businessId, opportunities]);

  const toggleProduct = async (product: PilotProduct) => {
    if (!canManage) return;
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
          <Link href="/business" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{access.role}</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">{access.business.name}</h1></div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/business/${businessId}/engage`} className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white"><MdLocalActivity size={19} /> Registrar compra / visita</Link>
          <Link href={`/business/${businessId}/scan`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-black text-zinc-200"><MdQrCodeScanner size={19} /> Usar bono</Link>
        </div>
      </header>

      {error ? <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}

      <section className="mt-8 overflow-hidden rounded-[2rem] border border-orange-400/15 bg-orange-400/[0.04] p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Pulso de fidelización</p><h2 className="mt-2 text-3xl font-black tracking-tight text-white">Qué está pasando y qué hacer ahora</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">El dashboard prioriza oportunidades de retorno en lugar de limitarse a enseñar estadísticas.</p></div>
          <Link href={`/business/${businessId}/growth`} className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2.5 text-xs font-black text-orange-100"><MdCampaign size={17} /> Fidelización y campañas</Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4 sm:p-5"><MdGroups className="text-sky-300" size={19} /><p className="mt-3 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-600">Socios</p><p className="mt-2 text-3xl font-black text-white">{opportunities.members_total}</p></div>
          <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4 sm:p-5"><MdTrendingUp className="text-emerald-300" size={19} /><p className="mt-3 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-600">Recurrencia</p><p className="mt-2 text-3xl font-black text-white">{recurrenceRate}%</p><p className="mt-1 text-[9px] text-zinc-600">{opportunities.recurrent_customers} recurrentes</p></div>
          <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4 sm:p-5"><MdShoppingBag className="text-emerald-300" size={19} /><p className="mt-3 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-600">Compras · 30d</p><p className="mt-2 text-3xl font-black text-white">{opportunities.purchases_30d}</p></div>
          <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4 sm:p-5"><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-600">Gasto identificado · 30d</p><p className="mt-3 text-2xl font-black text-white">{formatMoney(opportunities.spend_30d_cents)}</p></div>
          <div className="col-span-2 rounded-[1.4rem] border border-white/8 bg-black/20 p-4 sm:col-span-1 sm:p-5"><MdAutoAwesome className="text-amber-200" size={19} /><p className="mt-3 text-[9px] font-bold uppercase tracking-[0.15em] text-zinc-600">Premios · 30d</p><p className="mt-2 text-3xl font-black text-white">{opportunities.rewards_30d}</p></div>
        </div>
      </section>

      <section className="mt-6">
        <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Oportunidades</p><h2 className="mt-1 text-xl font-black text-white">Acciones recomendadas</h2></div>
        <div className="grid gap-3 lg:grid-cols-3">
          {opportunityCards.map(({ title, body, href, cta, icon: Icon, urgent }) => (
            <Link key={title} href={href} className={`group rounded-[1.6rem] border p-5 transition sm:p-6 ${urgent ? "border-amber-300/20 bg-amber-300/[0.055] hover:bg-amber-300/[0.08]" : "border-white/8 bg-white/[0.025] hover:border-white/15"}`}>
              <div className="flex items-start justify-between gap-4"><div className={`grid h-11 w-11 place-items-center rounded-2xl border ${urgent ? "border-amber-300/20 bg-amber-300/[0.08] text-amber-200" : "border-white/10 bg-white/5 text-zinc-300"}`}><Icon size={21} /></div><MdArrowForward className="text-zinc-700 transition group-hover:translate-x-1 group-hover:text-white" size={20} /></div>
              <h3 className="mt-5 text-lg font-black text-white">{title}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{body}</p><p className="mt-4 text-[10px] font-black uppercase tracking-[0.15em] text-orange-200">{cta}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-3 md:grid-cols-3">
        <Link href={`/business/${businessId}/customers`} className="group rounded-[1.6rem] border border-sky-400/12 bg-sky-400/[0.035] p-5 sm:p-6"><MdGroups className="text-sky-200" size={23} /><h2 className="mt-4 text-lg font-black text-white">Clientes</h2><p className="mt-2 text-xs leading-5 text-zinc-500">Fieles, nuevos, activos y en riesgo.</p></Link>
        <Link href={`/business/${businessId}/growth`} className="group rounded-[1.6rem] border border-orange-400/15 bg-orange-400/[0.04] p-5 sm:p-6"><MdCampaign className="text-orange-200" size={23} /><h2 className="mt-4 text-lg font-black text-white">Carnets y campañas</h2><p className="mt-2 text-xs leading-5 text-zinc-500">Objetivos incrementales y promociones segmentadas.</p></Link>
        <Link href={`/business/${businessId}/counter`} className="group rounded-[1.6rem] border border-white/8 bg-white/[0.025] p-5 sm:p-6"><MdStorefront className="text-zinc-300" size={23} /><h2 className="mt-4 text-lg font-black text-white">Modo mostrador</h2><p className="mt-2 text-xs leading-5 text-zinc-500">Compra/visita o asignación/consumo en dos pasos claros.</p></Link>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Catálogo</p><h2 className="mt-1 text-xl font-black text-white">Bonos y recompensas</h2></div>{canManage ? <Link href={`/business/${businessId}/catalog`} className="inline-flex items-center gap-1.5 text-xs font-black text-orange-200">Gestionar <MdArrowForward size={16} /></Link> : null}</div>
        <div className="space-y-3">
          {products.map((product) => <article key={product.id} className={`bonoa-card flex items-center gap-4 rounded-[1.4rem] p-4 sm:p-5 ${product.active ? "" : "opacity-60"}`}><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdStyle size={21} /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-white">{product.name}</p><span className="rounded-full border border-white/8 px-2 py-1 text-[9px] text-zinc-500">{product.publicly_listed ? "público" : "solo premio"}</span></div><p className="mt-1 text-xs text-zinc-500">{product.initial_units} {product.type === "uses" ? "usos" : "€"} · {formatMoney(product.sale_price_cents, product.currency)}</p></div>{canManage ? <button type="button" disabled={togglingId !== null} onClick={() => void toggleProduct(product)} className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-2 text-[10px] font-bold ${product.active ? "border-white/10 text-zinc-400" : "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"}`}>{product.active ? <MdToggleOn size={18} /> : <MdToggleOff size={18} />}{togglingId === product.id ? "…" : product.active ? "Desactivar" : "Activar"}</button> : null}</article>)}
          {!products.length ? <Link href={`/business/${businessId}/catalog`} className="block rounded-[1.4rem] border border-dashed border-white/10 p-8 text-center text-sm text-zinc-600">Crear el primer bono o premio</Link> : null}
        </div>
      </section>

      <section className="mt-8 grid grid-cols-3 gap-3"><div className="bonoa-card rounded-[1.4rem] p-4"><p className="text-[9px] uppercase tracking-[0.15em] text-zinc-600">Bonos emitidos</p><p className="mt-2 text-2xl font-black text-white">{metrics.passes}</p></div><div className="bonoa-card rounded-[1.4rem] p-4"><p className="text-[9px] uppercase tracking-[0.15em] text-zinc-600">Consumos</p><p className="mt-2 text-2xl font-black text-white">{metrics.redemptions}</p></div><div className="bonoa-card rounded-[1.4rem] p-4"><p className="text-[9px] uppercase tracking-[0.15em] text-zinc-600">Productos activos</p><p className="mt-2 text-2xl font-black text-white">{activeProducts}/{products.length}</p></div></section>
    </main>
  );
}

export default function BusinessDashboardPage() {
  return <AuthGuard><BusinessDashboardContent /></AuthGuard>;
}
