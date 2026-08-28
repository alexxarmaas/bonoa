"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdAddBusiness, MdArrowBack, MdArrowForward, MdGroups, MdLockClock, MdOpenInNew, MdPointOfSale, MdRocketLaunch, MdStorefront } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { createBusiness, getMyBusinesses, slugifyBusinessName, type BusinessSummary } from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";

const roleLabel = { owner: "Propietario", manager: "Manager", staff: "Staff" } as const;

function BusinessHomeContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getMyBusinesses(user.id)
      .then((items) => { if (active) setBusinesses(items); })
      .catch((cause) => { if (active) setError(friendlyError(cause, "No hemos podido cargar tus negocios.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const suggestedSlug = useMemo(() => slugifyBusinessName(name), [name]);
  const currentSlug = slugTouched ? slug : suggestedSlug;

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedSlug = currentSlug.trim();
    if (name.trim().length < 2 || !normalizedSlug) return;

    setCreating(true);
    setError(null);
    try {
      const business = await createBusiness(name.trim(), normalizedSlug);
      router.push(`/business/${business.id}/onboarding`);
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo crear el negocio."));
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver"><MdArrowBack size={20} /></Link>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Bonoa Business</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">Tus negocios</h1></div>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.08] text-orange-300"><MdStorefront size={23} /></div>
      </header>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? Array.from({ length: 2 }).map((_, index) => <div key={index} className="h-52 animate-pulse rounded-[1.8rem] border border-white/8 bg-white/[0.035]" />) : null}
        {!loading && businesses.map((business) => {
          const canManageTeam = business.role === "owner" || business.role === "manager";
          const onboardingComplete = Boolean(business.onboarding_completed_at);
          const accent = business.accent_color || "#ff5a1f";

          return (
            <article key={business.id} className={`bonoa-card relative overflow-hidden rounded-[1.8rem] p-5 ${onboardingComplete ? "" : "border-amber-400/15"}`}>
              <div className="absolute inset-x-0 top-0 h-1" style={{ background: onboardingComplete ? accent : "#f59e0b" }} />
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border bg-black/30" style={{ borderColor: `${accent}40` }}>{business.logo_url ? <img src={business.logo_url} alt={`Logo de ${business.name}`} className="h-full w-full object-contain p-1.5" /> : <MdStorefront size={25} style={{ color: accent }} />}</div>
                <div className="flex flex-wrap justify-end gap-2">
                  {!onboardingComplete ? <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/15 bg-amber-400/[0.07] px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-200"><MdLockClock size={13} /> Alta pendiente</span> : null}
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400">{roleLabel[business.role]}</span>
                </div>
              </div>
              <h2 className="mt-5 text-xl font-black tracking-tight text-white">{business.name}</h2>
              <p className="mt-1 text-xs text-zinc-600">/c/{business.slug}</p>

              {!onboardingComplete ? (
                <>
                  <p className="mt-3 text-xs leading-5 text-zinc-500">Antes de operar hay que completar ficha comercial, marca, carnet y primera fidelización.</p>
                  {canManageTeam ? (
                    <Link href={`/business/${business.id}/onboarding`} className="brand-gradient mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-black text-white"><MdRocketLaunch size={18} /> Completar alta</Link>
                  ) : (
                    <div className="mt-6 rounded-2xl border border-amber-400/10 bg-amber-400/[0.04] p-4 text-center text-[11px] leading-5 text-amber-100/70">El propietario o manager debe terminar el alta antes de que el equipo pueda usar el negocio.</div>
                  )}
                </>
              ) : (
                <>
                  {business.description ? <p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-500">{business.description}</p> : <p className="mt-3 text-xs text-zinc-700">Negocio listo para operar en Bonoa.</p>}

                  <div className="mt-6 grid grid-cols-2 gap-2">
                    <Link href={`/business/${business.id}/counter`} className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-black text-white" style={{ background: accent }}><MdPointOfSale size={17} /> Mostrador</Link>
                    <Link href={`/business/${business.id}`} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300">Panel <MdArrowForward size={16} /></Link>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {canManageTeam ? <Link href={`/business/${business.id}/onboarding`} className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/15 bg-orange-400/[0.05] px-3 py-2 text-[10px] font-bold text-orange-200"><MdRocketLaunch size={14} /> Configuración inicial</Link> : null}
                    <Link href={`/c/${business.slug}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-full border border-white/8 px-3 py-2 text-[10px] font-bold text-zinc-500 hover:text-zinc-300"><MdOpenInNew size={14} /> Escaparate</Link>
                    {canManageTeam ? <Link href={`/business/${business.id}/team`} className="inline-flex items-center gap-1.5 rounded-full border border-white/8 px-3 py-2 text-[10px] font-bold text-zinc-500 hover:text-zinc-300"><MdGroups size={15} /> Equipo</Link> : null}
                  </div>
                </>
              )}
            </article>
          );
        })}
      </section>

      {!loading && businesses.length === 0 ? <div className="mt-8 rounded-[1.6rem] border border-dashed border-white/10 p-8 text-center"><MdAddBusiness size={32} className="mx-auto text-zinc-600" /><p className="mt-3 text-sm font-bold text-white">Todavía no gestionas ningún negocio</p><p className="mt-2 text-xs leading-5 text-zinc-500">Crea el primero y Bonoa te llevará por el onboarding obligatorio antes de habilitar el mostrador.</p></div> : null}

      <section className="bonoa-card mt-8 rounded-[2rem] p-6 sm:p-8">
        <div className="max-w-xl"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Nuevo espacio</p><h2 className="mt-2 text-2xl font-black tracking-tight text-white">Crear negocio</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Crea el espacio con nombre e identificador. Bonoa te llevará directamente al alta obligatoria y habilitará la operativa cuando quede completada.</p></div>
        <form onSubmit={onCreate} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-bold text-zinc-400">Nombre<input value={name} onChange={(event) => setName(event.target.value)} placeholder="StarGarage" required minLength={2} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-400/40" /></label>
          <label className="text-xs font-bold text-zinc-400">Identificador<input value={currentSlug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value.toLowerCase()); }} placeholder="stargarage" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-400/40" /></label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3"><button disabled={creating || !name.trim() || !currentSlug} className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><MdAddBusiness size={19} /> {creating ? "Creando…" : "Crear y completar alta"}</button>{error ? <p className="text-xs text-red-300">{error}</p> : null}</div>
        </form>
      </section>
    </main>
  );
}

export default function BusinessHomePage() { return <AuthGuard><BusinessHomeContent /></AuthGuard>; }
