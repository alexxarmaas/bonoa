"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { MdArrowBack, MdMarkEmailRead } from "react-icons/md";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);

    if (resetError) {
      setError(friendlyError(resetError, "No hemos podido enviar el correo de recuperación."));
      return;
    }

    setSent(true);
  };

  return (
    <main className="bonoa-shell grid min-h-screen place-items-center py-10">
      <section className="w-full max-w-md">
        <Link href="/login" className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white"><MdArrowBack size={17} /> Volver al acceso</Link>
        <div className="bonoa-card rounded-[2rem] p-6 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Seguridad</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Recupera tu acceso</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Te enviaremos un enlace seguro para elegir una contraseña nueva.</p>

          {sent ? (
            <div className="mt-7 rounded-[1.5rem] border border-emerald-400/15 bg-emerald-400/5 p-5">
              <MdMarkEmailRead size={26} className="text-emerald-300" />
              <p className="mt-3 text-sm font-black text-white">Revisa tu correo</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">Si existe una cuenta asociada a <span className="text-zinc-300">{email}</span>, recibirás el enlace de recuperación.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-4">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-zinc-400">Email</span>
                <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-500/50" placeholder="tu@email.com" />
              </label>
              {error ? <p className="rounded-2xl border border-red-400/15 bg-red-400/5 px-4 py-3 text-xs leading-5 text-red-200">{error}</p> : null}
              <button disabled={loading} className="brand-gradient w-full rounded-full px-5 py-3.5 text-xs font-black text-white disabled:opacity-60">{loading ? "Enviando…" : "Enviar enlace"}</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
