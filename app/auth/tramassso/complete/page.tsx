"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function TramasssoSsoCompletePage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let finished = false;

    const finish = () => {
      if (!active || finished) return;
      finished = true;
      router.replace("/");
      router.refresh();
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (!error && data.session) finish();
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish();
    });

    const timeout = window.setTimeout(() => {
      if (active && !finished) setFailed(true);
    }, 8_000);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="bonoa-shell grid min-h-screen place-items-center py-10">
      <section className="bonoa-card w-full max-w-md rounded-[2rem] p-7 text-center sm:p-9">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Tramassso × Bonoa</p>
        {!failed ? (
          <>
            <div className="mx-auto mt-7 h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-orange-400" />
            <h1 className="mt-6 text-2xl font-black text-white">Preparando tu wallet</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500">Estamos terminando el acceso seguro. No necesitas introducir otra contraseña.</p>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-2xl font-black text-white">No pudimos completar el acceso</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500">El enlace pudo caducar o la sesión no llegó a guardarse. Puedes intentarlo de nuevo sin perder datos.</p>
            <div className="mt-6 flex flex-col gap-3">
              <a href={`${process.env.NEXT_PUBLIC_TRAMASSSO_URL ?? "https://tramassso.com"}/bonoa`} className="brand-gradient rounded-full px-5 py-3 text-xs font-black text-white">Reintentar desde Tramassso</a>
              <Link href="/login" className="rounded-full border border-white/10 px-5 py-3 text-xs font-bold text-zinc-300">Entrar con Bonoa</Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
