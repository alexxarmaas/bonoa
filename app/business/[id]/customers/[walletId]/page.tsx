"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowBack, MdAutoAwesome, MdCampaign, MdHistory, MdLocalActivity, MdRedeem, MdShoppingBag, MdStar, MdStyle } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { getBusinessCustomerDetail, getBusinessCustomerTimeline, type CustomerDetail, type CustomerTimelineEvent } from "@/lib/commerce-v2";
import { friendlyError } from "@/lib/errors";
import { formatMoney } from "@/lib/pilot-data";

const segmentLabel = { new: "Nuevo", active: "Activo", loyal: "Fiel", at_risk: "En riesgo" } as const;
const segmentStyle = { new: "text-sky-200", active: "text-emerald-200", loyal: "text-amber-200", at_risk: "text-red-200" } as const;

function metric(rule: CustomerDetail["progress"][number]) {
  if (rule.trigger_type === "spend_total") return `${formatMoney(rule.metric_value)} / ${formatMoney(rule.threshold_value)}`;
  return `${rule.metric_value} / ${rule.threshold_value}`;
}

function CustomerDetailContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string; walletId: string }>();
  const businessId = params.id;
  const walletId = params.walletId;
  const [businessName, setBusinessName] = useState("");
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [timeline, setTimeline] = useState<CustomerTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([getBusinessAccess(businessId, user.id), getBusinessCustomerDetail(businessId, walletId), getBusinessCustomerTimeline(businessId, walletId)])
      .then(([access, detail, events]) => {
        if (!active) return;
        if (!access) throw new Error("No tienes acceso a este negocio.");
        setBusinessName(access.business.name);
        setCustomer(detail);
        setTimeline(events);
      })
      .catch((cause) => { if (active) setError(friendlyError(cause, "No hemos podido cargar la ficha del cliente.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId, walletId, user]);

  const activePasses = useMemo(() => customer?.passes.filter((pass) => pass.status === "active" && Number(pass.remaining_units) > 0) ?? [], [customer]);

  if (loading) return <main className="bonoa-shell"><div className="h-[38rem] animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;
  if (!customer) return <main className="bonoa-shell"><Link href={`/business/${businessId}/customers`} className="text-xs font-black text-orange-200">← Volver</Link><div className="mt-6 rounded-2xl border border-red-400/15 bg-red-400/5 p-6 text-sm text-red-200">{error ?? "Cliente no encontrado."}</div></main>;

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Link href={`/business/${businessId}/customers`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300"><MdArrowBack size={20} /></Link><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">{businessName || "Bonoa Business"}</p><h1 className="mt-1 font-mono text-2xl font-black text-white">{customer.customer_code}</h1></div></div>
        <div className="flex gap-2"><Link href={`/business/${businessId}/engage`} className="brand-gradient inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-black text-white"><MdLocalActivity size={17} /> Registrar actividad</Link><Link href={`/business/${businessId}/scan`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black text-zinc-200"><MdRedeem size={17} /> Bonos</Link></div>
      </header>

      {error ? <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="bonoa-card rounded-[2rem] p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className={`text-[10px] font-black uppercase tracking-[0.2em] ${segmentStyle[customer.segment]}`}>{segmentLabel[customer.segment]}</p><h2 className="mt-2 text-3xl font-black text-white">Relación con el cliente</h2><p className="mt-2 text-xs text-zinc-500">Socio desde {new Date(customer.first_seen).toLocaleDateString("es-ES")} · última actividad hace {customer.days_since_activity} día{customer.days_since_activity === 1 ? "" : "s"}.</p></div><Link href={`/business/${businessId}/campaigns?segment=${customer.segment}`} className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2.5 text-xs font-black text-orange-100"><MdCampaign size={17} /> Campaña para este segmento</Link></div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><MdShoppingBag className="text-emerald-300" /><p className="mt-2 text-2xl font-black text-white">{customer.purchases}</p><p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Compras</p></div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><MdLocalActivity className="text-sky-300" /><p className="mt-2 text-2xl font-black text-white">{customer.visits}</p><p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Visitas</p></div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><MdStar className="text-amber-200" /><p className="mt-2 text-2xl font-black text-white">{customer.rewards_earned}</p><p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Premios</p></div>
            <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Gasto identificado</p><p className="mt-3 text-xl font-black text-white">{formatMoney(customer.spend_cents)}</p></div>
          </div>

          <div className="mt-7"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Progreso de carnets</p><div className="mt-3 space-y-3">{customer.progress.length ? customer.progress.map((rule) => {
            const threshold = Math.max(1, rule.threshold_value);
            const progress = rule.metric_value % threshold;
            const percent = Math.min(100, Math.round((progress / threshold) * 100));
            return <div key={rule.rule_id} className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4"><div className="flex justify-between gap-4"><div><p className="text-xs font-black text-white">{rule.rule_name}</p><p className="mt-1 text-[10px] text-zinc-500">Premio: {rule.reward_product_name}</p></div><p className="text-xs font-black text-orange-200">{metric(rule)}</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-orange-400" style={{ width: `${percent}%` }} /></div></div>;
          }) : <p className="rounded-2xl border border-dashed border-white/10 p-4 text-xs text-zinc-600">No hay objetivos activos para este cliente.</p>}</div></div>
        </div>

        <aside className="space-y-5">
          <section className="bonoa-card rounded-[2rem] p-6"><div className="flex items-center gap-2"><MdStyle className="text-orange-300" /><h2 className="text-lg font-black text-white">Bonos activos</h2></div><div className="mt-4 space-y-3">{activePasses.length ? activePasses.map((pass) => <div key={pass.pass_id} className="rounded-2xl border border-white/8 bg-black/20 p-4"><p className="text-xs font-black text-white">{pass.product_name}</p><p className="mt-1 text-[10px] text-zinc-500">{pass.remaining_units} / {pass.initial_units} restantes{pass.expires_at ? ` · caduca ${new Date(pass.expires_at).toLocaleDateString("es-ES")}` : ""}</p></div>) : <p className="text-xs leading-5 text-zinc-600">No tiene bonos consumibles activos. Su carnet permanente sigue activo.</p>}</div></section>
          <section className="rounded-[2rem] border border-amber-300/12 bg-amber-300/[0.04] p-6"><MdAutoAwesome className="text-amber-200" size={22} /><h2 className="mt-3 text-lg font-black text-white">Siguiente mejor acción</h2><p className="mt-2 text-xs leading-5 text-zinc-500">{customer.segment === "at_risk" ? "Lleva tiempo sin volver: encaja en una campaña de recuperación." : customer.segment === "loyal" ? "Ya es fiel: premia la relación sin regalar margen a toda la base." : customer.segment === "new" ? "Es nuevo: una campaña de bienvenida puede acelerar la segunda visita." : "Mantén el ritmo y revisa si está cerca del siguiente premio."}</p></section>
        </aside>
      </section>

      <section className="mt-7 bonoa-card rounded-[2rem] p-6 sm:p-7"><div className="flex items-center gap-2"><MdHistory className="text-zinc-300" /><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Timeline</p><h2 className="mt-1 text-lg font-black text-white">Operaciones y actividad</h2></div></div><div className="mt-5 divide-y divide-white/7">{timeline.length ? timeline.map((event) => <div key={`${event.event_type}:${event.event_id}`} className="flex gap-4 py-4 first:pt-0 last:pb-0"><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-400" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-black text-white">{event.title}</p><p className="font-mono text-[9px] text-zinc-700">{event.reference_code}</p></div><p className="mt-1 text-[11px] text-zinc-500">{event.detail}</p><p className="mt-1 text-[9px] text-zinc-700">{new Date(event.occurred_at).toLocaleString("es-ES")}</p></div></div>) : <p className="text-xs text-zinc-600">Todavía no hay operaciones en el timeline.</p>}</div></section>
    </main>
  );
}

export default function BusinessCustomerDetailPage() { return <AuthGuard><CustomerDetailContent /></AuthGuard>; }
