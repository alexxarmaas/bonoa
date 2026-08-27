"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdArrowForward, MdCheckCircle } from "react-icons/md";
import { useAuth } from "@/components/auth/AuthProvider";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase/client";

function safeNextPath() {
  if (typeof window === "undefined") return "/wallet";
  const value = new URLSearchParams(window.location.search).get("next");
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/wallet";
}

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace(safeNextPath());
  }, [authLoading, user, router]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const displayName = name.trim();
    if (displayName.length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }

    setLoading(true);
    const next = safeNextPath();
    const loginDestination = next === "/wallet" ? "/login?confirmed=1" : `/login?confirmed=1&next=${encodeURIComponent(next)}`;
    const emailRedirectTo = `${window.location.origin}${loginDestination}`;
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(friendlyError(signUpError, "No hemos podido crear tu cuenta."));
      return;
    }

    if (data.session) {
      router.replace(next);
      return;
    }

    setNotice("Cuenta creada. Revisa tu correo para confirmar el acceso; al volver continuarás donde estabas.");
  };

  const goToLogin = () => {
    const next = safeNextPath();
    router.push(next === "/wallet" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
  };

  return (
    <main className="bonoa-shell grid min-h-screen place-items-center py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-3xl font-black tracking-[-0.05em] text-white">bon<span className="text-brand-gradient">ō</span>a</Link>
          <p className="mt-3 text-sm text-zinc-500">Una cuenta. Una wallet. Un solo QR.</p>
        </div>

        <div className="bonoa-card rounded-[2rem] p-6 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Registro</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Crea tu wallet</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Al registrarte Bonoa creará automáticamente tu identidad y tu QR personal.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-zinc-400">Nombre</span>
              <input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500/50" placeholder="Tu nombre" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-zinc-400">Email</span>
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500/50" placeholder="tu@email.com" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-zinc-400">Contraseña</span>
              <input required minLength={6} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500/50" placeholder="Mínimo 6 caracteres" />
            </label>

            {error ? <p className="rounded-2xl border border-red-400/15 bg-red-400/5 px-4 py-3 text-xs leading-5 text-red-200">{error}</p> : null}
            {notice ? <p className="flex gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs leading-5 text-emerald-200"><MdCheckCircle className="mt-0.5 shrink-0" size={16} />{notice}</p> : null}

            <button disabled={loading || Boolean(notice)} className="brand-gradient flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-xs font-black text-white disabled:opacity-60">
              {loading ? "Creando…" : <>Crear cuenta <MdArrowForward size={17} /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500">¿Ya tienes cuenta? <button type="button" onClick={goToLogin} className="font-bold text-orange-300 hover:text-orange-200">Iniciar sesión</button></p>
        </div>
      </section>
    </main>
  );
}
