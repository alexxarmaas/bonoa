"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdArrowForward } from "react-icons/md";
import { useAuth } from "@/components/auth/AuthProvider";
import BonoaLogo from "@/components/brand/BonoaLogo";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase/client";

function safeNextPath() {
  if (typeof window === "undefined") return "/wallet";
  const value = new URLSearchParams(window.location.search).get("next");
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/wallet";
}

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace(safeNextPath());
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

    router.replace(safeNextPath());
  };

  const goToRegister = () => {
    const next = safeNextPath();
    router.push(next === "/wallet" ? "/register" : `/register?next=${encodeURIComponent(next)}`);
  };

  return (
    <main className="bonoa-shell grid min-h-screen place-items-center py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex"><BonoaLogo className="scale-110" /></Link>
          <p className="mt-4 text-sm text-[#64748b]">Tus bonos, beneficios y fidelizaciones.</p>
        </div>

        <div className="bonoa-card rounded-[2rem] p-6 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563eb]">Acceso</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f172a]">Entra en tu wallet</h1>
          <p className="mt-3 text-sm leading-6 text-[#64748b]">Consulta tus bonos, reclama recompensas y enseña tu QR cuando quieras utilizarlos.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-[#475569]">Email</span>
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-[#dbe7f5] bg-white px-4 py-3.5 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" placeholder="tu@email.com" />
            </label>
            <label className="block">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[#475569]">Contraseña</span>
                <Link href="/forgot-password" className="text-[11px] font-bold text-[#2563eb] hover:text-[#1d4ed8]">¿La has olvidado?</Link>
              </div>
              <input required minLength={6} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-[#dbe7f5] bg-white px-4 py-3.5 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" placeholder="••••••••" />
            </label>

            {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">{error}</p> : null}

            <button disabled={loading} className="brand-gradient flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-xs font-black text-white shadow-[0_14px_34px_rgba(37,99,235,.2)] disabled:opacity-60">
              {loading ? "Entrando…" : <>Entrar <MdArrowForward size={17} /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#64748b]">¿Aún no tienes cuenta? <button type="button" onClick={goToRegister} className="font-bold text-[#2563eb] hover:text-[#1d4ed8]">Crear cuenta</button></p>
        </div>
      </section>
    </main>
  );
}
