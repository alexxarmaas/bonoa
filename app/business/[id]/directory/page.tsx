"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  MdArrowBack,
  MdCategory,
  MdCheckCircle,
  MdOpenInNew,
  MdSave,
  MdStorefront,
  MdVisibility,
  MdVisibilityOff,
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
import { friendlyError } from "@/lib/errors";

function BusinessDirectoryContent() {
  const { user } = useAuth();
  const { id: businessId } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [listed, setListed] = useState(false);
  const [category, setCategory] = useState<DirectoryCategory | "">("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([getBusinessAccess(businessId, user.id), getBusinessDirectorySettings(businessId)])
      .then(([access, settings]) => {
        if (!active) return;
        const canManage = access?.role === "owner" || access?.role === "manager";
        setAllowed(Boolean(canManage));
        setName(settings.name);
        setSlug(settings.slug);
        setListed(settings.directory_listed);
        setCategory(settings.directory_category ?? "");
      })
      .catch((cause) => {
        if (active) setError(friendlyError(cause, "No hemos podido cargar la configuración del directorio."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [businessId, user]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!allowed) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateBusinessDirectorySettings(businessId, {
        listed,
        category: category || null,
      });
      setSuccess(listed ? "Tu negocio ya puede aparecer en el directorio de Bonōa." : "Tu negocio ha quedado oculto del directorio.");
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido guardar la visibilidad del negocio."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <main className="bonoa-shell pb-24"><div className="bonoa-card h-96 animate-pulse rounded-[2rem]" /></main>;
  }

  if (allowed === false) {
    return (
      <main className="bonoa-shell pb-24">
        <Link href={`/business/${businessId}`} className="text-xs font-bold text-[#2563eb]">← Volver</Link>
        <div className="mt-8 rounded-[2rem] border border-amber-200 bg-amber-50 p-8 text-center text-sm text-amber-800">Solo propietarios y managers pueden decidir si el negocio aparece en el directorio.</div>
      </main>
    );
  }

  return (
    <main className="bonoa-shell pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-[#dbe7f5] bg-white text-[#475569] shadow-sm" aria-label="Volver"><MdArrowBack size={20} /></Link>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2563eb]">Bonoa Business</p>
            <h1 className="mt-1 text-2xl font-black text-[#0f172a]">Directorio</h1>
          </div>
        </div>
        {slug ? <Link href={`/c/${slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-4 py-2.5 text-xs font-black text-[#334155] shadow-sm"><MdOpenInNew size={16} /> Ver escaparate</Link> : null}
      </header>

      <section className="bonoa-card bonoa-glow relative mt-7 overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full bg-[#2563eb]/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_.7fr] lg:items-center">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#06b6d4]">Captación + fidelización</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-[-0.04em] text-[#0f172a]">Haz que nuevos clientes descubran {name || "tu negocio"}.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#64748b]">Al publicar tu negocio, los usuarios de Bonōa podrán encontrarlo por nombre y categoría, ver tus bonos públicos y entrar en tu escaparate. Puedes ocultarlo de nuevo cuando quieras.</p>
          </div>
          <div className={`rounded-[1.6rem] border p-5 ${listed ? "border-emerald-200 bg-emerald-50" : "border-[#dbe7f5] bg-[#f8fbff]"}`}>
            <div className="flex items-center gap-3">
              <div className={`grid h-12 w-12 place-items-center rounded-2xl ${listed ? "bg-emerald-100 text-emerald-700" : "bg-white text-[#94a3b8]"}`}>{listed ? <MdVisibility size={24} /> : <MdVisibilityOff size={24} />}</div>
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-[#64748b]">Estado</p><p className={`mt-1 text-lg font-black ${listed ? "text-emerald-800" : "text-[#334155]"}`}>{listed ? "Visible en Bonōa" : "Oculto"}</p></div>
            </div>
          </div>
        </div>
      </section>

      {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">{error}</div> : null}
      {success ? <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-700"><MdCheckCircle size={17} /> {success}</div> : null}

      <form onSubmit={onSubmit} className="bonoa-card mt-7 rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[#bfdbfe] bg-[#eff6ff] text-[#2563eb]"><MdStorefront size={22} /></div>
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2563eb]">Publicación</p><h2 className="mt-1 text-xl font-black text-[#0f172a]">Dónde usar Bonōa</h2></div>
        </div>

        <label className="mt-7 flex cursor-pointer items-start justify-between gap-5 rounded-[1.5rem] border border-[#dbe7f5] bg-[#f8fbff] p-5">
          <div>
            <p className="text-sm font-black text-[#0f172a]">Mostrar mi negocio en el directorio</p>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-[#64748b]">Solo se mostrará mientras el negocio esté activo. El escaparate público seguirá funcionando aunque desactives esta opción.</p>
          </div>
          <input type="checkbox" checked={listed} onChange={(event) => setListed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#2563eb]" />
        </label>

        <label className="mt-5 block text-xs font-bold text-[#475569]">
          <span className="flex items-center gap-2"><MdCategory size={18} /> Categoría</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as DirectoryCategory | "")}
            className="mt-2 w-full rounded-2xl border border-[#dbe7f5] bg-white px-4 py-3.5 text-sm font-semibold text-[#0f172a] outline-none focus:border-[#93c5fd]"
          >
            <option value="">Selecciona una categoría</option>
            {DIRECTORY_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <span className="mt-2 block text-[10px] font-normal leading-5 text-[#94a3b8]">La categoría ayuda a que los clientes te encuentren mediante los filtros del directorio.</span>
        </label>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-[#e8eef7] pt-6">
          <p className="max-w-xl text-[10px] leading-5 text-[#94a3b8]">Al activar esta opción aceptas que la ficha comercial, ubicación y bonos marcados como públicos puedan mostrarse a usuarios de Bonōa.</p>
          <button disabled={saving || (listed && !category)} className="brand-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs font-black text-white shadow-[0_14px_34px_rgba(37,99,235,.18)] disabled:opacity-40"><MdSave size={18} /> {saving ? "Guardando…" : "Guardar directorio"}</button>
        </div>
      </form>
    </main>
  );
}

export default function BusinessDirectoryPage() {
  return <AuthGuard><BusinessDirectoryContent /></AuthGuard>;
}
