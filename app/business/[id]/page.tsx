"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdAdd, MdArrowBack, MdHistory, MdQrCodeScanner, MdStorefront, MdStyle, MdToggleOff, MdToggleOn } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  createBusinessProduct,
  getBusinessAccess,
  getBusinessMetrics,
  getBusinessProducts,
  getBusinessRecentRedemptions,
  setBusinessProductActive,
} from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/database.types";

type Product = Database["public"]["Tables"]["loyalty_products"]["Row"];
type Access = Awaited<ReturnType<typeof getBusinessAccess>>;
type Redemption = Awaited<ReturnType<typeof getBusinessRecentRedemptions>>[number];

function BusinessDashboardContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [access, setAccess] = useState<Access>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [metrics, setMetrics] = useState({ passes: 0, redemptions: 0 });
  const [recent, setRecent] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"uses" | "balance">("uses");
  const [units, setUnits] = useState("10");
  const [validityDays, setValidityDays] = useState("90");

  const load = async () => {
    if (!user) return;
    const currentAccess = await getBusinessAccess(businessId, user.id);
    if (!currentAccess) {
      setAccess(null);
      setLoading(false);
      return;
    }

    const [currentProducts, currentMetrics, currentRecent] = await Promise.all([
      getBusinessProducts(businessId),
      getBusinessMetrics(businessId),
      getBusinessRecentRedemptions(businessId),
    ]);
    setAccess(currentAccess);
    setProducts(currentProducts);
    setMetrics(currentMetrics);
    setRecent(currentRecent);
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    if (!user) return;
    getBusinessAccess(businessId, user.id)
      .then(async (currentAccess) => {
        if (!active) return;
        if (!currentAccess) {
          setAccess(null);
          return;
        }
        const [currentProducts, currentMetrics, currentRecent] = await Promise.all([
          getBusinessProducts(businessId),
          getBusinessMetrics(businessId),
          getBusinessRecentRedemptions(businessId),
        ]);
        if (!active) return;
        setAccess(currentAccess);
        setProducts(currentProducts);
        setMetrics(currentMetrics);
        setRecent(currentRecent);
      })
      .catch((cause) => {
        if (active) setError(friendlyError(cause, "No hemos podido cargar este negocio."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [businessId, user]);

  const canManage = access?.role === "owner" || access?.role === "manager";
  const activeProducts = products.filter((product) => product.active).length;

  const onCreateProduct = async (event: FormEvent) => {
    event.preventDefault();
    const parsedUnits = Number(units);
    const parsedDays = validityDays.trim() ? Number(validityDays) : null;
    if (!productName.trim() || !Number.isFinite(parsedUnits) || parsedUnits <= 0) {
      setError("Revisa el nombre y el saldo/usos iniciales del bono.");
      return;
    }
    if (type === "uses" && !Number.isInteger(parsedUnits)) {
      setError("Los bonos por usos necesitan un número entero de usos.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      await createBusinessProduct({
        businessId,
        name: productName,
        description,
        type,
        initialUnits: parsedUnits,
        validityDays: parsedDays && parsedDays > 0 ? Math.round(parsedDays) : null,
      });
      setProductName("");
      setDescription("");
      await load();
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo crear el bono."));
    } finally {
      setCreating(false);
    }
  };

  const toggleProduct = async (product: Product) => {
    setTogglingId(product.id);
    setError(null);
    try {
      const updated = await setBusinessProductActive(product.id, !product.active);
      setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo cambiar el estado del bono."));
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) return <main className="bonoa-shell"><div className="h-80 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;

  if (!access) {
    return (
      <main className="bonoa-shell">
        <Link href="/business" className="text-xs font-bold text-orange-300">← Volver</Link>
        <div className="mt-8 rounded-[2rem] border border-red-400/15 bg-red-400/5 p-8 text-center text-sm text-red-200">No tienes acceso a este espacio.</div>
      </main>
    );
  }

  return (
    <main className="bonoa-shell min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/business" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver"><MdArrowBack size={20} /></Link>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{access.role}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white">{access.business.name}</h1>
          </div>
        </div>
        <Link href={`/business/${businessId}/scan`} className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white shadow-[0_16px_40px_rgba(255,68,31,.15)]">
          <MdQrCodeScanner size={19} /> Escanear cliente
        </Link>
      </header>

      {error ? <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="bonoa-card rounded-[1.5rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Bonos emitidos</p><p className="mt-3 text-3xl font-black text-white">{metrics.passes}</p></div>
        <div className="bonoa-card rounded-[1.5rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Consumos</p><p className="mt-3 text-3xl font-black text-white">{metrics.redemptions}</p></div>
        <div className="bonoa-card rounded-[1.5rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Productos activos</p><p className="mt-3 text-3xl font-black text-white">{activeProducts}<span className="ml-1 text-sm text-zinc-600">/{products.length}</span></p></div>
        <div className="bonoa-card rounded-[1.5rem] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">Estado</p><p className="mt-3 text-sm font-black uppercase tracking-[0.16em] text-emerald-300">{access.business.status}</p></div>
      </section>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Catálogo</p><h2 className="mt-1 text-xl font-black text-white">Tipos de bono</h2></div>
          </div>
          <div className="space-y-3">
            {products.map((product) => (
              <article key={product.id} className={`bonoa-card flex items-center gap-4 rounded-[1.4rem] p-4 sm:p-5 ${product.active ? "" : "opacity-60"}`}>
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdStyle size={21} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-white">{product.name}</p>
                    <span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] ${product.active ? "border-emerald-400/15 bg-emerald-400/5 text-emerald-300" : "border-white/10 text-zinc-500"}`}>{product.active ? "activo" : "inactivo"}</span>
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">{product.type === "uses" ? "usos" : "saldo"}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{product.initial_units} {product.type === "uses" ? "usos" : "€"} · {product.validity_days ? `${product.validity_days} días` : "sin caducidad"}</p>
                </div>
                {canManage ? <button type="button" disabled={togglingId !== null} onClick={() => void toggleProduct(product)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-bold ${product.active ? "border-white/10 text-zinc-400" : "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"} disabled:opacity-40`}>{product.active ? <MdToggleOn size={19} /> : <MdToggleOff size={19} />}{togglingId === product.id ? "Guardando…" : product.active ? "Desactivar" : "Activar"}</button> : null}
              </article>
            ))}
            {!products.length ? <div className="rounded-[1.4rem] border border-dashed border-white/10 p-8 text-center text-sm text-zinc-600">Crea tu primer tipo de bono.</div> : null}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center gap-2"><MdHistory className="text-orange-300" size={19} /><h2 className="text-xl font-black text-white">Últimos consumos</h2></div>
          <div className="bonoa-card rounded-[1.6rem] p-4">
            {recent.length ? <div className="divide-y divide-white/8">{recent.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div><p className="text-xs font-bold text-white">Consumo de bono</p><p className="mt-1 text-[10px] text-zinc-600">{new Date(item.created_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</p></div>
                <span className="text-sm font-black text-white">-{item.units}</span>
              </div>
            ))}</div> : <p className="py-6 text-center text-xs text-zinc-600">Aún no hay consumos.</p>}
          </div>
        </div>
      </section>

      {canManage ? (
        <section className="bonoa-card mt-8 rounded-[2rem] p-6 sm:p-8">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdAdd size={23} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-300">Configuración</p><h2 className="mt-1 text-xl font-black text-white">Crear tipo de bono</h2></div></div>
          <form onSubmit={onCreateProduct} className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-bold text-zinc-400">Nombre<input value={productName} onChange={(event) => setProductName(event.target.value)} required placeholder="Lavado x10" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
            <label className="text-xs font-bold text-zinc-400">Tipo<select value={type} onChange={(event) => setType(event.target.value as "uses" | "balance")} className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40"><option value="uses">Usos</option><option value="balance">Saldo</option></select></label>
            <label className="text-xs font-bold text-zinc-400">{type === "uses" ? "Número de usos" : "Saldo inicial (€)"}<input type="number" min={type === "uses" ? "1" : "0.01"} step={type === "uses" ? "1" : "0.01"} value={units} onChange={(event) => setUnits(event.target.value)} required className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
            <label className="text-xs font-bold text-zinc-400">Validez (días)<input type="number" min="1" value={validityDays} onChange={(event) => setValidityDays(event.target.value)} placeholder="Vacío = sin caducidad" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
            <label className="text-xs font-bold text-zinc-400 md:col-span-2 xl:col-span-3">Descripción<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Qué incluye este bono" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
            <div className="flex items-end"><button disabled={creating} className="brand-gradient w-full rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-40">{creating ? "Creando…" : "Crear bono"}</button></div>
          </form>
        </section>
      ) : null}

      <footer className="mt-8 flex items-center gap-2 text-[11px] text-zinc-600"><MdStorefront size={15} /> Panel de negocio · Los consumos se registran de forma inmutable.</footer>
    </main>
  );
}

export default function BusinessDashboardPage() {
  return <AuthGuard><BusinessDashboardContent /></AuthGuard>;
}
