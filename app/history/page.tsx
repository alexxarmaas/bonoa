import Link from "next/link";
import { MdArrowBack, MdHistory, MdRemoveCircleOutline } from "react-icons/md";
import { demoRedemptions } from "@/lib/mock-data";

export default function HistoryPage() {
  return (
    <main className="bonoa-shell">
      <header className="flex items-center gap-4">
        <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver">
          <MdArrowBack size={20} />
        </Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Actividad</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Historial</h1>
        </div>
      </header>

      <section className="mt-8 space-y-3">
        {demoRedemptions.map((redemption) => (
          <article key={redemption.id} className="bonoa-card flex items-center gap-4 rounded-[1.4rem] p-4 sm:p-5">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300">
              <MdRemoveCircleOutline size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{redemption.businessName}</p>
                  <p className="mt-1 truncate text-xs text-zinc-500">{redemption.productName}</p>
                </div>
                <span className="shrink-0 text-sm font-black text-white">-{redemption.units}</span>
              </div>
              <p className="mt-2 text-[11px] text-zinc-600">
                {new Date(redemption.createdAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
          </article>
        ))}
      </section>

      <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-600">
        <MdHistory size={17} /> Los consumos serán inmutables en producción
      </div>
    </main>
  );
}
