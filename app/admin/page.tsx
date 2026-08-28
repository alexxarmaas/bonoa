"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MdAdminPanelSettings,
  MdArrowBack,
  MdCheckCircle,
  MdGroups,
  MdOpenInNew,
  MdRefresh,
  MdSearch,
  MdShield,
  MdStorefront,
  MdWarning,
} from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import {
  getAdminBusinesses,
  getAdminOverview,
  getAdminUsers,
  isPlatformAdmin,
  setAdminBusinessStatus,
  type AdminBusiness,
  type AdminOverview,
  type AdminUser,
} from "@/lib/admin-data";
import { friendlyError } from "@/lib/errors";

const statusLabels: Record<AdminBusiness["business_status"], string> = {
  active: "Activo",
  inactive: "Inactivo",
  suspended: "Suspendido",
};

function metric(value: number) {
  return new Intl.NumberFormat("es-ES").format(value);
}

function AdminContent() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyBusiness, setBusyBusiness] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const admin = await isPlatformAdmin();
      setAllowed(admin);
      if (!admin) return;
      const [nextOverview, nextBusinesses, nextUsers] = await Promise.all([
        getAdminOverview(),
        getAdminBusinesses(),
        getAdminUsers(),
      ]);
      setOverview(nextOverview);
      setBusinesses(nextBusinesses);
      setUsers(nextUsers);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido cargar la administración de Bonōa."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredBusinesses = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return businesses;
    return businesses.filter((item) => `${item.business_name} ${item.business_slug} ${item.directory_category ?? ""}`.toLocaleLowerCase("es").includes(normalized));
  }, [businesses, query]);

  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    if (!normalized) return users;
    return users.filter((item) => `${item.display_name ?? ""} ${item.email ?? ""}`.toLocaleLowerCase("es").includes(normalized));
  }, [query, users]);

  const changeStatus = async (business: AdminBusiness, status: AdminBusiness["business_status"]) => {
    if (business.business_status === status || busyBusiness) return;
    setBusyBusiness(business.business_id);
    setError(null);
    try {
      await setAdminBusinessStatus(business.business_id, status);
      await load();
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo cambiar el estado del negocio."));
    } finally {
      setBusyBusiness(null);
    }
  };

  if (loading && allowed === null) {
    return <main className="bonoa-shell min-h-screen"><div className="h-[38rem] animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;
  }

  if (allowed === false) {
    return (
      <main className="bonoa-shell min-h-screen">
        <section className="bonoa-card mx-auto mt-16 max-w-xl rounded-[2rem] p-8 text-center">
          <MdShield className="mx-auto text-zinc-600" size={38} />
          <h1 className="mt-4 text-2xl font-black text-white">Acceso restringido</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Esta zona está reservada a administradores globales de Bonōa.</p>
          <Link href="/profile" className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-xs font-black text-zinc-300"><MdArrowBack /> Volver al perfil</Link>
        </section>
      </main>
    );
  }

  const metrics = overview ? [
    ["Negocios", overview.businesses_total, MdStorefront],
    ["Activos", overview.businesses_active, MdCheckCircle],
    ["En directorio", overview.businesses_listed, MdOpenInNew],
    ["Usuarios", overview.users_total, MdGroups],
    ["Wallets web", overview.wallets_total, MdGroups],
    ["Membresías", overview.memberships_total, MdGroups],
    ["Bonos emitidos", overview.passes_total, MdStorefront],
    ["Eventos fidelización", overview.loyalty_events_total, MdCheckCircle],
    ["Riesgos 30 días", overview.risk_events_30d, MdWarning],
  ] as const : [];

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link>
          <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-300">Bonōa Platform</p><h1 className="mt-1 text-2xl font-black text-white">Administración</h1></div>
        </div>
        <div className="flex items-center gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-200"><MdAdminPanelSettings size={17} /> Platform admin</span><button type="button" onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Recargar"><MdRefresh size={18} /></button></div>
      </header>

      {error ? <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}

      <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map(([label, value, Icon]) => <article key={label} className="bonoa-card rounded-[1.5rem] p-5"><Icon className="text-blue-300" size={20} /><p className="mt-4 text-2xl font-black text-white">{metric(value)}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">{label}</p></article>)}
      </section>

      <section className="bonoa-card mt-7 rounded-[1.7rem] p-4">
        <div className="relative"><MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa o usuario…" className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-12 pr-4 text-sm text-white outline-none placeholder:text-zinc-700 focus:border-blue-400/40" /></div>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">Operación</p><h2 className="mt-2 text-xl font-black text-white">Negocios</h2></div><span className="text-xs font-bold text-zinc-600">{filteredBusinesses.length}</span></div>
        <div className="mt-4 overflow-hidden rounded-[1.7rem] border border-white/8 bg-white/[0.025]">
          {filteredBusinesses.map((business) => (
            <div key={business.business_id} className="border-b border-white/8 p-5 last:border-b-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-black text-white">{business.business_name}</p><span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${business.business_status === "active" ? "bg-emerald-400/10 text-emerald-200" : business.business_status === "suspended" ? "bg-red-400/10 text-red-200" : "bg-zinc-400/10 text-zinc-400"}`}>{statusLabels[business.business_status]}</span>{business.directory_listed ? <span className="rounded-full bg-blue-400/10 px-2.5 py-1 text-[9px] font-black uppercase text-blue-200">Directorio</span> : null}</div><p className="mt-1 text-[10px] text-zinc-600">/{business.business_slug} · {business.directory_category || "Sin categoría"}</p><p className="mt-3 text-[11px] text-zinc-500">{business.customers} clientes · {business.passes} bonos · {business.loyalty_events} eventos · {business.members} miembros de equipo</p></div>
                <div className="flex flex-wrap gap-2"><Link href={`/business/${business.business_id}`} className="rounded-full border border-white/10 px-3 py-2 text-[10px] font-black text-zinc-400">Abrir</Link>{(["active", "inactive", "suspended"] as const).map((status) => <button key={status} type="button" disabled={busyBusiness === business.business_id || business.business_status === status} onClick={() => void changeStatus(business, status)} className="rounded-full border border-white/10 px-3 py-2 text-[10px] font-black text-zinc-400 disabled:opacity-30">{statusLabels[status]}</button>)}</div>
              </div>
            </div>
          ))}
          {!filteredBusinesses.length ? <p className="p-8 text-center text-xs text-zinc-600">No hay negocios con ese filtro.</p> : null}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">Cuentas</p><h2 className="mt-2 text-xl font-black text-white">Usuarios</h2></div><span className="text-xs font-bold text-zinc-600">{filteredUsers.length}</span></div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map((item) => <article key={item.user_id} className="bonoa-card rounded-[1.5rem] p-5"><p className="truncate text-sm font-black text-white">{item.display_name || "Usuario Bonōa"}</p><p className="mt-1 truncate text-[10px] text-zinc-600">{item.email || "Sin email"}</p><div className="mt-4 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500"><span>{item.businesses} negocios</span><span>·</span><span>{item.memberships} membresías</span><span>·</span><span>{item.passes} bonos</span></div></article>)}
          {!filteredUsers.length ? <p className="text-xs text-zinc-600">No hay usuarios con ese filtro.</p> : null}
        </div>
      </section>
    </main>
  );
}

export default function AdminPage() {
  return <AuthGuard><AdminContent /></AuthGuard>;
}
