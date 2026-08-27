"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { MdArrowBack, MdArrowForward, MdCampaign, MdGroups, MdLocalActivity, MdPersonAddAlt1, MdRefresh, MdShoppingBag, MdStar, MdWarningAmber } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import { formatMoney } from "@/lib/pilot-data";
import { getBusinessCustomers, segmentLabel, type BusinessCustomer, type CustomerSegment } from "@/lib/loyalty-growth";

const segmentStyle: Record<CustomerSegment, string> = {
  new: "border-sky-400/20 bg-sky-400/10 text-sky-200",
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  loyal: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  at_risk: "border-red-400/20 bg-red-400/10 text-red-200",
};

function CustomersContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const businessId = params.id;
  const segmentParam = searchParams.get("segment");
  const initialFilter: "all" | CustomerSegment = ["new", "active", "loyal", "at_risk"].includes(segmentParam ?? "") ? segmentParam as CustomerSegment : "all";
  const [businessName, setBusinessName] = useState("");
  const [customers, setCustomers] = useState<BusinessCustomer[]>([]);
  const [filter, setFilter] = useState<"all" | CustomerSegment>(initialFilter);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [access, rows] = await Promise.all([getBusinessAccess(businessId, user.id), getBusinessCustomers(businessId)]);
      if (!access) throw new Error("No tienes acceso a este negocio.");
      setBusinessName(access.business.name);
      setCustomers(rows);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido analizar tus clientes."));
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [businessId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setFilter(initialFilter); }, [initialFilter]);

  const summary = useMemo(() => {
    const loyal = customers.filter((customer) => customer.segment === "loyal").length;
    const atRisk = customers.filter((customer) => customer.segment === "at_risk").length;
    const fresh = customers.filter((customer) => customer.segment === "new").length;
    const repeat = customers.filter((customer) => customer.purchases >= 2 || customer.visits >= 2 || customer.redemptions >= 2 || customer.passes_issued >= 2).length;
    const repeatRate = customers.length ? Math.round((repeat / customers.length) * 100) : 0;
    const purchases = customers.reduce((sum, customer) => sum + customer.purchases, 0);
    const visits = customers.reduce((sum, customer) => sum + customer.visits, 0);
    const spendCents = customers.reduce((sum, customer) => sum + customer.spend_cents, 0);
    const rewards = customers.reduce((sum, customer) => sum + customer.rewards_earned, 0);
    return { loyal, atRisk, fresh, repeat, repeatRate, purchases, visits, spendCents, rewards };
  }, [customers]);

  const visible = useMemo(() => customers.filter((customer) => {
    const segmentMatches = filter === "all" || customer.segment === filter;
    const queryMatches = !query.trim() || customer.customer_code.toLowerCase().includes(query.trim().toLowerCase());
    return segmentMatches && queryMatches;
  }), [customers, filter, query]);

  const filters: Array<{ value: "all" | CustomerSegment; label: string }> = [
    { value: "all", label: `Todos · ${customers.length}` },
    { value: "loyal", label: `Fieles · ${summary.loyal}` },
    { value: "at_risk", label: `En riesgo · ${summary.atRisk}` },
    { value: "new", label: `Nuevos · ${summary.fresh}` },
    { value: "active", label: "Activos" },
  ];

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{businessName || "Bonoa Business"}</p><h1 className="mt-1 text-2xl font-black text-white">Clientes</h1></div></div>
        <div className="flex gap-2"><Link href={`/business/${businessId}/engage`} className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2.5 text-xs font-bold text-orange-200"><MdLocalActivity size={17} /> Registrar actividad</Link><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300 disabled:opacity-40"><MdRefresh size={17} /> Actualizar</button></div>
      </header>

      <section className="mt-6 rounded-[2rem] border border-orange-400/12 bg-orange-400/[0.04] p-5 sm:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Radar de fidelización</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-black text-white">Quién vuelve, quién compra y quién se está perdiendo.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Pulsa cualquier cliente para abrir su ficha 360º: progreso, bonos, gasto, premios y timeline.</p></div><Link href={`/business/${businessId}/campaigns`} className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white"><MdCampaign size={18} /> Crear campaña guiada</Link></div>
      </section>

      {error ? <p className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</p> : null}

      {loading ? <div className="mt-7 h-72 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /> : <>
        <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdGroups className="text-orange-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Clientes conocidos</p><p className="mt-2 text-3xl font-black text-white">{customers.length}</p><p className="mt-2 text-[10px] text-zinc-600">{summary.repeatRate}% ya son recurrentes.</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdShoppingBag className="text-emerald-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Compras registradas</p><p className="mt-2 text-3xl font-black text-white">{summary.purchases}</p><p className="mt-2 text-[10px] text-zinc-600">Gasto identificado: {formatMoney(summary.spendCents)}</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdLocalActivity className="text-sky-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Visitas</p><p className="mt-2 text-3xl font-black text-white">{summary.visits}</p><p className="mt-2 text-[10px] text-zinc-600">Actividad sin necesidad de ticket.</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdStar className="text-amber-200" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Premios automáticos</p><p className="mt-2 text-3xl font-black text-white">{summary.rewards}</p><p className="mt-2 text-[10px] text-zinc-600">Entregados por reglas de fidelidad.</p></article>
        </section>

        {summary.atRisk > 0 || summary.loyal > 0 ? <section className="mt-5 grid gap-3 md:grid-cols-2">
          {summary.atRisk > 0 ? <Link href={`/business/${businessId}/campaigns?segment=at_risk`} className="rounded-[1.5rem] border border-red-400/15 bg-red-400/[0.045] p-5 transition hover:bg-red-400/[0.07]"><div className="flex items-center gap-3"><MdWarningAmber className="text-red-300" size={22} /><div><p className="text-sm font-black text-white">Recupera {summary.atRisk} cliente{summary.atRisk === 1 ? "" : "s"}</p><p className="mt-1 text-xs leading-5 text-zinc-500">Campaña ya presegmentada para quienes llevan más de 45 días sin actividad.</p></div></div></Link> : null}
          {summary.loyal > 0 ? <Link href={`/business/${businessId}/campaigns?segment=loyal`} className="rounded-[1.5rem] border border-amber-300/15 bg-amber-300/[0.04] p-5 transition hover:bg-amber-300/[0.07]"><div className="flex items-center gap-3"><MdStar className="text-amber-200" size={22} /><div><p className="text-sm font-black text-white">Premia a {summary.loyal} cliente{summary.loyal === 1 ? " fiel" : "s fieles"}</p><p className="mt-1 text-xs leading-5 text-zinc-500">Crea una recompensa exclusiva sin enviarla a toda tu base.</p></div></div></Link> : null}
        </section> : null}

        <section className="mt-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Relaciones</p><h2 className="mt-1 text-xl font-black text-white">Base de clientes</h2></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar código CL-..." className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white outline-none focus:border-orange-400/40 lg:max-w-xs" /></div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`shrink-0 rounded-full border px-4 py-2 text-[10px] font-bold ${filter === item.value ? "border-orange-400/25 bg-orange-400/10 text-orange-200" : "border-white/8 bg-white/[0.025] text-zinc-500"}`}>{item.label}</button>)}</div>

          {visible.length ? <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-white/8">
            <div className="hidden grid-cols-[1.05fr_.65fr_.8fr_.8fr_.8fr_.8fr_auto] gap-3 border-b border-white/8 bg-white/[0.03] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.13em] text-zinc-600 lg:grid"><span>Cliente</span><span>Segmento</span><span>Compras</span><span>Visitas</span><span>Premios</span><span>Última actividad</span><span /></div>
            {visible.map((customer) => <Link href={`/business/${businessId}/customers/${customer.wallet_id}`} key={customer.wallet_id} className="group grid gap-3 border-b border-white/8 px-5 py-4 transition last:border-0 hover:bg-white/[0.025] lg:grid-cols-[1.05fr_.65fr_.8fr_.8fr_.8fr_.8fr_auto] lg:items-center">
              <div><p className="font-mono text-xs font-bold text-white">{customer.customer_code}</p><p className="mt-1 text-[10px] text-zinc-600">Gasto: {formatMoney(customer.spend_cents)} · {customer.redemptions} consumos</p></div>
              <div><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${segmentStyle[customer.segment]}`}>{segmentLabel(customer.segment)}</span></div>
              <div><span className="text-[10px] text-zinc-600 lg:hidden">Compras · </span><span className="text-sm font-black text-zinc-200">{customer.purchases}</span></div>
              <div><span className="text-[10px] text-zinc-600 lg:hidden">Visitas · </span><span className="text-sm font-black text-zinc-200">{customer.visits}</span></div>
              <div><span className="text-[10px] text-zinc-600 lg:hidden">Premios · </span><span className="text-sm font-black text-amber-200">{customer.rewards_earned}</span><p className="text-[10px] text-zinc-600">{customer.active_passes} bonos activos</p></div>
              <div><p className="text-xs font-bold text-zinc-300">Hace {customer.days_since_activity} día{customer.days_since_activity === 1 ? "" : "s"}</p><p className="mt-1 text-[10px] text-zinc-600">Desde {new Date(customer.first_seen).toLocaleDateString("es-ES")}</p></div>
              <MdArrowForward className="text-zinc-700 transition group-hover:translate-x-1 group-hover:text-orange-200" size={19} />
            </Link>)}
          </div> : <div className="mt-4 rounded-[1.6rem] border border-dashed border-white/10 p-10 text-center"><MdPersonAddAlt1 size={34} className="mx-auto text-zinc-700" /><p className="mt-3 text-sm font-bold text-white">No hay clientes en este filtro</p><p className="mt-2 text-xs text-zinc-600">Registra compras, visitas, consumos o asigna bonos para construir automáticamente el historial.</p></div>}
        </section>
      </>}
    </main>
  );
}

export default function BusinessCustomersPage() { return <AuthGuard><CustomersContent /></AuthGuard>; }
