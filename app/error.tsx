"use client";

import { useEffect } from "react";
import { MdErrorOutline, MdRefresh } from "react-icons/md";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Bonoa route error", error);
  }, [error]);

  return (
    <main className="bonoa-shell grid min-h-screen place-items-center py-10">
      <section className="bonoa-card w-full max-w-md rounded-[2rem] p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-red-400/15 bg-red-400/[0.06] text-red-300"><MdErrorOutline size={28} /></div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-red-300">Incidencia puntual</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">No hemos podido cargar esto.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">Tus datos no se han borrado. Puedes volver a intentar la operación.</p>
        <button type="button" onClick={reset} className="brand-gradient mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white"><MdRefresh size={17} /> Reintentar</button>
      </section>
    </main>
  );
}
