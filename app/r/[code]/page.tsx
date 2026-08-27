"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowForward, MdCheckCircle, MdGroupAdd, MdRedeem, MdSecurity } from "react-icons/md";
import { useAuth } from "@/components/auth/AuthProvider";
import { claimReferral, getPublicReferral, type PublicReferral } from "@/lib/commerce-v2";
import { friendlyError } from "@/lib/errors";

export default function PublicReferralPage() {
  const { code } = useParams<{ code: string }>();
  const { user, loading: authLoading } = useAuth();
  const [referral, setReferral] = useState<PublicReferral | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    let active = true;
    getPublicReferral(code)
      .then((value) => { if (active) setReferral(value); })
      .catch((cause) => { if (active) setError(friendlyError(cause, "No hemos podido abrir esta invitación.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [code]);

  const accept = async () => {
    if (!user || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await claimReferral(code);
      if (result.status === "rejected") {
        setError(result.reason === "self_referral" ? "No puedes usar tu propia invitación." : "Ya has usado una invitación para este negocio.");
      } else {
        setJoined(true);
      }
    } catch (cause) { setError(friendlyError(cause, "No se pudo aceptar la invitación.")); }
    finally { setBusy(false); }
  };

  if (loading || authLoading) return <main className="bonoa-shell grid min-h-screen place-items-center"><div className="h-96 w-full max-w-lg animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;
  if (!referral) return <main className="bonoa-shell grid min-h-screen place-items-center"><div className="max-w-md text-center"><MdGroupAdd className="mx-auto text-zinc-700" size={44} /><h1 className="mt-4 text-2xl font-black text-white">Invitación no disponible</h1><p className="mt-2 text-sm text-zinc-500">Puede haber caducado o el programa de referidos está pausado.</p><Link href="/" className="mt-5 inline-flex text-xs font-black text-orange-200">Ir a Bonoa</Link></div></main>;

  const accent = referral.business_accent_color || "#ff5a1f";
  const next = `/r/${code}`;

  return (
    <main className="bonoa-shell grid min-h-screen place-items-center py-10">
      <section className="relative w-full max-w-xl overflow-hidden rounded-[2.4rem] border border-white/10 bg-[#090909] p-6 shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl" style={{ backgroundColor: `${accent}25` }} />
        <div className="relative">
          <div className="flex items-center justify-between gap-4"><Link href="/" className="text-lg font-black text-white">bon<span style={{ color: accent }}>ō</span>a</Link><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-400">Invitación</span></div>
          <div className="mt-10 flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[1.4rem] border bg-black/30" style={{ borderColor: `${accent}40` }}>{referral.business_logo_url ? <img src={referral.business_logo_url} alt="" className="h-full w-full object-contain p-1.5" /> : <MdGroupAdd size={28} style={{ color: accent }} />}</div><div><p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>{referral.business_name}</p><h1 className="mt-1 text-3xl font-black text-white">{referral.headline}</h1></div></div>
          <div className="mt-7 grid gap-3 sm:grid-cols-2"><div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5"><MdRedeem style={{ color: accent }} size={22} /><p className="mt-3 text-xs font-black text-white">Tu amigo gana</p><p className="mt-1 text-sm text-zinc-400">{referral.referrer_reward}</p></div><div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5"><MdGroupAdd className="text-emerald-300" size={22} /><p className="mt-3 text-xs font-black text-white">Tú {referral.referred_reward ? "también ganas" : "entras al club"}</p><p className="mt-1 text-sm text-zinc-400">{referral.referred_reward || "Tu carnet se activa al aceptar la invitación."}</p></div></div>
          <div className="mt-5 flex gap-3 rounded-2xl border border-white/8 bg-black/20 p-4"><MdSecurity className="mt-0.5 shrink-0 text-zinc-500" size={18} /><p className="text-[11px] leading-5 text-zinc-500">El premio se valida con tu primera compra{referral.minimum_purchase_cents > 0 ? ` de al menos ${(referral.minimum_purchase_cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}` : ""}. Una invitación por cliente.</p></div>

          {error ? <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}
          {joined ? <div className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-emerald-200"><MdCheckCircle className="mt-0.5 shrink-0" size={17} /><div><p className="font-black">Invitación aceptada</p><p className="mt-1 text-emerald-200/70">Tu relación con {referral.business_name} ya está creada. Cuando hagas la primera compra válida, Bonoa entregará los premios automáticamente.</p></div></div> : null}

          {!joined ? user ? <button type="button" onClick={() => void accept()} disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-xs font-black text-white disabled:opacity-50" style={{ backgroundColor: accent }}>{busy ? "Aceptando…" : <>Aceptar invitación <MdArrowForward size={18} /></>}</button> : <Link href={`/register?next=${encodeURIComponent(next)}`} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-xs font-black text-white" style={{ backgroundColor: accent }}>Crear cuenta y aceptar <MdArrowForward size={18} /></Link> : <Link href={`/c/${referral.business_slug}`} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-xs font-black text-white" style={{ backgroundColor: accent }}>Ver el club <MdArrowForward size={18} /></Link>}
          {!user && !joined ? <p className="mt-3 text-center text-[10px] text-zinc-600">¿Ya tienes cuenta? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-bold text-zinc-400">Entrar</Link></p> : null}
        </div>
      </section>
    </main>
  );
}
