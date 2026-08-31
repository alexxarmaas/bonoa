"use client";

import Link from "next/link";
import { useEffect } from "react";
import { MdErrorOutline, MdHome, MdRefresh } from "react-icons/md";
import BonoaLogo from "@/components/brand/BonoaLogo";
import { reportBonoaClientError } from "@/components/ClientObservability";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Bonoa route error", { message: error.message, digest: error.digest });
    reportBonoaClientError(error, error.digest);
  }, [error]);

  return (
    <main className="min-h-screen bg-[#f8fbff] px-5 py-12 text-[#0f172a]">
      <div className="mx-auto max-w-xl">
        <BonoaLogo />
        <section className="mt-10 rounded-[2rem] border border-[#dbe7f5] bg-white p-7 text-center shadow-[0_24px_70px_rgba(15,23,42,.08)] sm:p-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600"><MdErrorOutline size={28} /></div>
          <h1 className="mt-5 text-2xl font-black tracking-tight">Algo no ha salido como debía.</h1>
          <p className="mt-3 text-sm leading-6 text-[#64748b]">Tu cuenta no se ha cerrado y puedes volver a intentarlo. Si el problema se repite, escríbenos indicando qué estabas haciendo.</p>
          {error.digest ? <p className="mt-3 text-[10px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Referencia {error.digest}</p> : null}
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={reset} className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white"><MdRefresh size={18} /> Reintentar</button>
            <Link href="/wallet" className="inline-flex items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-5 py-3 text-xs font-black text-[#334155]"><MdHome size={17} /> Ir a mi wallet</Link>
          </div>
          <a href="mailto:partnerships@tramassso.com" className="mt-6 inline-block text-xs font-bold text-[#2563eb]">partnerships@tramassso.com</a>
        </section>
      </div>
    </main>
  );
}
