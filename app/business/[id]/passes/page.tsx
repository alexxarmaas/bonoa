"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowBack, MdFilterList, MdQrCodeScanner, MdSearch, MdStyle } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess, getBusinessProducts } from "@/lib/business-data";
import { getBusinessManagedPasses, type BusinessManagedPass } from "@/lib/business-analytics";
import { friendlyError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/database.types";

type PassStatus = Database["public"]["Enums"]["pass_status"];
type Product = Database["public"]["Tables"]["loyalty_products"]["Row"];

const statuses: Array<{ value: "" | PassStatus; label: string }> = [
  { value: "", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "exhausted", label: "Agotados" },
  { value: "expired", label: "Caducados" },
  { value: "cancelled", label: "Cancelados" },
];

const statusClass: Record<PassStatus, string> = {
  active: "border-emerald-400/15 bg-emerald-400/5 text-emerald-300",
  exhausted: "border-zinc-400/15 bg-zinc-400/5 text-zinc-400",
  expired: "border-amber-400/15 bg-amber-400/5 text-amber-300",
  cancelled: "border-red-400/15 bg-red-400/5 text-red-300",
};

function PassesContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [passes, setPasses] = useState<BusinessManagedPass[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | PassStatus>("");
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (filters?: { query?: string; status?: "" | PassStatus; productId?: string }) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const access = await getBusinessAccess(businessId, user.id);
      if (!access) throw new Error("No tienes acceso a este negocio.");
      const [currentProducts, currentPasses] = await Promise.all([
        getBusinessProducts(businessId),
        getBusinessManagedPasses({
          businessId,
          query: filters?.query ?? query,
          status: (filters?.status ?? status) || null,
          productId: (filters?.productId ?? productId) || null,
          limit: 100,
        }),
      ]);
      setBusinessName(access.business.name);
      setProducts(currentProducts);
      setPasses(currentPasses);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido cargar los bonos."));
    } finally {
      setLoading(false);
    }
  }, [businessId, productId, query, status, user]);

  useEffect(() => {
    void load({ query: "", status: "", productId: "" });
  }, [load]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void load();
  };

  const reset = () => {
    setQuery("");
    setStatus("");
    setProductId("");
    void load({ query: "", status: "", productId: "" });
  };

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{businessName || "Bonoa Business"}</p><h1 className="mt-1 text-2xl font-black text-white">Bonos emitidos</h1></div>
        </div>
        <Link href={`/business/${businessId}/scan`} className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white"><MdQrCodeScanner size={18} /> Escanear cliente</Link>
      </header>

      <form onSubmit={submit} className="bonoa-card mt-7 grid gap-3 rounded-[1.6rem] p-4 md:grid-cols-[1fr_180px_220px_auto]">
        <label className="relative"><MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ID de bono o nombre de producto" className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none focus:border-orange-400/40" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value as "" | PassStatus)} className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"><option value="">Todos los estados</option>{statuses.slice(1).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        <select value={productId} onChange={(event) => setProductId(event.target.value)} className="rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"><option value="">Todos los productos</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select>
        <div className="flex gap-2"><button className="brand-gradient inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-black text-white"><MdFilterList size={18} /> Filtrar</button><button type="button" onClick={reset} className="rounded-2xl border border-white/10 px-4 py-3 text-xs font-bold text-zinc-400">Limpiar</button></div>
      </form>

      {error ? <p className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</p> : null}

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">{loading ? "Cargando…" : `${passes.length} resultado${passes.length === 1 ? "" : "s"}`}</p><p className="text-[10px] text-zinc-600">Sin datos personales del cliente</p></div>
        {loading ? <div className="h-56 animate-pulse rounded-[1.6rem] border border-white/8 bg-white/[0.03]" /> : passes.map((pass) => {
          const pct = pass.initial_units > 0 ? Math.max(0, Math.min(100, (pass.remaining_units / pass.initial_units) * 100)) : 0;
          return (
            <article key={pass.pass_id} className="bonoa-card rounded-[1.5rem] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdStyle size={21} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-bold text-white">{pass.product_name}</p><span className={`rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${statusClass[pass.pass_status]}`}>{pass.pass_status}</span></div><p className="mt-1 break-all text-[10px] text-zinc-600">{pass.pass_id}</p></div></div>
                <div className="text-right"><p className="text-xl font-black text-white">{pass.remaining_units}<span className="ml-1 text-xs text-zinc-600">/ {pass.initial_units}{pass.product_type === "balance" ? " €" : ""}</span></p><p className="mt-1 text-[10px] text-zinc-600">Emitido {new Date(pass.purchased_at).toLocaleDateString("es-ES")}</p></div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400" style={{ width: `${pct}%` }} /></div>
              <div className="mt-3 flex flex-wrap justify-between gap-3 text-[10px] text-zinc-600"><span>Actualizado {new Date(pass.updated_at).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span><span>{pass.expires_at ? `Caduca ${new Date(pass.expires_at).toLocaleDateString("es-ES")}` : "Sin caducidad"}</span></div>
            </article>
          );
        })}
        {!loading && !passes.length ? <div className="rounded-[1.5rem] border border-dashed border-white/10 p-10 text-center text-sm text-zinc-600">No hay bonos que coincidan con estos filtros.</div> : null}
      </section>
    </main>
  );
}

export default function BusinessPassesPage() {
  return <AuthGuard><PassesContent /></AuthGuard>;
}
