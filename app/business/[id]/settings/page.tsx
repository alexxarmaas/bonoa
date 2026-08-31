"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowBack, MdCheckCircle, MdContentCopy, MdLanguage, MdLocationOn, MdOpenInNew, MdPalette, MdPhone, MdSave, MdStorefront, MdUpload } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import { getPilotBusiness, updatePilotBusiness, uploadBusinessLogo } from "@/lib/pilot-data";

function SettingsContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [accentColor, setAccentColor] = useState("#ff5a1f");

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([getBusinessAccess(businessId, user.id), getPilotBusiness(businessId)])
      .then(([access, business]) => {
        if (!active) return;
        const canManage = access?.role === "owner" || access?.role === "manager";
        setAllowed(Boolean(canManage));
        setSlug(business.slug);
        setName(business.name);
        setDescription(business.description ?? "");
        setPhone(business.phone ?? "");
        setWebsiteUrl(business.website_url ?? "");
        setInstagramUrl(business.instagram_url ?? "");
        setAddress(business.address ?? "");
        setLogoUrl(business.logo_url ?? "");
        setAccentColor(business.accent_color ?? "#ff5a1f");
      })
      .catch((cause) => { if (active) setError(friendlyError(cause, "No hemos podido cargar la configuración.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId, user]);

  const onLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !allowed) return;
    setUploadingLogo(true);
    setError(null);
    setSuccess(null);
    try {
      const url = await uploadBusinessLogo(businessId, file);
      setLogoUrl(url);
      setSuccess("Logo subido. Guarda los cambios para aplicarlo a la ficha del negocio.");
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido subir el logo."));
    } finally {
      setUploadingLogo(false);
      event.target.value = "";
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!allowed || name.trim().length < 2) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updatePilotBusiness(businessId, { name, description, phone, websiteUrl, instagramUrl, address, logoUrl, accentColor });
      setSuccess("Ficha del negocio actualizada.");
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido guardar la ficha."));
    } finally {
      setSaving(false);
    }
  };

  const copyStorefront = async () => {
    if (!slug) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/c/${slug}`);
      setSuccess("Enlace público copiado.");
    } catch {
      setError("No hemos podido copiar el enlace. Puedes abrirlo y copiarlo desde el navegador.");
    }
  };

  if (loading) return <main className="bonoa-shell"><div className="h-96 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;

  if (allowed === false) {
    return <main className="bonoa-shell"><Link href={`/business/${businessId}`} className="text-xs font-bold text-orange-300">← Volver</Link><div className="mt-8 rounded-[2rem] border border-amber-400/15 bg-amber-400/5 p-8 text-center text-sm text-amber-100">Solo propietarios y managers pueden editar la ficha del negocio.</div></main>;
  }

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link>
          <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Bonoa Business</p><h1 className="mt-1 text-2xl font-black text-white">Configuración</h1></div>
        </div>
        {slug ? <div className="flex gap-2"><button type="button" onClick={() => void copyStorefront()} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300"><MdContentCopy size={16} /> Copiar escaparate</button><Link href={`/c/${slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/[0.07] px-4 py-2.5 text-xs font-black text-orange-200"><MdOpenInNew size={16} /> Ver público</Link></div> : null}
      </header>

      <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-xs leading-5 text-zinc-500">Esta información alimenta tu escaparate público y la presentación de tus bonos. El precio sigue siendo informativo durante el piloto: Bonoa registra la fidelización, pero no procesa el cobro.</div>

      {error ? <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}
      {success ? <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-emerald-200"><MdCheckCircle size={17} /> {success}</div> : null}

      <form onSubmit={onSubmit} className="bonoa-card mt-7 rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdStorefront size={22} /></div><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Ficha comercial</p><h2 className="mt-1 text-xl font-black text-white">Cómo te verá el cliente</h2></div></div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-bold text-zinc-400">Nombre comercial<input required minLength={2} value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
          <label className="text-xs font-bold text-zinc-400">Teléfono<div className="relative mt-2"><MdPhone className="absolute left-4 top-3.5 text-zinc-600" size={17} /><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="928 000 000" className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-orange-400/40" /></div></label>
          <label className="text-xs font-bold text-zinc-400 md:col-span-2">Descripción<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder="Qué haces y por qué debería volver el cliente" className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-orange-400/40" /></label>
          <label className="text-xs font-bold text-zinc-400">Web<div className="relative mt-2"><MdLanguage className="absolute left-4 top-3.5 text-zinc-600" size={17} /><input type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://..." className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-orange-400/40" /></div></label>
          <label className="text-xs font-bold text-zinc-400">Instagram<input type="url" value={instagramUrl} onChange={(event) => setInstagramUrl(event.target.value)} placeholder="https://instagram.com/..." className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
          <label className="text-xs font-bold text-zinc-400 md:col-span-2">Dirección<div className="relative mt-2"><MdLocationOn className="absolute left-4 top-3.5 text-zinc-600" size={17} /><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Calle, número, municipio" className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-orange-400/40" /></div></label>

          <div className="md:col-span-2 rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
                {logoUrl ? <img src={logoUrl} alt="Previsualización del logo" className="h-full w-full object-contain p-2" /> : <MdStorefront size={34} className="text-zinc-700" />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-white">Logotipo</p>
                <p className="mt-1 text-[11px] leading-5 text-zinc-500">PNG, JPG o WEBP. Máximo 2 MB. Se guarda directamente en Bonoa.</p>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:border-orange-400/20 hover:text-orange-200"><MdUpload size={17} /> {uploadingLogo ? "Subiendo…" : "Subir logo"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploadingLogo} onChange={(event) => void onLogoChange(event)} className="hidden" /></label>
              </div>
              <label className="text-xs font-bold text-zinc-400"><span className="flex items-center gap-2"><MdPalette size={17} /> Color de marca</span><div className="mt-2 flex items-center gap-2"><input type="color" value={accentColor} onChange={(event) => setAccentColor(event.target.value)} className="h-11 w-14 cursor-pointer rounded-xl border border-white/10 bg-black p-1" /><input value={accentColor} onChange={(event) => setAccentColor(event.target.value)} pattern="#[0-9A-Fa-f]{6}" className="w-28 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-xs text-white outline-none" /></div></label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end"><button disabled={saving || uploadingLogo} className="brand-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-black text-white disabled:opacity-40"><MdSave size={18} /> {saving ? "Guardando…" : "Guardar cambios"}</button></div>
      </form>
    </main>
  );
}

export default function BusinessSettingsPage() {
  return <AuthGuard><SettingsContent /></AuthGuard>;
}
