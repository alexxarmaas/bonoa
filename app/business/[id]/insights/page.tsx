"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowBack, MdAssessment, MdBolt, MdGroups, MdSchedule, MdStyle } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { getBusinessDashboardMetrics, getBusinessProductMetrics, type BusinessDashboardMetrics, type BusinessProductMetric } from "@/lib/business-analytics";
import { friendlyError } from "@/lib/errors";

const zero: BusinessDashboardMetrics = {
  total_passes: 0,
  active_passes: 0,
  exhausted_passes: 0,
  expired_passes: 0,
  cancelled_passes: 0,
  unique_wallets: 0,
  redemptions_total: 0,
  redemptions_today: 0,
  redemptions_7d: 0,
  units_redeemed_30d: 0,
  issued_30d: 0,
  expiring_30d: 0,
};

function InsightsContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [businessName, setBusinessName] = useState("");
  const [metrics, setMetrics] = useState<BusinessDashboardMetrics>(zero);
  const [products, setProducts] = useState<BusinessProductMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const access = await getBusinessAccess(businessId, user.id);
        if (!access) throw new Error("No tienes acceso a este negocio.");
        const [currentMetrics, currentProducts] = await Promise.all([
          getBusinessDashboardMetrics(businessId),
          getBusinessProductMetrics(businessId),
        ]);
        if (cancelled) return;
        setBusinessName(access.business.name);
        setMetrics(currentMetrics);
        setProducts(currentProducts);
      } catch (cause) {
        if (!cancelled) setError(friendlyError(cause, "No hemos podido cargar las métricas."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [businessId, user]);

  const cards = [
    { label: "Bonos activos", value: metrics.active_passes, note: `${metrics.total_passes} emitidos en total`, icon: MdStyle },
    { label: "Clientes únicos", value: metrics.unique_wallets, note: `${metrics.issued_30d} bonos emitidos en 30 días`, icon: MdGroups },
    { label: "Consumos 7 días", value: metrics.redemptions_7d, note: `${metrics.redemptions_today} hoy`, icon: MdBolt },
    { label: "Caducan en 30 días", value: metrics.expiring_30d, note: `${metrics.expired_passes} ya caducados`, icon: MdSchedule },
  ];

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex items-center gap-3"><Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{businessName || "Bonoa Business"}</p><h1 className="mt-1 text-2xl font-black text-white">Métricas</h1></div></header>
      {error ? <p className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</p> : null}

      {loading ? <div className="mt-7 h-72 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /> : <>
        <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
          {cards.map(({ label, value, note, icon: Icon }) => <article key={label} className="bonoa-card rounded-[1.5rem] p-5"><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">{label}</p><Icon className="text-orange-300" size={18} /></div><p className="mt-3 text-3xl font-black text-white">{value}</p><p className="mt-2 text-[10px] text-zinc-600">{note}</p></article>)}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <article className="bonoa-card rounded-[1.5rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Consumos totales</p><p className="mt-3 text-2xl font-black text-white">{metrics.redemptions_total}</p><p className="mt-2 text-xs text-zinc-600">Operaciones registradas desde el inicio.</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Unidades 30 días</p><p className="mt-3 text-2xl font-black text-white">{metrics.units_redeemed_30d}</p><p className="mt-2 text-xs text-zinc-600">Suma de usos/saldo consumido en 30 días.</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">Cierre de bonos</p><p className="mt-3 text-2xl font-black text-white">{metrics.exhausted_passes}</p><p className="mt-2 text-xs text-zinc-600">Agotados · {metrics.cancelled_passes} cancelados.</p></article>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center gap-2"><MdAssessment className="text-orange-300" size={20} /><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Rendimiento</p><h2 className="text-xl font-black text-white">Por producto</h2></div></div>
          {products.length ? <div className="overflow-hidden rounded-[1.6rem] border border-white/8"><div className="hidden grid-cols-[1fr_110px_110px_110px_120px] gap-3 border-b border-white/8 bg-white/[0.03] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600 md:grid"><span>Producto</span><span>Emitidos</span><span>Activos</span><span>Consumos</span><span>Unidades</span></div>{products.map((product) => <article key={product.product_id} className="grid gap-3 border-b border-white/8 px-5 py-4 last:border-0 md:grid-cols-[1fr_110px_110px_110px_120px] md:items-center"><div><p className="text-sm font-bold text-white">{product.product_name}</p><p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-zinc-600">{product.product_type === "uses" ? "usos" : "saldo"} · {product.active ? "activo" : "inactivo"}</p></div><div><span className="text-[10px] text-zinc-600 md:hidden">Emitidos · </span><span className="text-sm font-bold text-zinc-300">{product.passes_issued}</span></div><div><span className="text-[10px] text-zinc-600 md:hidden">Activos · </span><span className="text-sm font-bold text-emerald-300">{product.active_passes}</span></div><div><span className="text-[10px] text-zinc-600 md:hidden">Consumos · </span><span className="text-sm font-bold text-zinc-300">{product.redemptions}</span></div><div><span className="text-[10px] text-zinc-600 md:hidden">Unidades · </span><span className="text-sm font-bold text-orange-300">{product.units_redeemed}</span></div></article>)}</div> : <div className="rounded-[1.6rem] border border-dashed border-white/10 p-10 text-center text-sm text-zinc-600">Crea productos y emite bonos para empezar a ver métricas.</div>}
        </section>
      </>}
    </main>
  );
}

export default function BusinessInsightsPage() {
  return <AuthGuard><InsightsContent /></AuthGuard>;
}
