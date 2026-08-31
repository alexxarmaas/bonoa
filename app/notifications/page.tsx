"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MdArrowBack, MdCampaign, MdCheck, MdDoneAll, MdLocalActivity, MdNotificationsNone, MdRedeem, MdRemoveCircleOutline, MdShoppingBag } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import {
  getWalletNotifications,
  markAllWalletNotificationsRead,
  markWalletNotificationRead,
  type WalletNotification,
} from "@/lib/membership-retention";

function NotificationIcon({ type }: { type: WalletNotification["notification_type"] }) {
  if (type === "purchase") return <MdShoppingBag size={20} />;
  if (type === "visit") return <MdLocalActivity size={20} />;
  if (type === "redemption") return <MdRemoveCircleOutline size={20} />;
  if (type === "reward") return <MdRedeem size={20} />;
  if (type === "campaign") return <MdCampaign size={20} />;
  return <MdNotificationsNone size={20} />;
}

function NotificationsContent() {
  const [items, setItems] = useState<WalletNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setItems(await getWalletNotifications(100));
      setError(null);
    } catch {
      setError("No hemos podido cargar tus avisos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const unread = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  const readOne = async (item: WalletNotification) => {
    if (item.read_at) return;
    try {
      await markWalletNotificationRead(item.notification_id);
      setItems((current) => current.map((entry) => entry.notification_id === item.notification_id ? { ...entry, read_at: new Date().toISOString() } : entry));
    } catch { /* Non-blocking acknowledgement. */ }
  };

  const readAll = async () => {
    if (!unread || busy) return;
    setBusy(true);
    try {
      await markAllWalletNotificationsRead();
      const now = new Date().toISOString();
      setItems((current) => current.map((entry) => ({ ...entry, read_at: entry.read_at ?? now })));
    } finally { setBusy(false); }
  };

  return (
    <main className="bonoa-shell pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/wallet" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver a la wallet"><MdArrowBack size={20} /></Link>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Bonoa te avisa</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">Notificaciones</h1></div>
        </div>
        <button type="button" onClick={() => void readAll()} disabled={!unread || busy} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-black text-zinc-300 disabled:opacity-40"><MdDoneAll size={17} /> Marcar todo como leído</button>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="bonoa-card rounded-[1.4rem] p-4"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">Sin leer</p><p className="mt-2 text-3xl font-black text-white">{loading ? "—" : unread}</p></div>
        <div className="bonoa-card rounded-[1.4rem] p-4"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-600">Total</p><p className="mt-2 text-3xl font-black text-white">{loading ? "—" : items.length}</p></div>
      </section>

      {error ? <div className="mt-5 rounded-[1.4rem] border border-red-400/15 bg-red-400/5 p-5 text-sm text-red-200">{error}</div> : null}

      <section className="mt-6 space-y-3">
        {loading ? [0, 1, 2].map((item) => <div key={item} className="bonoa-card h-28 animate-pulse rounded-[1.4rem]" />) : null}
        {!loading && !error && !items.length ? <div className="rounded-[1.4rem] border border-dashed border-white/10 p-8 text-center"><MdNotificationsNone className="mx-auto text-zinc-700" size={30} /><p className="mt-3 text-sm font-black text-white">Todo tranquilo</p><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-zinc-600">Aquí recibirás compras registradas, visitas, consumos, premios desbloqueados y promociones.</p></div> : null}

        {!loading && !error ? items.map((item) => (
          <button key={item.notification_id} type="button" onClick={() => void readOne(item)} className={`bonoa-card flex w-full items-start gap-4 rounded-[1.4rem] p-4 text-left sm:p-5 ${item.read_at ? "opacity-65" : "border-orange-400/15"}`}>
            <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${item.notification_type === "reward" ? "border-amber-300/15 bg-amber-300/[0.06] text-amber-200" : "border-orange-400/15 bg-orange-400/[0.07] text-orange-300"}`}><NotificationIcon type={item.notification_type} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-sm font-black text-white">{item.title}</p>{item.business_name ? <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.13em] text-zinc-600">{item.business_name}</p> : null}</div>
                {!item.read_at ? <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-orange-500 text-white"><MdCheck size={13} /></span> : null}
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-400">{item.body}</p>
              <p className="mt-3 text-[10px] text-zinc-600">{new Date(item.created_at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          </button>
        )) : null}
      </section>
    </main>
  );
}

export default function NotificationsPage() {
  return <AuthGuard><NotificationsContent /></AuthGuard>;
}
