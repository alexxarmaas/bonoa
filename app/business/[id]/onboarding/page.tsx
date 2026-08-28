"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  MdArrowBack,
  MdArrowForward,
  MdCategory,
  MdCheckCircle,
  MdLanguage,
  MdLocationOn,
  MdPalette,
  MdPhone,
  MdPrint,
  MdQrCodeScanner,
  MdRocketLaunch,
  MdStorefront,
  MdUpload,
  MdVisibility,
} from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import {
  DIRECTORY_CATEGORIES,
  getBusinessDirectorySettings,
  updateBusinessDirectorySettings,
  type DirectoryCategory,
} from "@/lib/business-directory";
import { markBusinessOnboardingCompleted, saveRequiredBusinessProfile } from "@/lib/business-onboarding";
import { setupLoyaltyProgramTemplate, updateBusinessClubProfile, type OnboardingTemplateKey } from "@/lib/commerce-v2";
import { friendlyError } from "@/lib/errors";
import { getBusinessAutomationRules } from "@/lib/loyalty-growth";
import { getPilotBusiness, uploadBusinessLogo } from "@/lib/pilot-data";

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
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#2563eb");
  const [category, setCategory] = useState<DirectoryCategory | "">("");
  const [directoryListed, setDirectoryListed] = useState(false);

  const [clubName, setClubName] = useState("");
  const [clubMessage, setClubMessage] = useState("Gracias por volver. Cada visita cuenta.");
  const [badge, setBadge] = useState("SOCIO");
  const [template, setTemplate] = useState<OnboardingTemplateKey>("ten_purchases_50");
  const [rewardName, setRewardName] = useState("Regalo especial");
  const [hasRule, setHasRule] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([
      getBusinessAccess(businessId, user.id),
      getPilotBusiness(businessId),
      getBusinessAutomationRules(businessId),
      getBusinessDirectorySettings(businessId),
    ])
      .then(([access, business, rules, directory]) => {
        if (!active) return;
        if (!access || (access.role !== "owner" && access.role !== "manager")) {
          throw new Error("Solo propietarios y managers pueden completar el onboarding.");
        }

        const extended = business as typeof business & {
          club_name?: string | null;
          club_message?: string | null;
          membership_badge_label?: string | null;
        };

        setBusinessName(business.name);
        setSlug(business.slug);
        setDescription(business.description ?? "");
        setPhone(business.phone ?? "");
        setWebsiteUrl(business.website_url ?? "");
        setInstagramUrl(business.instagram_url ?? "");
        setAddress(business.address ?? "");
        setLogoUrl(business.logo_url ?? "");
        setAccentColor(business.accent_color || "#2563eb");
        setCategory(directory.directory_category ?? "");
        setDirectoryListed(directory.directory_listed);
        setClubName(extended.club_name || `Club ${business.name}`);
        setClubMessage(extended.club_message || "Gracias por volver. Cada visita cuenta.");
        setBadge(extended.membership_badge_label || "SOCIO");
        setHasRule(rules.some((rule) => rule.active));
      })
      .catch((cause) => {
        if (active) setError(friendlyError(cause, "No hemos podido preparar el onboarding."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [businessId, user]);

  const commercialReady = useMemo(
    () => businessName.trim().length >= 2 && description.trim().length >= 20 && phone.trim().length >= 6 && address.trim().length >= 4,
    [address, businessName, description, phone],
  );
  const brandReady = Boolean(logoUrl.trim()) && /^#[0-9a-f]{6}$/i.test(accentColor.trim());
  const directoryReady = Boolean(category);
  const clubReady = clubName.trim().length >= 2 && clubMessage.trim().length >= 8 && badge.trim().length >= 2;
  const score = [commercialReady, brandReady, directoryReady, hasRule].filter(Boolean).length;
  const canFinish = commercialReady && brandReady && directoryReady && clubReady && (hasRule || rewardName.trim().length >= 2);

  const onLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    setError(null);
    setSuccess(null);
    try {
      const url = await uploadBusinessLogo(businessId, file);
      setLogoUrl(url);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido subir el logo."));
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy || !canFinish || !category) return;

    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await saveRequiredBusinessProfile(businessId, {
        name: businessName,
        description,
        phone,
        websiteUrl,
        instagramUrl,
        address,
        logoUrl,
        accentColor,
      });

      await updateBusinessClubProfile(businessId, {
        clubName,
        clubMessage,
        badgeLabel: badge,
      });

      if (!hasRule) {
        await setupLoyaltyProgramTemplate(businessId, template, rewardName);
        setHasRule(true);
      }

      await updateBusinessDirectorySettings(businessId, {
        listed: true,
        category,
      });
      await markBusinessOnboardingCompleted(businessId);
      setDirectoryListed(true);
      setSuccess("Negocio configurado y publicado en Bonōa. Ya puede aparecer en el directorio y empezar a fidelizar clientes.");
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo terminar la configuración."));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <main className="bonoa-shell"><div className="h-[42rem] animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;
  }

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Bonoa Business</p>
            <h1 className="mt-1 text-2xl font-black text-white">Pon {businessName || "tu negocio"} en marcha</h1>
          </div>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black text-white">{score}/4 esenciales listos</span>
      </header>

      <div className="mt-6 rounded-[1.6rem] border border-blue-400/15 bg-blue-400/[0.05] p-5 text-xs leading-6 text-blue-100">
        Completa esta ficha una sola vez. Al finalizar, Bonoa guardará la información comercial, preparará tu carnet y fidelización y publicará el negocio en <strong>/negocios</strong>. Después podrás editarlo u ocultarlo cuando quieras.
      </div>

      {error ? <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}
      {success ? <div className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-emerald-200"><MdCheckCircle className="mt-0.5 shrink-0" size={18} /> {success}</div> : null}

      <form onSubmit={submit} className="mt-7 space-y-6">
        <section className="bonoa-card rounded-[2rem] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-blue-400/15 bg-blue-400/[0.07] text-blue-300"><MdStorefront size={22} /></div>
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300">1 · Ficha comercial</p><h2 className="mt-1 text-xl font-black text-white">Datos que verá el cliente</h2></div>
            </div>
            {commercialReady ? <MdCheckCircle size={22} className="text-emerald-300" /> : null}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="text-xs font-bold text-zinc-400">Nombre comercial *<input required minLength={2} maxLength={120} value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40" /></label>
            <label className="text-xs font-bold text-zinc-400">Categoría *<div className="relative mt-2"><MdCategory className="absolute left-4 top-3.5 text-zinc-600" size={17} /><select required value={category} onChange={(event) => setCategory(event.target.value as DirectoryCategory | "")} className="w-full appearance-none rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-blue-400/40"><option value="">Selecciona una categoría</option>{DIRECTORY_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div></label>
            <label className="text-xs font-bold text-zinc-400 md:col-span-2">Descripción *<textarea required minLength={20} maxLength={1000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explica qué ofrece el negocio y por qué debería volver el cliente." className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-blue-400/40" /><span className="mt-1 block text-[10px] font-normal text-zinc-600">Mínimo 20 caracteres.</span></label>
            <label className="text-xs font-bold text-zinc-400">Teléfono *<div className="relative mt-2"><MdPhone className="absolute left-4 top-3.5 text-zinc-600" size={17} /><input required minLength={6} maxLength={40} type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="928 000 000" className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-blue-400/40" /></div></label>
            <label className="text-xs font-bold text-zinc-400">Dirección o zona *<div className="relative mt-2"><MdLocationOn className="absolute left-4 top-3.5 text-zinc-600" size={17} /><input required minLength={4} maxLength={300} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Las Palmas de Gran Canaria" className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-blue-400/40" /></div></label>
            <label className="text-xs font-bold text-zinc-400">Web <span className="font-normal text-zinc-600">(opcional)</span><div className="relative mt-2"><MdLanguage className="absolute left-4 top-3.5 text-zinc-600" size={17} /><input type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://..." className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-blue-400/40" /></div></label>
            <label className="text-xs font-bold text-zinc-400">Instagram <span className="font-normal text-zinc-600">(opcional)</span><input type="url" value={instagramUrl} onChange={(event) => setInstagramUrl(event.target.value)} placeholder="https://instagram.com/..." className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-blue-400/40" /></label>
          </div>
        </section>

        <section className="bonoa-card rounded-[2rem] p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.07] text-cyan-300"><MdPalette size={22} /></div><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">2 · Marca</p><h2 className="mt-1 text-xl font-black text-white">Que sea reconocible de un vistazo</h2></div></div>
            {brandReady ? <MdCheckCircle size={22} className="text-emerald-300" /> : null}
          </div>

          <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center">
            <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-[1.7rem] border border-white/10 bg-black/30">
              {logoUrl ? <img src={logoUrl} alt={`Logo de ${businessName || "negocio"}`} className="h-full w-full object-contain p-2" /> : <MdStorefront size={38} className="text-zinc-700" />}
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-white">Logotipo *</p>
              <p className="mt-1 text-[11px] leading-5 text-zinc-500">PNG, JPG o WEBP. Máximo 2 MB. Es obligatorio para publicar el negocio.</p>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:border-blue-400/20 hover:text-blue-200"><MdUpload size={17} /> {uploadingLogo ? "Subiendo…" : logoUrl ? "Cambiar logo" : "Subir logo"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingLogo} onChange={(event) => void onLogoChange(event)} className="hidden" /></label>
            </div>
            <label className="text-xs font-bold text-zinc-400"><span className="flex items-center gap-2"><MdPalette size={17} /> Color de marca *</span><div className="mt-2 flex items-center gap-2"><input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border border-white/10 bg-black p-1" /><input required value={accentColor} onChange={(event) => setAccentColor(event.target.value)} pattern="#[0-9A-Fa-f]{6}" className="w-28 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-xs text-white outline-none" /></div></label>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <section className="bonoa-card rounded-[2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">3 · Tu carnet</p><h2 className="mt-2 text-xl font-black text-white">Haz que parezca un club, no una promoción</h2>
            <div className="mt-5 space-y-4">
              <label className="block text-xs font-bold text-zinc-400">Nombre del club *<input required minLength={2} value={clubName} onChange={(event) => setClubName(event.target.value)} maxLength={80} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
              <label className="block text-xs font-bold text-zinc-400">Mensaje *<textarea required minLength={8} value={clubMessage} onChange={(event) => setClubMessage(event.target.value)} maxLength={240} rows={3} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
              <label className="block text-xs font-bold text-zinc-400">Etiqueta del carnet *<input required minLength={2} value={badge} onChange={(event) => setBadge(event.target.value.toUpperCase())} maxLength={24} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black text-white outline-none focus:border-orange-400/40" /></label>
            </div>
          </section>

          <section className="bonoa-card rounded-[2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">4 · Fidelización</p><h2 className="mt-2 text-xl font-black text-white">¿Qué hará que el cliente vuelva?</h2>
            {hasRule ? <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-emerald-200">Ya hay una regla activa. Mantendremos esa fidelización y actualizaremos el resto de la ficha.</div> : <div className="mt-5 grid gap-3 sm:grid-cols-2">{templates.map((item) => <button key={item.key} type="button" onClick={() => setTemplate(item.key)} className={`rounded-[1.3rem] border p-4 text-left ${template === item.key ? "border-orange-400/30 bg-orange-400/[0.08]" : "border-white/8 bg-white/[0.02]"}`}><p className="text-xs font-black text-white">{item.title}</p><p className="mt-2 text-[10px] leading-5 text-zinc-500">{item.detail}</p></button>)}</div>}
            {!hasRule ? <label className="mt-4 block text-xs font-bold text-zinc-400">Premio al completarlo *<input value={rewardName} onChange={(event) => setRewardName(event.target.value)} required minLength={2} maxLength={120} placeholder="Ej. Lavado premium gratis" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label> : null}
          </section>
        </div>

        <section className={`rounded-[2rem] border p-6 sm:p-8 ${directoryListed ? "border-emerald-400/20 bg-emerald-400/[0.05]" : "border-blue-400/20 bg-blue-400/[0.05]"}`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${directoryListed ? "bg-emerald-400/10 text-emerald-300" : "bg-blue-400/10 text-blue-300"}`}><MdVisibility size={24} /></div>
              <div><p className="text-sm font-black text-white">Publicación en el directorio</p><p className="mt-2 max-w-2xl text-xs leading-6 text-zinc-400">Al terminar el formulario, el negocio se publicará automáticamente en “Negocios” con la categoría seleccionada. Si más adelante quieres ocultarlo, podrás hacerlo desde la sección Directorio.</p></div>
            </div>
            {directoryListed ? <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-emerald-200">Ya visible</span> : null}
          </div>
        </section>

        <div className="sticky bottom-4 z-20 rounded-[1.6rem] border border-white/10 bg-[#0b1018]/95 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-black text-white">{canFinish ? "Todo listo para publicar" : "Completa los campos marcados con *"}</p><p className="mt-1 text-[10px] text-zinc-500">{directoryReady ? "Categoría seleccionada" : "Falta seleccionar categoría"} · {brandReady ? "Logo listo" : "Falta logo"}</p></div>
            <button disabled={busy || uploadingLogo || !canFinish} className="brand-gradient inline-flex items-center justify-center gap-2 rounded-full px-6 py-3.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><MdRocketLaunch size={18} /> {busy ? "Guardando y publicando…" : directoryListed ? "Guardar configuración" : "Finalizar y publicar negocio"}</button>
          </div>
        </div>
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

export default function BusinessOnboardingPage() {
  return <AuthGuard><OnboardingContent /></AuthGuard>;
}
