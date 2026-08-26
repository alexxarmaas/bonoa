"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowBack, MdHistory, MdPerson, MdShield } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { getBusinessAuditFeed, type BusinessAuditEvent } from "@/lib/business-analytics";
import { friendlyError } from "@/lib/errors";

const labels: Record<string, string> = {
  business_created: "Negocio creado",
  member_added: "Miembro añadido",
  member_removed: "Miembro eliminado",
  member_role_changed: "Rol actualizado",
  product_created: "Producto creado",
  product_activated: "Producto activado",
  product_deactivated: "Producto desactivado",
  pass_issued: "Bono emitido",
  pass_cancelled: "Bono cancelado",
  redemption: "Consumo registrado",
};

function describe(event: BusinessAuditEvent) {
  const meta = typeof event.metadata === "object" && event.metadata && !Array.isArray(event.metadata) ? event.metadata : {};
  if (event.event_type === "redemption" && "units" in meta) return `${String(meta.units)} unidades consumidas`;
  if (event.event_type === "pass_issued" && "initial_units" in meta) return `Saldo inicial: ${String(meta.initial_units)}`;
  if (event.event_type === "product_created" && "name" in meta) return String(meta.name);
  if (event.event_type === "member_added" && "role" in meta) return `Rol asignado: ${String(meta.role)}`;
  if (event.event_type === "member_role_changed" && "to_role" in meta) return `Nuevo rol: ${String(meta.to_role)}`;
  return event.pass_id ? `Bono ${event.pass_id.slice(0, 8)}…` : "Operación registrada";
}

function ActivityContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [events, setEvents] = useState<BusinessAuditEvent[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (append = false) => {
    if (!user) return;
    append ? setLoadingMore(true) : setLoading(true);
    setError(null);
    try {
      const access = await getBusinessAccess(businessId, user.id);
      if (!access) {
        setAllowed(false);
        return;
      }
      setBusinessName(access.business.name);
      const canManage = access.role === "owner" || access.role === "manager";
      setAllowed(canManage);
      if (!canManage) return;
      const current = await getBusinessAuditFeed(businessId, 50, append ? events.length : 0);
      setEvents((previous) => append ? [...previous, ...current] : current);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido cargar la actividad."));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [businessId, events.length, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const access = await getBusinessAccess(businessId, user.id);
        if (cancelled) return;
        if (!access) {
          setAllowed(false);
          return;
        }
        setBusinessName(access.business.name);
        const canManage = access.role === "owner" || access.role === "manager";
        setAllowed(canManage);
        if (!canManage) return;
        const current = await getBusinessAuditFeed(businessId, 50, 0);
        if (!cancelled) setEvents(current);
      } catch (cause) {
        if (!cancelled) setError(friendlyError(cause, "No hemos podido cargar la actividad."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [businessId, user]);

  if (!loading && allowed === false) {
    return <main className="bonoa-shell"><Link href={`/business/${businessId}`} className="text-xs font-bold text-orange-300">← Volver</Link><div className="mt-8 rounded-[2rem] border border-amber-400/15 bg-amber-400/5 p-8 text-center"><MdShield className="mx-auto text-amber-300" size={28} /><p className="mt-4 text-sm font-bold text-white">Actividad restringida</p><p className="mt-2 text-xs text-zinc-500">Solo owner y manager pueden consultar la bitácora.</p></div></main>;
  }

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex items-center gap-3"><Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{businessName || "Bonoa Business"}</p><h1 className="mt-1 text-2xl font-black text-white">Actividad</h1></div></header>
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.04] p-4"><MdShield className="mt-0.5 shrink-0 text-emerald-300" size={18} /><p className="text-xs leading-5 text-zinc-400">Bitácora inmutable generada en base de datos. Registra emisiones, consumos, anulaciones, cambios de catálogo y gestión del equipo.</p></div>
      {error ? <p className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</p> : null}
      <section className="mt-7">
        {loading ? <div className="h-72 animate-pulse rounded-[1.6rem] border border-white/8 bg-white/[0.03]" /> : events.length ? <div className="bonoa-card overflow-hidden rounded-[1.6rem] divide-y divide-white/8">{events.map((event) => (
          <article key={event.event_id} className="flex gap-4 p-5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-orange-400/10 bg-orange-400/[0.05] text-orange-300"><MdHistory size={19} /></div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-white">{labels[event.event_type] ?? event.event_type}</p><time className="text-[10px] text-zinc-600">{new Date(event.created_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</time></div><p className="mt-1 text-xs text-zinc-500">{describe(event)}</p><div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-zinc-600"><MdPerson size={13} /><span>{event.actor_name || event.actor_email || "Sistema"}</span>{event.pass_id ? <span>· pass {event.pass_id.slice(0, 8)}</span> : null}</div></div>
          </article>
        ))}</div> : <div className="rounded-[1.6rem] border border-dashed border-white/10 p-10 text-center text-sm text-zinc-600">Todavía no hay actividad registrada.</div>}
        {!loading && events.length >= 50 ? <button type="button" disabled={loadingMore} onClick={() => void load(true)} className="mx-auto mt-5 block rounded-full border border-white/10 px-5 py-3 text-xs font-bold text-zinc-400 disabled:opacity-40">{loadingMore ? "Cargando…" : "Cargar más"}</button> : null}
      </section>
    </main>
  );
}

export default function BusinessActivityPage() {
  return <AuthGuard><ActivityContent /></AuthGuard>;
}
