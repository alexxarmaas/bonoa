"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowBack, MdArrowForward, MdCheckCircle, MdPalette, MdPrint, MdQrCodeScanner, MdRocketLaunch, MdStorefront } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { setupLoyaltyProgramTemplate, updateBusinessClubProfile, type OnboardingTemplateKey } from "@/lib/commerce-v2";
import { friendlyError } from "@/lib/errors";
import { getBusinessAutomationRules } from "@/lib/loyalty-growth";
import { getPilotBusiness, getPilotOnboarding } from "@/lib/pilot-data";

const templates: Array<{ key: OnboardingTemplateKey; title: string; detail: string }> = [
  { key: "five_visits", title: "5 visitas → regalo", detail: "Ideal para cafeterías, barberías y negocios de frecuencia." },
  { key: "ten_purchases", title: "10 compras → regalo", detail: "Cada compra suma una casilla, independientemente del importe." },
  { key: "ten_purchases_50", title: "10 compras de ≥ 50 € → regalo", detail: "Solo cuentan las compras que superen el importe mínimo." },
  { key: "spend_100", title: "100 € acumulados → regalo", detail: "El progreso avanza por gasto identificado en el comercio." },
];

function OnboardingContent() {
  const { user } = useAuth();
  const { id: businessId } = useParams<{ id: string }>();
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [clubName, setClubName] = useState("");
  const [clubMessage, setClubMessage] = useState("Gracias por volver. Cada visita cuenta.");
  const [badge, setBadge] = useState("SOCIO");
  const [template, setTemplate] = useState<OnboardingTemplateKey>("ten_purchases_50");
  const [rewardName, setRewardName] = useState("Regalo especial");
  const [profileReady, setProfileReady] = useState(false);
  const [brandReady, setBrandReady] = useState(false);
  const [hasRule, setHasRule] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([getBusinessAccess(businessId, user.id), getPilotOnboarding(businessId), getPilotBusiness(businessId), getBusinessAutomationRules(businessId)])
      .then(([access, onboarding, business, rules]) => {
        if (!active) return;
        if (!access || (access.role !== "owner" && access.role !== "manager")) throw new Error("Solo propietarios y managers pueden completar el onboarding.");
        setBusinessName(business.name);
        setSlug(business.slug);
        setClubName((business as typeof business & { club_name?: string | null }).club_name || `Club ${business.name}`);
        setClubMessage((business as typeof business & { club_message?: string | null }).club_message || "Gracias por volver. Cada visita cuenta.");
        setBadge((business as typeof business & { membership_badge_label?: string | null }).membership_badge_label || "SOCIO");
        setProfileReady(onboarding.profileReady);
        setBrandReady(onboarding.brandReady);
        setHasRule(rules.some((rule) => rule.active));
      })
      .catch((cause) => { if (active) setError(friendlyError(cause, "No hemos podido preparar el onboarding.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId, user]);

  const score = useMemo(() => [profileReady, brandReady, hasRule].filter(Boolean).length, [profileReady, brandReady, hasRule]);

  const saveClub = async () => {
    await updateBusinessClubProfile(businessId, { clubName, clubMessage, badgeLabel: badge });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(null); setSuccess(null);
    try {
      await saveClub();
      if (!hasRule) {
        await setupLoyaltyProgramTemplate(businessId, template, rewardName);
        setHasRule(true);
      }
      setSuccess("Tu club está listo. Ya puedes poner el QR en mostrador y registrar el primer cliente.");
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo terminar la configuración."));
    } finally { setBusy(false); }
  };

  if (loading) return <main className="bonoa-shell"><div className="h-[36rem] animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300"><MdArrowBack size={20} /></Link><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Bonoa Business</p><h1 className="mt-1 text-2xl font-black text-white">Pon {businessName || "tu negocio"} en marcha</h1></div></div>
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-white">{score}/3 base lista</span>
      </header>

      {error ? <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}
      {success ? <div className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-emerald-200"><MdCheckCircle className="mt-0.5 shrink-0" size={18} /> {success}</div> : null}

      <section className="mt-7 grid gap-4 md:grid-cols-3">
        <Link href={`/business/${businessId}/settings`} className={`rounded-[1.6rem] border p-5 ${profileReady ? "border-emerald-400/15 bg-emerald-400/[0.04]" : "border-white/8 bg-white/[0.025]"}`}><MdStorefront className={profileReady ? "text-emerald-300" : "text-zinc-400"} size={23} /><p className="mt-4 text-sm font-black text-white">1. Ficha comercial</p><p className="mt-1 text-[11px] leading-5 text-zinc-500">Nombre, descripción y forma de contacto.</p><p className="mt-4 text-[10px] font-black uppercase tracking-[0.15em] text-orange-200">{profileReady ? "Lista ✓" : "Completar"}</p></Link>
        <Link href={`/business/${businessId}/settings`} className={`rounded-[1.6rem] border p-5 ${brandReady ? "border-emerald-400/15 bg-emerald-400/[0.04]" : "border-white/8 bg-white/[0.025]"}`}><MdPalette className={brandReady ? "text-emerald-300" : "text-zinc-400"} size={23} /><p className="mt-4 text-sm font-black text-white">2. Marca</p><p className="mt-1 text-[11px] leading-5 text-zinc-500">Logo y color para que el carnet sea reconocible.</p><p className="mt-4 text-[10px] font-black uppercase tracking-[0.15em] text-orange-200">{brandReady ? "Lista ✓" : "Añadir logo"}</p></Link>
        <div className={`rounded-[1.6rem] border p-5 ${hasRule ? "border-emerald-400/15 bg-emerald-400/[0.04]" : "border-orange-400/15 bg-orange-400/[0.04]"}`}><MdRocketLaunch className={hasRule ? "text-emerald-300" : "text-orange-300"} size={23} /><p className="mt-4 text-sm font-black text-white">3. Fidelización</p><p className="mt-1 text-[11px] leading-5 text-zinc-500">Elige una plantilla y Bonoa crea premio + regla.</p><p className="mt-4 text-[10px] font-black uppercase tracking-[0.15em] text-orange-200">{hasRule ? "Activa ✓" : "Configurar abajo"}</p></div>
      </section>

      <form onSubmit={submit} className="mt-6 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <section className="bonoa-card rounded-[2rem] p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Tu carnet</p><h2 className="mt-2 text-xl font-black text-white">Haz que parezca un club, no una promoción</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-xs font-bold text-zinc-400">Nombre del club<input value={clubName} onChange={(e) => setClubName(e.target.value)} maxLength={80} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
            <label className="block text-xs font-bold text-zinc-400">Mensaje<textarea value={clubMessage} onChange={(e) => setClubMessage(e.target.value)} maxLength={240} rows={3} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
            <label className="block text-xs font-bold text-zinc-400">Etiqueta del carnet<input value={badge} onChange={(e) => setBadge(e.target.value.toUpperCase())} maxLength={24} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black text-white outline-none focus:border-orange-400/40" /></label>
          </div>
        </section>

        <section className="bonoa-card rounded-[2rem] p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Primer objetivo</p><h2 className="mt-2 text-xl font-black text-white">¿Qué hará que el cliente vuelva?</h2>
          {hasRule ? <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-emerald-200">Ya hay una regla activa. Guardar aquí actualizará la apariencia del carnet sin crear otra regla.</div> : <div className="mt-5 grid gap-3 sm:grid-cols-2">{templates.map((item) => <button key={item.key} type="button" onClick={() => setTemplate(item.key)} className={`rounded-[1.3rem] border p-4 text-left ${template === item.key ? "border-orange-400/30 bg-orange-400/[0.08]" : "border-white/8 bg-white/[0.02]"}`}><p className="text-xs font-black text-white">{item.title}</p><p className="mt-2 text-[10px] leading-5 text-zinc-500">{item.detail}</p></button>)}</div>}
          {!hasRule ? <label className="mt-4 block text-xs font-bold text-zinc-400">¿Qué recibe al completarlo?<input value={rewardName} onChange={(e) => setRewardName(e.target.value)} required minLength={2} maxLength={120} placeholder="Ej. Lavado premium gratis" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label> : null}
          <button disabled={busy || !clubName.trim() || (!hasRule && !rewardName.trim())} className="brand-gradient mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-xs font-black text-white disabled:opacity-40"><MdRocketLaunch size={18} /> {busy ? "Configurando…" : hasRule ? "Guardar carnet" : "Crear club y fidelización"}</button>
        </section>
      </form>

      <section className="mt-6 grid gap-3 md:grid-cols-3">
        <Link href={`/business/${businessId}/print`} className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-5"><MdPrint size={21} className="text-zinc-300" /><p className="mt-3 text-sm font-black text-white">Imprime tu QR</p><p className="mt-1 text-[11px] leading-5 text-zinc-600">Cartel para mostrador con acceso a tu espacio público.</p></Link>
        <Link href={`/c/${slug}`} target="_blank" className="rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-5"><MdStorefront size={21} className="text-zinc-300" /><p className="mt-3 text-sm font-black text-white">Mira lo que verá el cliente</p><p className="mt-1 text-[11px] leading-5 text-zinc-600">Escaparate, club, objetivo y CTA para unirse.</p></Link>
        <Link href={`/business/${businessId}/engage`} className="rounded-[1.5rem] border border-orange-400/15 bg-orange-400/[0.04] p-5"><MdQrCodeScanner size={21} className="text-orange-300" /><p className="mt-3 text-sm font-black text-white">Haz una prueba</p><p className="mt-1 text-[11px] leading-5 text-zinc-600">Escanea un QR y registra la primera compra o visita.</p></Link>
      </section>
      <Link href={`/business/${businessId}`} className="mt-6 inline-flex items-center gap-2 text-xs font-black text-orange-200">Ir al panel <MdArrowForward size={17} /></Link>
    </main>
  );
}

export default function BusinessOnboardingPage() { return <AuthGuard><OnboardingContent /></AuthGuard>; }
