"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdArrowForward, MdCheckCircle } from "react-icons/md";
import { useAuth } from "@/components/auth/AuthProvider";
import BonoaLogo from "@/components/brand/BonoaLogo";

const MIN_PASSWORD_LENGTH = 8;

function safeNextPath() {
  if (typeof window === "undefined") return "/wallet";
  const value = new URLSearchParams(window.location.search).get("next");
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/wallet";
}

type RegisterResponse = {
  ok?: boolean;
  message?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
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
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (!acceptedLegal) {
      setError("Necesitas aceptar las condiciones de uso y la información de privacidad para crear la cuenta.");
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      setError("El registro no está disponible temporalmente.");
      return;
    }

    setLoading(true);
    const next = safeNextPath();

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/register-with-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          email: email.trim(),
          password,
          next,
        }),
      });

      const result = await response.json().catch(() => ({})) as RegisterResponse;
      if (!response.ok) {
        setError(result.message || "No hemos podido crear tu cuenta.");
        return;
      }

      setNotice(result.message || "Cuenta creada. Revisa tu correo para confirmar el acceso.");
    } catch {
      setError("No hemos podido conectar con el servicio de registro. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    const next = safeNextPath();
    router.push(next === "/wallet" ? "/login" : `/login?next=${encodeURIComponent(next)}`);
  };

  return (
    <main className="bonoa-shell grid min-h-screen place-items-center py-10">
      <section className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex"><BonoaLogo className="scale-110" /></Link>
          <p className="mt-4 text-sm text-[#64748b]">Una cuenta. Una wallet. Un solo QR.</p>
        </div>

        <div className="bonoa-card rounded-[2rem] p-6 sm:p-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563eb]">Registro</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0f172a]">Crea tu wallet</h1>
          <p className="mt-3 text-sm leading-6 text-[#64748b]">Al registrarte Bonoa creará automáticamente tu identidad y tu QR personal.</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-[#475569]">Nombre</span>
              <input required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-[#dbe7f5] bg-white px-4 py-3.5 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" placeholder="Tu nombre" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-[#475569]">Email</span>
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-[#dbe7f5] bg-white px-4 py-3.5 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" placeholder="tu@email.com" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-[#475569]">Contraseña</span>
              <input required minLength={MIN_PASSWORD_LENGTH} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-[#dbe7f5] bg-white px-4 py-3.5 text-sm text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" placeholder={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres`} />
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#dbe7f5] bg-[#f8fbff] p-4">
              <input required type="checkbox" checked={acceptedLegal} onChange={(event) => setAcceptedLegal(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#2563eb]" />
              <span className="text-[11px] leading-5 text-[#64748b]">He leído y acepto las <Link href="/terminos" target="_blank" className="font-black text-[#2563eb]">Condiciones de uso</Link> y confirmo haber leído la <Link href="/privacidad" target="_blank" className="font-black text-[#2563eb]">información de privacidad</Link>.</span>
            </label>

            {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">{error}</p> : null}
            {notice ? <p className="flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs leading-5 text-emerald-700"><MdCheckCircle className="mt-0.5 shrink-0" size={16} />{notice}</p> : null}

            <button disabled={loading || Boolean(notice) || !acceptedLegal} className="brand-gradient flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-xs font-black text-white shadow-[0_14px_34px_rgba(37,99,235,.2)] disabled:opacity-60">
              {loading ? "Creando…" : <>Crear cuenta <MdArrowForward size={17} /></>}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#64748b]">¿Ya tienes cuenta? <button type="button" onClick={goToLogin} className="font-bold text-[#2563eb] hover:text-[#1d4ed8]">Iniciar sesión</button></p>
        </div>
      </section>
    </main>
  );
}
