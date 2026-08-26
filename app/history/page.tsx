"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MdArrowBack, MdHistory, MdRemoveCircleOutline } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getWalletHistory, type WalletRedemption } from "@/lib/wallet-data";

function HistoryContent() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<WalletRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getWalletHistory(user.id)
      .then((data) => {
        setMovements(data);
        setError(null);
      })
      .catch(() => setError("No hemos podido cargar tu historial."))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <main className="bonoa-shell">
      <header className="flex items-center gap-4">
        <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver"><MdArrowBack size={20} /></Link>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Actividad</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">Historial</h1></div>
      </header>

      <section className="mt-8 space-y-3">
        {loading ? [0, 1, 2].map((item) => <div key={item} className="bonoa-card h-24 animate-pulse rounded-[1.4rem]" />) : null}
        {!loading && error ? <div className="rounded-[1.4rem] border border-red-400/15 bg-red-400/5 p-5 text-sm text-red-200">{error}</div> : null}
        {!loading && !error && !movements.length ? <div className="rounded-[1.4rem] border border-dashed border-white/10 p-8 text-center"><MdHistory className="mx-auto text-zinc-700" size={28} /><p className="mt-3 text-sm font-bold text-zinc-400">Todavía no hay movimientos</p><p className="mt-2 text-xs leading-5 text-zinc-600">Cuando uses uno de tus bonos, el consumo aparecerá aquí.</p></div> : null}

        {!loading && !error ? movements.map((redemption) => (
          <Link href={`/bonos/${redemption.passId}`} key={redemption.id} className="bonoa-card flex items-center gap-4 rounded-[1.4rem] p-4 transition hover:border-white/20 sm:p-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdRemoveCircleOutline size={22} /></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="truncate text-sm font-bold text-white">{redemption.businessName}</p><p className="mt-1 truncate text-xs text-zinc-500">{redemption.productName}</p></div>
                <span className="shrink-0 text-sm font-black text-white">-{redemption.units}</span>
              </div>
              <p className="mt-2 text-[11px] text-zinc-600">{new Date(redemption.createdAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</p>
            </div>
          </Link>
        )) : null}
      </section>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-600"><MdHistory size={17} /> Los consumos quedan registrados de forma inmutable</div>
    </main>
  );
}

export default function HistoryPage() {
  return <AuthGuard><HistoryContent /></AuthGuard>;
}
