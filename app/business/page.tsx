"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdAddBusiness, MdArrowBack, MdArrowForward, MdStorefront } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { createBusiness, getMyBusinesses, slugifyBusinessName, type BusinessSummary } from "@/lib/business-data";

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
      .then((items) => {
        if (active) setBusinesses(items);
      })
      .catch(() => {
        if (active) setError("No hemos podido cargar tus negocios.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
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
      router.push(`/business/${business.id}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo crear el negocio.";
      setError(message.includes("duplicate") ? "Ese identificador ya está en uso. Prueba otro." : message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="bonoa-shell min-h-screen">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver"><MdArrowBack size={20} /></Link>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Bonoa Business</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Tus negocios</h1>
          </div>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.08] text-orange-300"><MdStorefront size={23} /></div>
      </header>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? Array.from({ length: 2 }).map((_, index) => <div key={index} className="h-40 animate-pulse rounded-[1.6rem] border border-white/8 bg-white/[0.035]" />) : null}
        {!loading && businesses.map((business) => (
          <Link key={business.id} href={`/business/${business.id}`} className="bonoa-card group rounded-[1.6rem] p-5 transition hover:-translate-y-0.5 hover:border-white/20">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdStorefront size={22} /></div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">{business.role}</span>
            </div>
            <h2 className="mt-5 text-xl font-black tracking-tight text-white">{business.name}</h2>
            <p className="mt-1 text-xs text-zinc-600">bonoa.app/{business.slug}</p>
            <div className="mt-6 flex items-center justify-between text-xs font-bold text-zinc-400">
              Abrir panel <MdArrowForward size={18} className="transition group-hover:translate-x-1 group-hover:text-orange-300" />
            </div>
          </Link>
        ))}
      </section>

      {!loading && businesses.length === 0 ? (
        <div className="mt-8 rounded-[1.6rem] border border-dashed border-white/10 p-8 text-center">
          <MdAddBusiness size={32} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm font-bold text-white">Todavía no gestionas ningún negocio</p>
          <p className="mt-2 text-xs leading-5 text-zinc-500">Crea el primero y podrás definir bonos, asignarlos y validar consumos desde el móvil.</p>
        </div>
      ) : null}

      <section className="bonoa-card mt-8 rounded-[2rem] p-6 sm:p-8">
        <div className="max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Nuevo espacio</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Crear negocio</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-500">Al crearlo quedas registrado automáticamente como owner.</p>
        </div>

        <form onSubmit={onCreate} className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-bold text-zinc-400">
            Nombre
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="StarGarage" required minLength={2} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-400/40" />
          </label>
          <label className="text-xs font-bold text-zinc-400">
            Identificador
            <input value={currentSlug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value.toLowerCase()); }} placeholder="stargarage" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-700 focus:border-orange-400/40" />
          </label>
          <div className="md:col-span-2 flex flex-wrap items-center gap-3">
            <button disabled={creating || !name.trim() || !currentSlug} className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
              <MdAddBusiness size={19} /> {creating ? "Creando…" : "Crear negocio"}
            </button>
            {error ? <p className="text-xs text-red-300">{error}</p> : null}
          </div>
        </form>
      </section>
    </main>
  );
}

export default function BusinessHomePage() {
  return <AuthGuard><BusinessHomeContent /></AuthGuard>;
}
