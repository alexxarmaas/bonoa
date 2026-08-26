"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MdArrowForward, MdQrCode2, MdRefresh, MdVerified, MdWallet } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import PassCard from "@/components/PassCard";
import { friendlyError } from "@/lib/errors";
import { useWalletRealtime } from "@/lib/use-wallet-realtime";
import { getWalletPasses, type WalletPass } from "@/lib/wallet-data";

function WalletContent() {
  const { user, profile } = useAuth();
  const [passes, setPasses] = useState<WalletPass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    getWalletPasses(user.id)
      .then((data) => {
        if (!active) return;
        setPasses(data);
        setError(null);
      })
      .catch((cause) => {
        if (active) setError(friendlyError(cause, "No hemos podido cargar tus bonos."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const syncWallet = useCallback(() => {
    if (!user) return;
    void getWalletPasses(user.id)
      .then((data) => {
        setPasses(data);
        setError(null);
      })
      .catch((cause) => setError(friendlyError(cause, "No hemos podido sincronizar tu wallet.")));
  }, [user]);

  useWalletRealtime(user?.id, syncWallet);

  const refreshWallet = async () => {
    if (!user) return;
    setRefreshing(true);
    setError(null);
    try {
      setPasses(await getWalletPasses(user.id));
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido actualizar tu wallet."));
    } finally {
      setRefreshing(false);
    }
  };

  const activePasses = passes.filter((pass) => pass.status === "active" || pass.status === "expiring_soon");
  const expiringSoon = passes.filter((pass) => pass.status === "expiring_soon").length;
  const displayName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "Bonoa";
  const initial = displayName.slice(0, 1).toUpperCase();

  return (
    <main className="bonoa-shell">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="text-xl font-black tracking-[-0.04em] text-white sm:text-2xl">bon<span className="text-brand-gradient">ō</span>a</Link>
        <nav className="hidden items-center gap-6 text-xs font-semibold text-zinc-500 md:flex">
          <Link href="/" className="text-white">Wallet</Link>
          <Link href="/qr" className="hover:text-white">Mi QR</Link>
          <Link href="/history" className="hover:text-white">Historial</Link>
          <Link href="/profile" className="hover:text-white">Perfil</Link>
        </nav>
        <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-sm font-black text-white">{initial}</Link>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_.75fr] lg:items-stretch">
        <div className="bonoa-card bonoa-glow relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
          <p className="text-xs font-semibold text-zinc-500">Hola, {displayName}</p>
          <h1 className="mt-3 max-w-xl text-4xl font-black leading-[1.03] tracking-[-0.055em] text-white sm:text-5xl">Todos tus bonos.<br /><span className="text-brand-gradient">Un solo QR.</span></h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-zinc-400 sm:text-base">Lleva tus fidelizaciones contigo y consulta en segundos cuánto te queda en cada establecimiento.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/qr" className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white shadow-[0_16px_40px_rgba(255,68,31,.18)]"><MdQrCode2 size={19} /> Mostrar mi QR</Link>
            <Link href="#bonos" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-zinc-200 hover:bg-white/8">Ver bonos <MdArrowForward size={16} /></Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div className="bonoa-card rounded-[1.6rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Bonos activos</p><p className="mt-3 text-4xl font-black tracking-tight text-white">{loading ? "—" : activePasses.length}</p><p className="mt-2 text-xs text-zinc-500">listos para usar</p></div>
          <div className="bonoa-card rounded-[1.6rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Atención</p><p className="mt-3 text-4xl font-black tracking-tight text-white">{loading ? "—" : expiringSoon}</p><p className="mt-2 text-xs text-amber-200/75">caduca pronto</p></div>
        </div>
      </section>

      <section id="bonos" className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Tu wallet</p><h2 className="mt-2 text-2xl font-black tracking-tight text-white">Tus bonos</h2></div>
          <div className="flex items-center gap-2">
            {!loading && !error ? <div className="hidden items-center gap-1.5 text-xs text-zinc-500 sm:flex"><MdVerified className="text-emerald-400" size={18} /> En tiempo real</div> : null}
            <button type="button" onClick={() => void refreshWallet()} disabled={loading || refreshing} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-bold text-zinc-400 transition hover:text-white disabled:opacity-40"><MdRefresh size={16} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Actualizando…" : "Actualizar"}</button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="bonoa-card h-64 animate-pulse rounded-[1.6rem]" />)}</div>
        ) : error ? (
          <div className="rounded-[1.6rem] border border-red-400/15 bg-red-400/5 p-6 text-sm text-red-200">{error}</div>
        ) : passes.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{passes.map((pass) => <PassCard key={pass.id} pass={pass} />)}</div>
        ) : (
          <div className="bonoa-card rounded-[1.8rem] p-8 text-center sm:p-10">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdWallet size={27} /></div>
            <h3 className="mt-5 text-xl font-black text-white">Tu wallet está lista</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Todavía no tienes bonos asignados. Cuando compres o recibas uno de un establecimiento, aparecerá aquí automáticamente.</p>
          </div>
        )}
      </section>

      <p className="mt-10 text-center text-[11px] leading-5 text-zinc-600 md:text-left">Bonoa · MVP 0.2 · Wallet conectada a Supabase.</p>
    </main>
  );
}

export default function WalletPage() {
  return <AuthGuard><WalletContent /></AuthGuard>;
}
