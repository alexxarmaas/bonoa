"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MdArrowForward, MdQrCode2, MdRedeem, MdRefresh, MdVerified, MdWallet } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import PassCard from "@/components/PassCard";
import { friendlyError } from "@/lib/errors";
import { getWalletLoyaltyProgress, type AutomationTrigger, type WalletLoyaltyProgress } from "@/lib/loyalty-growth";
import { useWalletRealtime } from "@/lib/use-wallet-realtime";
import { getWalletPasses, type WalletPass } from "@/lib/wallet-data";

function unitLabel(trigger: AutomationTrigger, value: number, plural = true) {
  if (trigger === "spend_total") return (value / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  const words = trigger === "purchase_count" ? ["compra", "compras"] : trigger === "visit_count" ? ["visita", "visitas"] : ["consumo", "consumos"];
  return `${value} ${value === 1 || !plural ? words[0] : words[1]}`;
}

function WalletContent() {
  const { user, profile } = useAuth();
  const [passes, setPasses] = useState<WalletPass[]>([]);
  const [loyaltyProgress, setLoyaltyProgress] = useState<WalletLoyaltyProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;

    Promise.all([
      getWalletPasses(user.id),
      getWalletLoyaltyProgress().catch(() => [] as WalletLoyaltyProgress[]),
    ])
      .then(([data, progress]) => {
        if (active) {
          setPasses(data);
          setLoyaltyProgress(progress);
          setError(null);
        }
      })
      .catch((cause) => { if (active) setError(friendlyError(cause, "No hemos podido cargar tu wallet.")); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [user]);

  const syncWallet = useCallback(() => {
    if (!user) return;
    void Promise.all([
      getWalletPasses(user.id),
      getWalletLoyaltyProgress().catch(() => [] as WalletLoyaltyProgress[]),
    ])
      .then(([data, progress]) => {
        setPasses(data);
        setLoyaltyProgress(progress);
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
      const [data, progress] = await Promise.all([
        getWalletPasses(user.id),
        getWalletLoyaltyProgress().catch(() => [] as WalletLoyaltyProgress[]),
      ]);
      setPasses(data);
      setLoyaltyProgress(progress);
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
    <main className="bonoa-shell pb-24">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" className="text-xl font-black tracking-[-0.04em] text-white sm:text-2xl">bon<span className="text-brand-gradient">ō</span>a</Link>
        <nav className="hidden items-center gap-6 text-xs font-semibold text-zinc-500 md:flex"><Link href="/" className="text-white">Wallet</Link><Link href="/qr" className="hover:text-white">Mi QR</Link><Link href="/history" className="hover:text-white">Historial</Link><Link href="/profile" className="hover:text-white">Perfil</Link></nav>
        <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-sm font-black text-white">{initial}</Link>
      </header>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_.75fr] lg:items-stretch">
        <div className="bonoa-card bonoa-glow relative overflow-hidden rounded-[2rem] p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl" />
          <p className="text-xs font-semibold text-zinc-500">Hola, {displayName}</p>
          <h1 className="mt-3 max-w-xl text-4xl font-black leading-[1.03] tracking-[-0.055em] text-white sm:text-5xl">Cada vez que vuelves,<br /><span className="text-brand-gradient">estás más cerca.</span></h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-zinc-400 sm:text-base">Tus bonos, compras, visitas y recompensas en un único lugar. Enseña siempre el mismo QR.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link href="/qr" className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white shadow-[0_16px_40px_rgba(255,68,31,.18)]"><MdQrCode2 size={19} /> Mostrar mi QR</Link><Link href="#premios" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-bold text-zinc-200 hover:bg-white/8">Próximos premios <MdArrowForward size={16} /></Link></div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <div className="bonoa-card rounded-[1.6rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Bonos activos</p><p className="mt-3 text-4xl font-black tracking-tight text-white">{loading ? "—" : activePasses.length}</p><p className="mt-2 text-xs text-zinc-500">listos para usar</p></div>
          <div className="bonoa-card rounded-[1.6rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-500">Objetivos activos</p><p className="mt-3 text-4xl font-black tracking-tight text-white">{loading ? "—" : loyaltyProgress.filter((item) => !item.completed).length}</p><p className="mt-2 text-xs text-amber-200/75">{expiringSoon ? `${expiringSoon} bono${expiringSoon === 1 ? "" : "s"} caduca pronto` : "sigue sumando"}</p></div>
        </div>
      </section>

      {!loading && loyaltyProgress.length ? <section id="premios" className="mt-10">
        <div className="mb-5"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-amber-200">Por volver</p><h2 className="mt-2 text-2xl font-black tracking-tight text-white">Tus próximos premios</h2><p className="mt-2 text-xs leading-5 text-zinc-600">Bonoa cuenta tus compras, visitas y objetivos automáticamente. Cuando llegues, el regalo aparecerá en tu wallet.</p></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{loyaltyProgress.map((reward) => {
          const threshold = Math.max(1, reward.threshold_value);
          const progress = Math.min(threshold, reward.progress_value);
          const percent = Math.min(100, Math.round((progress / threshold) * 100));
          const remaining = Math.max(0, reward.remaining_value);
          const headline = reward.completed
            ? "Objetivo completado"
            : reward.reward_pending
              ? "¡Premio conseguido!"
              : reward.trigger_type === "spend_total"
                ? `Te faltan ${unitLabel(reward.trigger_type, remaining)}`
                : remaining === 1
                  ? `Te falta ${unitLabel(reward.trigger_type, 1, false)}`
                  : `Te faltan ${unitLabel(reward.trigger_type, remaining)}`;
          const detail = reward.completed
            ? `Ya has conseguido todos los premios de “${reward.rule_name}”.`
            : reward.reward_pending
              ? `${reward.reward_product_name} está pendiente de aparecer en tu wallet.`
              : `para conseguir ${reward.reward_product_name}`;
          const progressText = `${unitLabel(reward.trigger_type, progress)} / ${unitLabel(reward.trigger_type, threshold)}`;

          return <article key={reward.rule_id} className="bonoa-card overflow-hidden rounded-[1.6rem]">
            <div className="h-1" style={{ backgroundColor: reward.business_accent_color || "#f97316" }} />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">{reward.business_name}</p><h3 className="mt-1 text-sm font-black text-white">{reward.rule_name}</h3></div><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber-300/15 bg-amber-300/[0.06] text-amber-200"><MdRedeem size={18} /></div></div>
              <p className="mt-4 text-lg font-black text-white">{headline}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
              {!reward.completed ? <><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-white/70 transition-all" style={{ width: `${percent}%` }} /></div><div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-zinc-600"><span>{progressText}</span><span className="text-right">{reward.rewards_earned ? `${reward.rewards_earned} premio${reward.rewards_earned === 1 ? "" : "s"} ganado${reward.rewards_earned === 1 ? "" : "s"}` : reward.trigger_product_name || "Sigue sumando"}</span></div></> : null}
            </div>
          </article>;
        })}</div>
      </section> : !loading ? <section id="premios" className="mt-10 rounded-[1.7rem] border border-dashed border-white/10 p-7 text-center"><MdRedeem className="mx-auto text-zinc-700" size={30} /><p className="mt-3 text-sm font-black text-white">Tus próximos premios aparecerán aquí</p><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-zinc-600">Cuando un negocio active una recompensa para sus clientes y empieces a participar, Bonoa te enseñará cuánto te falta para conseguirla.</p></section> : null}

      <section id="bonos" className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Tu wallet</p><h2 className="mt-2 text-2xl font-black tracking-tight text-white">Tus bonos y regalos</h2></div>
          <div className="flex items-center gap-2">{!loading && !error ? <div className="hidden items-center gap-1.5 text-xs text-zinc-500 sm:flex"><MdVerified className="text-emerald-400" size={18} /> En tiempo real</div> : null}<button type="button" onClick={() => void refreshWallet()} disabled={loading || refreshing} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[11px] font-bold text-zinc-400 transition hover:text-white disabled:opacity-40"><MdRefresh size={16} className={refreshing ? "animate-spin" : ""} /> {refreshing ? "Actualizando…" : "Actualizar"}</button></div>
        </div>

        {loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="bonoa-card h-64 animate-pulse rounded-[1.6rem]" />)}</div> : error ? <div className="rounded-[1.6rem] border border-red-400/15 bg-red-400/5 p-6 text-sm text-red-200">{error}</div> : passes.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{passes.map((pass) => <PassCard key={pass.id} pass={pass} />)}</div> : <div className="bonoa-card rounded-[1.8rem] p-8 text-center sm:p-10"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdWallet size={27} /></div><h3 className="mt-5 text-xl font-black text-white">Tu wallet está lista</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Todavía no tienes bonos. Aun así, puedes usar tu QR para sumar compras y visitas en negocios que utilicen Bonoa.</p><Link href="/qr" className="brand-gradient mt-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white"><MdQrCode2 size={18} /> Mostrar mi QR</Link></div>}
      </section>

      <p className="mt-10 text-center text-[11px] leading-5 text-zinc-600 md:text-left">BONŌA · Un QR para tus bonos, compras, visitas y recompensas.</p>
    </main>
  );
}

export default function WalletPage() {
  return <AuthGuard><WalletContent /></AuthGuard>;
}
