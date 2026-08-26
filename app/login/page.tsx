"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdArrowForward } from "react-icons/md";
import { useAuth } from "@/components/auth/AuthProvider";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace("/");
  }, [authLoading, user, router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);

    if (signInError) {
      setError(friendlyError(signInError, "No hemos podido iniciar sesión."));
      return;
    }

    router.replace("/");
  };

  return (
    <main className="bonoa-shell grid min-h-screen place-items-center py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/login" className="text-3xl font-black tracking-[-0.05em] text-white">bon<span className="text-brand-gradient">ō</span>a</Link>
          <p className="mt-3 text-sm text-zinc-500">Tus bonos, beneficios y fidelizaciones.</p>
        </div>

        <div className="bonoa-card rounded-[2rem] p-6 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Acceso</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Entra en tu wallet</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Consulta tus bonos y enseña tu QR cuando quieras utilizarlos.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-zinc-400">Email</span>
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500/50" placeholder="tu@email.com" />
            </label>
            <label className="block">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-zinc-400">Contraseña</span>
                <Link href="/forgot-password" className="text-[11px] font-bold text-orange-300 hover:text-orange-200">¿La has olvidado?</Link>
              </div>
              <input required minLength={6} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500/50" placeholder="••••••••" />
            </label>

            {error ? <p className="rounded-2xl border border-red-400/15 bg-red-400/5 px-4 py-3 text-xs leading-5 text-red-200">{error}</p> : null}

            <button disabled={loading} className="brand-gradient flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-xs font-black text-white disabled:opacity-60">
              {loading ? "Entrando…" : <>Entrar <MdArrowForward size={17} /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">¿Aún no tienes cuenta? <Link href="/register" className="font-bold text-orange-300 hover:text-orange-200">Crear cuenta</Link></p>
        </div>
      </section>
    </main>
  );
}
