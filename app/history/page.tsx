"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MdArrowBack, MdCardGiftcard, MdHistory, MdLocalActivity, MdRedeem, MdRemoveCircleOutline, MdShoppingBag } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { getWalletTransactions, type WalletTransaction } from "@/lib/membership-retention";

const labels: Record<WalletTransaction["transaction_type"], string> = {
  purchase: "Compra registrada",
  visit: "Visita registrada",
  redemption: "Bono utilizado",
  pass_issued: "Bono añadido",
  reward: "Premio desbloqueado",
  campaign: "Promoción añadida",
};

function MovementIcon({ type }: { type: WalletTransaction["transaction_type"] }) {
  if (type === "purchase") return <MdShoppingBag size={21} />;
  if (type === "visit") return <MdLocalActivity size={21} />;
  if (type === "redemption") return <MdRemoveCircleOutline size={21} />;
  if (type === "reward") return <MdRedeem size={21} />;
  return <MdCardGiftcard size={21} />;
}

function amountLabel(item: WalletTransaction) {
  if (item.transaction_type === "purchase" && item.amount_cents > 0) return (item.amount_cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  if (item.transaction_type === "redemption") return `-${item.units}`;
  if ((item.transaction_type === "pass_issued" || item.transaction_type === "reward" || item.transaction_type === "campaign") && item.units) return `+${item.units}`;
  return null;
}

function HistoryContent() {
  const [movements, setMovements] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWalletTransactions(150)
      .then((data) => { setMovements(data); setError(null); })
      .catch(() => setError("No hemos podido cargar tu historial."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="bonoa-shell pb-24">
      <header className="flex items-center gap-4">
        <Link href="/wallet" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver a la wallet"><MdArrowBack size={20} /></Link>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Movimientos</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">Historial y recibos</h1></div>
      </header>

      <section className="mt-6 rounded-[1.6rem] border border-white/8 bg-white/[0.025] p-5">
        <p className="text-xs font-black text-white">Cada interacción deja rastro</p>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-600">Compras, visitas, consumos, bonos y premios quedan unidos a una referencia de operación. En consumos verás también el saldo anterior y posterior.</p>
      </section>

      <section className="mt-6 space-y-3">
        {loading ? [0, 1, 2].map((item) => <div key={item} className="bonoa-card h-32 animate-pulse rounded-[1.4rem]" />) : null}
        {!loading && error ? <div className="rounded-[1.4rem] border border-red-400/15 bg-red-400/5 p-5 text-sm text-red-200">{error}</div> : null}
        {!loading && !error && !movements.length ? <div className="rounded-[1.4rem] border border-dashed border-white/10 p-8 text-center"><MdHistory className="mx-auto text-zinc-700" size={28} /><p className="mt-3 text-sm font-bold text-zinc-400">Todavía no hay movimientos</p><p className="mt-2 text-xs leading-5 text-zinc-600">Tu primera compra, visita, bono o premio aparecerá aquí.</p></div> : null}

        {!loading && !error ? movements.map((item) => {
          const value = amountLabel(item);
          return (
            <article key={`${item.transaction_type}:${item.transaction_id}`} className="bonoa-card rounded-[1.4rem] p-4 sm:p-5">
              <div className="flex items-start gap-4">
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${item.transaction_type === "reward" ? "border-amber-300/15 bg-amber-300/[0.06] text-amber-200" : "border-orange-400/15 bg-orange-400/[0.07] text-orange-300"}`}><MovementIcon type={item.transaction_type} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] text-zinc-600">{labels[item.transaction_type]}</p>
                      <p className="mt-1 truncate text-sm font-black text-white">{item.business_name}</p>
                      {item.product_name ? <p className="mt-1 truncate text-xs text-zinc-500">{item.product_name}</p> : null}
                    </div>
                    {value ? <span className="shrink-0 text-base font-black text-white">{value}</span> : null}
                  </div>

                  {item.transaction_type === "redemption" && item.balance_before !== null && item.balance_after !== null ? <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-white/7 bg-black/20 p-3 text-xs"><div><p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Antes</p><p className="mt-1 font-black text-zinc-300">{item.balance_before}</p></div><div><p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Después</p><p className="mt-1 font-black text-white">{item.balance_after}</p></div></div> : null}

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-[10px] text-zinc-600">
                    <span>{new Date(item.occurred_at).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</span>
                    <span className="font-mono">OP-{item.reference_code}</span>
                  </div>
                </div>
              </div>
            </article>
          );
        }) : null}
      </section>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-600"><MdHistory size={17} /> Historial de operaciones trazable</div>
    </main>
  );
}

export default function HistoryPage() {
  return <AuthGuard><HistoryContent /></AuthGuard>;
}
