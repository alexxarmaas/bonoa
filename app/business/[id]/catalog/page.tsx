"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdAdd, MdArrowBack, MdCheckCircle, MdEdit, MdLocalOffer, MdSave, MdStyle } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import { createPilotProduct, formatMoney, getPilotProducts, updatePilotProduct, type PilotProduct } from "@/lib/pilot-data";

type EditState = Record<string, { price: string; validity: string }>;

const presets = [
  { label: "5 usos", type: "uses" as const, units: "5", days: "90" },
  { label: "10 usos", type: "uses" as const, units: "10", days: "180" },
  { label: "50 € saldo", type: "balance" as const, units: "50", days: "180" },
];

const MAX_UNITS = 1_000_000;
const MAX_VALIDITY_DAYS = 3650;
const MAX_PRICE_EUR = 1_000_000;

function parseOptionalPrice(value: string) {
  if (!value.trim()) return null;
  const euros = Number(value.replace(",", "."));
  if (!Number.isFinite(euros) || euros < 0 || euros > MAX_PRICE_EUR) {
    throw new Error(`El precio debe estar entre 0 y ${MAX_PRICE_EUR.toLocaleString("es-ES")} €.`);
  }
  const cents = euros * 100;
  if (!Number.isInteger(cents)) throw new Error("El precio puede tener como máximo dos decimales.");
  return cents;
}

function parseOptionalValidity(value: string) {
  if (!value.trim()) return null;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > MAX_VALIDITY_DAYS) {
    throw new Error(`La validez debe ser un número entero entre 1 y ${MAX_VALIDITY_DAYS} días.`);
  }
  return days;
}

function CatalogContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [businessName, setBusinessName] = useState("");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [products, setProducts] = useState<PilotProduct[]>([]);
  const [edits, setEdits] = useState<EditState>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"uses" | "balance">("uses");
  const [units, setUnits] = useState("5");
  const [validity, setValidity] = useState("90");
  const [price, setPrice] = useState("");

  const hydrateEdits = (items: PilotProduct[]) => {
    setEdits(Object.fromEntries(items.map((product) => [product.id, {
      price: product.sale_price_cents === null ? "" : (product.sale_price_cents / 100).toFixed(2),
      validity: product.validity_days?.toString() ?? "",
    }])));
  };

  const loadProducts = async () => {
    const items = await getPilotProducts(businessId);
    setProducts(items);
    hydrateEdits(items);
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([getBusinessAccess(businessId, user.id), getPilotProducts(businessId)])
      .then(([access, items]) => {
        if (!active) return;
        setBusinessName(access?.business.name ?? "Bonoa Business");
        setAllowed(access?.role === "owner" || access?.role === "manager");
        setProducts(items);
        hydrateEdits(items);
      })
      .catch((cause) => { if (active) setError(friendlyError(cause, "No hemos podido cargar el catálogo.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId, user]);

  const activeCount = useMemo(() => products.filter((product) => product.active).length, [products]);

  const applyPreset = (preset: typeof presets[number]) => {
    setType(preset.type);
    setUnits(preset.units);
    setValidity(preset.days);
    if (!name.trim()) setName(preset.type === "uses" ? `Bono ${preset.units} usos` : `Bono ${preset.units} €`);
  };

  const createProduct = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      const initialUnits = Number(units);
      if (name.trim().length < 2 || name.trim().length > 120) throw new Error("El nombre del bono debe tener entre 2 y 120 caracteres.");
      if (description.trim().length > 500) throw new Error("La descripción del bono no puede superar 500 caracteres.");
      if (!Number.isFinite(initialUnits) || initialUnits <= 0 || initialUnits > MAX_UNITS) throw new Error("La cantidad inicial del bono no es válida.");
      if (type === "uses" && !Number.isInteger(initialUnits)) throw new Error("Los bonos por usos solo admiten unidades completas.");
      if (type === "balance" && !Number.isInteger(initialUnits * 100)) throw new Error("El saldo inicial puede tener como máximo dos decimales.");

      const validityDays = parseOptionalValidity(validity);
      const salePrice = parseOptionalPrice(price);

      setCreating(true);
      await createPilotProduct({ businessId, name, description, type, initialUnits, validityDays, salePriceCents: salePrice });
      setName("");
      setDescription("");
      setPrice("");
      await loadProducts();
      setSuccess("Tipo de bono creado y activado.");
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido crear el bono."));
    } finally {
      setCreating(false);
    }
  };

  const saveProduct = async (product: PilotProduct) => {
    const edit = edits[product.id];
    if (!edit || busyId !== null) return;
    setError(null);
    setSuccess(null);

    try {
      const salePrice = parseOptionalPrice(edit.price);
      const validityDays = parseOptionalValidity(edit.validity);
      setBusyId(product.id);
      const updated = await updatePilotProduct(product.id, {
        sale_price_cents: salePrice,
        validity_days: validityDays,
      });
      setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setEdits((current) => ({ ...current, [product.id]: {
        price: updated.sale_price_cents === null ? "" : (updated.sale_price_cents / 100).toFixed(2),
        validity: updated.validity_days?.toString() ?? "",
      } }));
      setSuccess(`“${product.name}” actualizado.`);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido actualizar el bono."));
    } finally {
      setBusyId(null);
    }
  };

  const toggleProduct = async (product: PilotProduct) => {
    if (busyId !== null) return;
    setBusyId(product.id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updatePilotProduct(product.id, { active: !product.active });
      setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess(`“${product.name}” ${updated.active ? "activado" : "desactivado"}.`);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido cambiar el estado."));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <main className="bonoa-shell"><div className="h-96 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;
  if (allowed === false) return <main className="bonoa-shell"><Link href={`/business/${businessId}`} className="text-xs font-bold text-orange-300">← Volver</Link><div className="mt-8 rounded-[2rem] border border-amber-400/15 bg-amber-400/5 p-8 text-center text-sm text-amber-100">Solo propietarios y managers pueden modificar el catálogo.</div></main>;

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">{businessName}</p><h1 className="mt-1 text-2xl font-black text-white">Catálogo</h1></div></div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black text-zinc-400">{activeCount} activos · {products.length} total</span>
      </header>

      {error ? <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}
      {success ? <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-emerald-200"><MdCheckCircle size={17} /> {success}</div> : null}

      <section className="bonoa-card mt-7 rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Nuevo bono</p><h2 className="mt-1 text-xl font-black text-white">Configúralo en menos de un minuto</h2><p className="mt-2 text-xs leading-5 text-zinc-500">El precio es informativo durante el piloto; Bonoa registra la fidelización pero no cobra todavía.</p></div><MdLocalOffer size={26} className="shrink-0 text-orange-300" /></div>
        <div className="mt-5 flex flex-wrap gap-2">{presets.map((preset) => <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold text-zinc-400 hover:border-orange-400/20 hover:text-orange-200">{preset.label}</button>)}</div>

        <form onSubmit={createProduct} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-bold text-zinc-400 xl:col-span-2">Nombre<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Bono 5 lavados" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
          <label className="text-xs font-bold text-zinc-400">Tipo<select value={type} onChange={(event) => setType(event.target.value as "uses" | "balance")} className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40"><option value="uses">Usos</option><option value="balance">Saldo</option></select></label>
          <label className="text-xs font-bold text-zinc-400">{type === "uses" ? "Usos" : "Saldo inicial (€)"}<input required type="number" min={type === "uses" ? "1" : "0.01"} max={MAX_UNITS} step={type === "uses" ? "1" : "0.01"} value={units} onChange={(event) => setUnits(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
          <label className="text-xs font-bold text-zinc-400">Precio de venta (€)<input type="number" min="0" max={MAX_PRICE_EUR} step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="35.00" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
          <label className="text-xs font-bold text-zinc-400">Validez (días)<input type="number" min="1" max={MAX_VALIDITY_DAYS} step="1" value={validity} onChange={(event) => setValidity(event.target.value)} placeholder="Vacío = sin caducidad" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
          <label className="text-xs font-bold text-zinc-400 md:col-span-2">Descripción<input maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Incluye 5 lavados exteriores" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
          <div className="flex items-end"><button disabled={creating || busyId !== null} className="brand-gradient inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-40"><MdAdd size={19} /> {creating ? "Creando…" : "Crear bono"}</button></div>
        </form>
      </section>

      <section className="mt-8">
        <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Productos</p><h2 className="mt-1 text-xl font-black text-white">Bonos disponibles</h2></div>
        <div className="space-y-3">
          {products.map((product) => {
            const edit = edits[product.id] ?? { price: "", validity: "" };
            return (
              <article key={product.id} className={`bonoa-card rounded-[1.6rem] p-5 ${product.active ? "" : "opacity-60"}`}>
                <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdStyle size={21} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-white">{product.name}</h3><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${product.active ? "border-emerald-400/15 bg-emerald-400/5 text-emerald-300" : "border-white/10 text-zinc-500"}`}>{product.active ? "activo" : "inactivo"}</span></div><p className="mt-1 text-xs text-zinc-500">{product.initial_units} {product.type === "uses" ? "usos" : "€ de saldo"} · {formatMoney(product.sale_price_cents, product.currency)}</p>{product.description ? <p className="mt-1 text-[11px] text-zinc-600">{product.description}</p> : null}</div></div>
                  <div className="grid gap-3 sm:grid-cols-[9rem_8rem_auto_auto] sm:items-end">
                    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">Precio €<input type="number" min="0" max={MAX_PRICE_EUR} step="0.01" value={edit.price} onChange={(event) => setEdits((current) => ({ ...current, [product.id]: { ...edit, price: event.target.value } }))} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none" /></label>
                    <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">Validez<input type="number" min="1" max={MAX_VALIDITY_DAYS} step="1" value={edit.validity} onChange={(event) => setEdits((current) => ({ ...current, [product.id]: { ...edit, validity: event.target.value } }))} placeholder="∞" className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none" /></label>
                    <button type="button" disabled={busyId !== null} onClick={() => void saveProduct(product)} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black text-zinc-300 disabled:opacity-40"><MdSave size={16} /> {busyId === product.id ? "Guardando…" : "Guardar"}</button>
                    <button type="button" disabled={busyId !== null} onClick={() => void toggleProduct(product)} className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-4 py-2.5 text-[10px] font-black disabled:opacity-40 ${product.active ? "border-red-400/15 bg-red-400/5 text-red-200" : "border-emerald-400/15 bg-emerald-400/5 text-emerald-200"}`}><MdEdit size={15} /> {product.active ? "Desactivar" : "Activar"}</button>
                  </div>
                </div>
              </article>
            );
          })}
          {!products.length ? <div className="rounded-[1.6rem] border border-dashed border-white/10 p-10 text-center text-sm text-zinc-600">Aún no tienes bonos. Usa uno de los presets para crear el primero.</div> : null}
        </div>
      </section>
    </main>
  );
}

export default function BusinessCatalogPage() {
  return <AuthGuard><CatalogContent /></AuthGuard>;
}
