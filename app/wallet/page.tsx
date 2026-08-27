"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MdArrowForward, MdNotificationsNone, MdQrCode2, MdRefresh, MdVerified, MdWallet } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import BonoaLogo from "@/components/brand/BonoaLogo";
import MembershipCard from "@/components/MembershipCard";
import PassCard from "@/components/PassCard";
import { friendlyError } from "@/lib/errors";
import {
  getMembershipRuleProgress,
  getWalletMemberships,
  getWalletNotifications,
  type MembershipRuleProgress,
  type WalletMembership,
} from "@/lib/membership-retention";
import { useWalletRealtime } from "@/lib/use-wallet-realtime";
import { getWalletPasses, type WalletPass } from "@/lib/wallet-data";

function WalletContent() {
  const { user, profile } = useAuth();
  const [passes, setPasses] = useState<WalletPass[]>([]);
  const [memberships, setMemberships] = useState<WalletMembership[]>([]);
  const [rules, setRules] = useState<MembershipRuleProgress[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWallet = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setError(null);
    try {
      const [nextPasses, nextMemberships, nextRules, notifications] = await Promise.all([
        getWalletPasses(user.id),
        getWalletMemberships(),
        getMembershipRuleProgress(),
        getWalletNotifications(20).catch(() => []),
      ]);
      setPasses(nextPasses);
      setMemberships(nextMemberships);
      setRules(nextRules);
      setUnreadNotifications(notifications.filter((item) => !item.read_at).length);
    } catch (cause) {
      if (!silent) setError(friendlyError(cause, "No hemos podido cargar tu wallet."));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadWallet(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadWallet]);

  useEffect(() => {
    if (!user) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadWallet(true);
    }, 10000);
    return () => window.clearInterval(interval);
  }, [loadWallet, user]);

  useWalletRealtime(user?.id, () => { void loadWallet(true); });

  const refreshWallet = async () => {
    setRefreshing(true);
    await loadWallet();
    setRefreshing(false);
  };

  const activePasses = passes.filter((pass) => pass.status === "active" || pass.status === "expiring_soon");
  const expiringSoon = passes.filter((pass) => pass.status === "expiring_soon").length;
  const activeRules = rules.filter((rule) => !rule.completed).length;
  const displayName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "Bonoa";
  const initial = displayName.slice(0, 1).toUpperCase();

  const rulesByBusiness = useMemo(() => {
    const map = new Map<string, MembershipRuleProgress[]>();
    rules.forEach((rule) => map.set(rule.business_id, [...(map.get(rule.business_id) ?? []), rule]));
    return map;
  }, [rules]);

  return (
    <main className="bonoa-shell pb-24">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" aria-label="Ir a la portada"><BonoaLogo /></Link>
        <nav className="hidden items-center gap-6 text-xs font-semibold text-[#64748b] md:flex">
          <Link href="/wallet" className="font-black text-[#2563eb]">Wallet</Link>
          <Link href="/qr" className="transition hover:text-[#0f172a]">Mi QR</Link>
          <Link href="/history" className="transition hover:text-[#0f172a]">Historial</Link>
          <Link href="/notifications" className="relative transition hover:text-[#0f172a]">Avisos{unreadNotifications ? <span className="absolute -right-3 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#2563eb] px-1 text-[8px] font-black text-white">{unreadNotifications}</span> : null}</Link>
          <Link href="/profile" className="transition hover:text-[#0f172a]">Perfil</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/notifications" className="relative grid h-10 w-10 place-items-center rounded-full border border-[#dbe7f5] bg-white text-[#475569] shadow-sm md:hidden" aria-label="Notificaciones">
            <MdNotificationsNone size={20} />
            {unreadNotifications ? <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#2563eb] px-1 text-[8px] font-black text-white">{unreadNotifications}</span> : null}
          </Link>
          <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#2563eb] to-[#06b6d4] text-sm font-black text-white shadow-[0_8px_22px_rgba(37,99,235,.22)]">{initial}</Link>
        </div>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_.75fr] lg:items-stretch">
        <div className="bonoa-card bonoa-glow relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#2563eb]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-20 h-56 w-56 rounded-full bg-[#06b6d4]/10 blur-3xl" />
          <p className="text-xs font-semibold text-[#64748b]">Hola, {displayName}</p>
          <h1 className="mt-3 max-w-xl text-4xl font-black leading-[1.03] tracking-[-0.055em] text-[#0f172a] sm:text-5xl">Tu carnet siempre contigo.<br /><span className="text-brand-gradient">Tus beneficios, conectados.</span></h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-[#475569] sm:text-base">Cada negocio tiene su carnet permanente. Sumas compras, visitas y progreso con el mismo QR; los bonos y premios que desbloquees aparecen debajo para consumirlos.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/qr" className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white shadow-[0_16px_36px_rgba(37,99,235,.2)]"><MdQrCode2 size={19} /> Mostrar mi QR</Link>
            <Link href="#carnets" className="inline-flex items-center gap-2 rounded-full border border-[#cbdcf2] bg-white px-5 py-3 text-xs font-bold text-[#334155] shadow-sm transition hover:border-[#93c5fd] hover:bg-[#f8fbff]">Ver mis carnets <MdArrowForward size={16} /></Link>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <div className="bonoa-card rounded-[1.6rem] p-4 sm:p-5"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#64748b]">Carnets</p><p className="mt-3 text-3xl font-black tracking-tight text-[#0f172a]">{loading ? "—" : memberships.length}</p><p className="mt-1 text-[10px] text-[#94a3b8]">relaciones activas</p></div>
          <div className="bonoa-card rounded-[1.6rem] p-4 sm:p-5"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#64748b]">Objetivos</p><p className="mt-3 text-3xl font-black tracking-tight text-[#0f172a]">{loading ? "—" : activeRules}</p><p className="mt-1 text-[10px] text-[#0891b2]">sigue sumando</p></div>
          <div className="bonoa-card rounded-[1.6rem] p-4 sm:p-5"><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#64748b]">Bonos</p><p className="mt-3 text-3xl font-black tracking-tight text-[#0f172a]">{loading ? "—" : activePasses.length}</p><p className="mt-1 text-[10px] text-[#94a3b8]">{expiringSoon ? `${expiringSoon} caduca pronto` : "listos para usar"}</p></div>
        </div>
      </section>

      {error ? <div className="mt-6 rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div> : null}

      <section id="carnets" className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563eb]">Siempre activos</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-[#0f172a]">Mis carnets</h2>
            <p className="mt-2 max-w-xl text-xs leading-5 text-[#64748b]">Tu carnet no se consume ni desaparece cuando gastas un premio. Representa tu relación con cada negocio y conserva tu progreso.</p>
          </div>
          <button type="button" onClick={() => void refreshWallet()} disabled={loading || refreshing} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#dbe7f5] bg-white px-3.5 py-2 text-[11px] font-bold text-[#475569] shadow-sm transition hover:border-[#bfdbfe] hover:text-[#1d4ed8] disabled:opacity-40"><MdRefresh size={16} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Actualizando…" : "Actualizar"}</button>
        </div>

        {loading ? <div className="grid gap-4 lg:grid-cols-2">{[0, 1].map((item) => <div key={item} className="bonoa-card h-80 animate-pulse rounded-[1.8rem]" />)}</div> : memberships.length ? <div className="grid gap-4 lg:grid-cols-2">{memberships.map((membership) => <MembershipCard key={membership.membership_id} membership={membership} rules={rulesByBusiness.get(membership.business_id) ?? []} />)}</div> : <div className="rounded-[1.7rem] border border-dashed border-[#cbd5e1] bg-white/60 p-8 text-center"><MdWallet className="mx-auto text-[#94a3b8]" size={30} /><p className="mt-3 text-sm font-black text-[#0f172a]">Todavía no tienes carnets</p><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#64748b]">Se crea automáticamente el primero cuando un comercio registra una compra, una visita o te asigna un bono. No tienes que solicitarlo.</p></div>}
      </section>

      <section id="bonos" className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#06b6d4]">Consumibles</p><h2 className="mt-2 text-2xl font-black tracking-tight text-[#0f172a]">Mis bonos y premios</h2><p className="mt-2 text-xs leading-5 text-[#64748b]">Bonos comprados, regalos de campañas y premios que has desbloqueado con tus carnets.</p></div>
          {!loading && !error ? <div className="hidden items-center gap-1.5 text-xs text-[#64748b] sm:flex"><MdVerified className="text-emerald-500" size={18} /> Bonos en tiempo real</div> : null}
        </div>

        {loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="bonoa-card h-64 animate-pulse rounded-[1.6rem]" />)}</div> : passes.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{passes.map((pass) => <PassCard key={pass.id} pass={pass} />)}</div> : <div className="bonoa-card rounded-[1.8rem] p-8 text-center sm:p-10"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]"><MdWallet size={27} /></div><h3 className="mt-5 text-xl font-black text-[#0f172a]">No tienes bonos pendientes</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#64748b]">Tus carnets siguen activos aunque aquí no haya nada. Cuando compres un bono o desbloquees un premio aparecerá en esta sección.</p></div>}
      </section>

      <p className="mt-10 text-center text-[11px] leading-5 text-[#94a3b8] md:text-left">BONŌA · Carnets permanentes, bonos y recompensas. Un solo QR.</p>
    </main>
  );
}

export default function WalletPage() {
  return <AuthGuard><WalletContent /></AuthGuard>;
}
