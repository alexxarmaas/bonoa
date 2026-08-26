"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowBack, MdCampaign, MdGroups, MdPersonAddAlt1, MdRefresh, MdStar, MdWarningAmber } from "react-icons/md";
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
  const businessId = params.id;
  const [businessName, setBusinessName] = useState("");
  const [customers, setCustomers] = useState<BusinessCustomer[]>([]);
  const [filter, setFilter] = useState<"all" | CustomerSegment>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [access, rows] = await Promise.all([
        getBusinessAccess(businessId, user.id),
        getBusinessCustomers(businessId),
      ]);
      if (!access) throw new Error("No tienes acceso a este negocio.");
      setBusinessName(access.business.name);
      setCustomers(rows);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido analizar tus clientes."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [businessId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const summary = useMemo(() => {
    const loyal = customers.filter((customer) => customer.segment === "loyal").length;
    const atRisk = customers.filter((customer) => customer.segment === "at_risk").length;
    const fresh = customers.filter((customer) => customer.segment === "new").length;
    const repeat = customers.filter((customer) => customer.redemptions >= 2 || customer.passes_issued >= 2).length;
    const repeatRate = customers.length ? Math.round((repeat / customers.length) * 100) : 0;
    return { loyal, atRisk, fresh, repeat, repeatRate };
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
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300 disabled:opacity-40"><MdRefresh size={17} /> Actualizar</button>
      </header>

      <section className="mt-6 rounded-[2rem] border border-orange-400/12 bg-orange-400/[0.04] p-5 sm:p-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Radar de fidelización</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-black text-white">No todos tus clientes necesitan lo mismo.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Bonoa clasifica automáticamente la relación con cada wallet usando frecuencia, bonos y última actividad. Sin exponer email, nombre ni el QR del cliente.</p></div><Link href={`/business/${businessId}/growth`} className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white"><MdCampaign size={18} /> Crear acción de fidelización</Link></div>
      </section>

      {error ? <p className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</p> : null}

      {loading ? <div className="mt-7 h-72 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /> : <>
        <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdGroups className="text-orange-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Clientes conocidos</p><p className="mt-2 text-3xl font-black text-white">{customers.length}</p><p className="mt-2 text-[10px] text-zinc-600">Wallets que han recibido al menos un bono.</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdRefresh className="text-emerald-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Recurrentes</p><p className="mt-2 text-3xl font-black text-white">{summary.repeatRate}%</p><p className="mt-2 text-[10px] text-zinc-600">{summary.repeat} clientes con más de una interacción relevante.</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdStar className="text-amber-200" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Clientes fieles</p><p className="mt-2 text-3xl font-black text-white">{summary.loyal}</p><p className="mt-2 text-[10px] text-zinc-600">Alta recurrencia: candidatos a recompensa VIP.</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdWarningAmber className="text-red-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">En riesgo</p><p className="mt-2 text-3xl font-black text-white">{summary.atRisk}</p><p className="mt-2 text-[10px] text-zinc-600">Con historial de consumo y más de 45 días sin actividad.</p></article>
        </section>

        {summary.atRisk > 0 || summary.loyal > 0 ? <section className="mt-5 grid gap-3 md:grid-cols-2">
          {summary.atRisk > 0 ? <Link href={`/business/${businessId}/growth`} className="rounded-[1.5rem] border border-red-400/15 bg-red-400/[0.045] p-5 transition hover:bg-red-400/[0.07]"><div className="flex items-center gap-3"><MdWarningAmber className="text-red-300" size={22} /><div><p className="text-sm font-black text-white">Recupera {summary.atRisk} cliente{summary.atRisk === 1 ? "" : "s"}</p><p className="mt-1 text-xs leading-5 text-zinc-500">Crea una campaña de vuelta con un bono limitado y comparte el enlace por tus canales.</p></div></div></Link> : null}
          {summary.loyal > 0 ? <Link href={`/business/${businessId}/growth`} className="rounded-[1.5rem] border border-amber-300/15 bg-amber-300/[0.04] p-5 transition hover:bg-amber-300/[0.07]"><div className="flex items-center gap-3"><MdStar className="text-amber-200" size={22} /><div><p className="text-sm font-black text-white">Premia a quien ya vuelve</p><p className="mt-1 text-xs leading-5 text-zinc-500">Configura una recompensa automática: después de X consumos Bonoa añade el regalo sin intervención del equipo.</p></div></div></Link> : null}
        </section> : null}

        <section className="mt-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Relaciones</p><h2 className="mt-1 text-xl font-black text-white">Base de clientes</h2></div>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar código CL-..." className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-xs text-white outline-none focus:border-orange-400/40 lg:max-w-xs" />
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{filters.map((item) => <button key={item.value} type="button" onClick={() => setFilter(item.value)} className={`shrink-0 rounded-full border px-4 py-2 text-[10px] font-bold ${filter === item.value ? "border-orange-400/25 bg-orange-400/10 text-orange-200" : "border-white/8 bg-white/[0.025] text-zinc-500"}`}>{item.label}</button>)}</div>

          {visible.length ? <div className="mt-4 overflow-hidden rounded-[1.6rem] border border-white/8">
            <div className="hidden grid-cols-[1.15fr_.8fr_.8fr_.8fr_.9fr] gap-3 border-b border-white/8 bg-white/[0.03] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.13em] text-zinc-600 md:grid"><span>Cliente</span><span>Segmento</span><span>Consumos</span><span>Bonos</span><span>Última actividad</span></div>
            {visible.map((customer) => <article key={customer.wallet_id} className="grid gap-3 border-b border-white/8 px-5 py-4 last:border-0 md:grid-cols-[1.15fr_.8fr_.8fr_.8fr_.9fr] md:items-center">
              <div><p className="font-mono text-xs font-bold text-white">{customer.customer_code}</p><p className="mt-1 text-[10px] text-zinc-600">Valor registrado: {formatMoney(customer.issued_value_cents)}</p></div>
              <div><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold ${segmentStyle[customer.segment]}`}>{segmentLabel(customer.segment)}</span></div>
              <div><span className="text-[10px] text-zinc-600 md:hidden">Consumos · </span><span className="text-sm font-black text-zinc-200">{customer.redemptions}</span></div>
              <div><span className="text-[10px] text-zinc-600 md:hidden">Bonos · </span><span className="text-sm font-black text-zinc-200">{customer.passes_issued}</span><p className="text-[10px] text-zinc-600">{customer.active_passes} activos</p></div>
              <div><p className="text-xs font-bold text-zinc-300">Hace {customer.days_since_activity} día{customer.days_since_activity === 1 ? "" : "s"}</p><p className="mt-1 text-[10px] text-zinc-600">Desde {new Date(customer.first_seen).toLocaleDateString("es-ES")}</p></div>
            </article>)}
          </div> : <div className="mt-4 rounded-[1.6rem] border border-dashed border-white/10 p-10 text-center"><MdPersonAddAlt1 size={34} className="mx-auto text-zinc-700" /><p className="mt-3 text-sm font-bold text-white">No hay clientes en este filtro</p><p className="mt-2 text-xs text-zinc-600">Cuando emitas bonos y se registren consumos, Bonoa los clasificará automáticamente.</p></div>}
        </section>
      </>}
    </main>
  );
}

export default function BusinessCustomersPage() {
  return <AuthGuard><CustomersContent /></AuthGuard>;
}
