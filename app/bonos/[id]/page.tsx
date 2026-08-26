import Link from "next/link";
import { notFound } from "next/navigation";
import { MdArrowBack, MdHistory, MdSchedule, MdStorefront } from "react-icons/md";
import { demoPasses, demoRedemptions } from "@/lib/mock-data";

export default async function PassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pass = demoPasses.find((item) => item.id === id);
  if (!pass) notFound();

  const movements = demoRedemptions.filter((item) => item.passId === id);
  const percentage = Math.max(0, Math.min(100, (pass.remainingUnits / pass.initialUnits) * 100));

  return (
    <main className="bonoa-shell">
      <header className="flex items-center gap-4">
        <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver">
          <MdArrowBack size={20} />
        </Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{pass.businessName}</p>
          <h1 className="mt-1 text-xl font-black tracking-tight text-white">{pass.productName}</h1>
        </div>
      </header>

      <section className="bonoa-card bonoa-glow mt-8 overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.08] text-orange-300"><MdStorefront size={24} /></div>
            <p className="mt-5 text-sm leading-6 text-zinc-400">{pass.description}</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300">{pass.status.replace("_", " ")}</span>
        </div>

        <div className="mt-8">
          <p className="text-6xl font-black tracking-[-0.06em] text-white">{pass.remainingUnits}<span className="ml-2 text-xl font-medium text-zinc-600">/{pass.initialUnits}</span></p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">usos disponibles</p>
          <div className="progress-track mt-5 h-2.5 overflow-hidden rounded-full"><div className="progress-fill h-full rounded-full" style={{ width: `${percentage}%` }} /></div>
        </div>

        <div className="mt-7 flex items-center gap-2 border-t border-white/8 pt-5 text-xs text-zinc-500"><MdSchedule size={17} /> Caduca el {new Date(pass.expiresAt).toLocaleDateString("es-ES")}</div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2"><MdHistory className="text-orange-300" size={19} /><h2 className="text-lg font-black text-white">Movimientos</h2></div>
        <div className="space-y-3">
          {movements.length ? movements.map((movement) => (
            <div key={movement.id} className="bonoa-card flex items-center justify-between rounded-2xl p-4">
              <div><p className="text-sm font-bold text-white">Consumo de bono</p><p className="mt-1 text-xs text-zinc-500">{new Date(movement.createdAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</p></div>
              <span className="font-black text-white">-{movement.units}</span>
            </div>
          )) : <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-600">Todavía no hay consumos en este bono.</p>}
        </div>
      </section>
    </main>
  );
}
