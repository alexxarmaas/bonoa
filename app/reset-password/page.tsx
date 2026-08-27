"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdLockReset } from "react-icons/md";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSessionReady(Boolean(data.session));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || session) setSessionReady(true);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(friendlyError(updateError, "No hemos podido actualizar la contraseña."));
      return;
    }
    setSuccess(true);
    window.setTimeout(() => router.replace("/wallet"), 900);
  };

  return (
    <main className="bonoa-shell grid min-h-screen place-items-center py-10">
      <section className="w-full max-w-md">
        <div className="bonoa-card rounded-[2rem] p-6 sm:p-8">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdLockReset size={24} /></div>
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Seguridad</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Nueva contraseña</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Elige una contraseña nueva para tu cuenta Bonoa.</p>

          {!sessionReady ? (
            <div className="mt-7 rounded-[1.5rem] border border-amber-400/15 bg-amber-400/5 p-5 text-xs leading-5 text-amber-100/80">
              Abre esta pantalla desde el enlace de recuperación que has recibido por email. Si el enlace ha caducado, solicita uno nuevo desde <Link href="/forgot-password" className="font-bold text-orange-300">recuperar contraseña</Link>.
            </div>
          ) : success ? (
            <div className="mt-7 rounded-[1.5rem] border border-emerald-400/15 bg-emerald-400/5 p-5 text-sm font-bold text-emerald-200">Contraseña actualizada. Entrando en tu wallet…</div>
          ) : (
            <form onSubmit={submit} className="mt-7 space-y-4">
              <label className="block"><span className="mb-2 block text-xs font-semibold text-zinc-400">Nueva contraseña</span><input required minLength={MIN_PASSWORD_LENGTH} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none focus:border-orange-500/50" placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`} /></label>
              <label className="block"><span className="mb-2 block text-xs font-semibold text-zinc-400">Repetir contraseña</span><input required minLength={MIN_PASSWORD_LENGTH} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3.5 text-sm text-white outline-none focus:border-orange-500/50" placeholder="Repite la contraseña" /></label>
              {error ? <p className="rounded-2xl border border-red-400/15 bg-red-400/5 px-4 py-3 text-xs leading-5 text-red-200">{error}</p> : null}
              <button disabled={loading} className="brand-gradient w-full rounded-full px-5 py-3.5 text-xs font-black text-white disabled:opacity-60">{loading ? "Guardando…" : "Guardar contraseña"}</button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
