"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdAdd, MdArrowBack, MdCheckCircle, MdLocalOffer, MdRedeem, MdSave, MdStyle, MdVisibility, MdVisibilityOff } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import { createPilotProduct, formatMoney, getPilotProducts, updatePilotProduct, type PilotProduct } from "@/lib/pilot-data";

type EditState = Record<string, { price: string; validity: string }>;

type Preset = {
  label: string;
  type: "uses" | "balance";
  units: string;
  days: string;
  price?: string;
  name?: string;
  publiclyListed?: boolean;
};

const presets: Preset[] = [
  { label: "5 usos", type: "uses", units: "5", days: "90" },
  { label: "10 usos", type: "uses", units: "10", days: "180" },
  { label: "50 € saldo", type: "balance", units: "50", days: "180" },
  { label: "🎁 Regalo 1 uso", type: "uses", units: "1", days: "30", price: "0", name: "Regalo", publiclyListed: false },
];

const MAX_UNITS = 1_000_000;
const MAX_VALIDITY_DAYS = 3650;
const MAX_PRICE_EUR = 1_000_000;

function parseOptionalPrice(value: string) {
  if (!value.trim()) return null;
  const euros = Number(value.replace(",", "."));
  if (!Number.isFinite(euros) || euros < 0 || euros > MAX_PRICE_EUR) throw new Error(`El precio debe estar entre 0 y ${MAX_PRICE_EUR.toLocaleString("es-ES")} €.`);
  const cents = euros * 100;
  if (!Number.isInteger(cents)) throw new Error("El precio puede tener como máximo dos decimales.");
  return cents;
}

function parseOptionalValidity(value: string) {
  if (!value.trim()) return null;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > MAX_VALIDITY_DAYS) throw new Error(`La validez debe ser un número entero entre 1 y ${MAX_VALIDITY_DAYS} días.`);
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
  const [publiclyListed, setPubliclyListed] = useState(true);

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
  const publicCount = useMemo(() => products.filter((product) => product.active && product.publicly_listed).length, [products]);
  const rewardOnlyCount = useMemo(() => products.filter((product) => product.active && !product.publicly_listed).length, [products]);

  const applyPreset = (preset: Preset) => {
    setType(preset.type);
    setUnits(preset.units);
    setValidity(preset.days);
    if (preset.price !== undefined) setPrice(preset.price);
    if (preset.publiclyListed !== undefined) setPubliclyListed(preset.publiclyListed);
    if (preset.name) setName(preset.name);
    else if (!name.trim()) setName(preset.type === "uses" ? `Bono ${preset.units} usos` : `Bono ${preset.units} €`);
  };

  const createProduct = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const initialUnits = Number(units);
      if (name.trim().length < 2 || name.trim().length > 120) throw new Error("El nombre debe tener entre 2 y 120 caracteres.");
      if (description.trim().length > 500) throw new Error("La descripción no puede superar 500 caracteres.");
      if (!Number.isFinite(initialUnits) || initialUnits <= 0 || initialUnits > MAX_UNITS) throw new Error("La cantidad inicial no es válida.");
      if (type === "uses" && !Number.isInteger(initialUnits)) throw new Error("Los productos por usos solo admiten unidades completas.");
      if (type === "balance" && !Number.isInteger(initialUnits * 100)) throw new Error("El saldo inicial puede tener como máximo dos decimales.");

      setCreating(true);
      await createPilotProduct({
        businessId,
        name,
        description,
        type,
        initialUnits,
        validityDays: parseOptionalValidity(validity),
        salePriceCents: parseOptionalPrice(price),
        publiclyListed,
      });
      setName("");
      setDescription("");
      setPrice("");
      setPubliclyListed(true);
      await loadProducts();
      setSuccess(publiclyListed ? "Producto creado y publicado en el escaparate." : "Recompensa creada. Está activa pero oculta del escaparate público.");
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido crear el producto."));
    } finally { setCreating(false); }
  };

  const saveProduct = async (product: PilotProduct) => {
    const edit = edits[product.id];
    if (!edit || busyId !== null) return;
    setError(null);
    setSuccess(null);
    try {
      setBusyId(product.id);
      const updated = await updatePilotProduct(product.id, {
        sale_price_cents: parseOptionalPrice(edit.price),
        validity_days: parseOptionalValidity(edit.validity),
      });
      setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess(`“${product.name}” actualizado.`);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido actualizar el producto."));
    } finally { setBusyId(null); }
  };

  const toggleProduct = async (product: PilotProduct) => {
    if (busyId !== null) return;
    setBusyId(product.id);
    setError(null);
    try {
      const updated = await updatePilotProduct(product.id, { active: !product.active });
      setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess(`“${product.name}” ${updated.active ? "activado" : "desactivado"}.`);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido cambiar el estado."));
    } finally { setBusyId(null); }
  };

  const toggleVisibility = async (product: PilotProduct) => {
    if (busyId !== null) return;
    setBusyId(product.id);
    setError(null);
    try {
      const updated = await updatePilotProduct(product.id, { publicly_listed: !product.publicly_listed });
      setProducts((current) => current.map((item) => item.id === updated.id ? updated : item));
      setSuccess(updated.publicly_listed ? `“${product.name}” ya aparece en el escaparate.` : `“${product.name}” queda solo para asignación/recompensas.`);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido cambiar la visibilidad."));
    } finally { setBusyId(null); }
  };

  if (loading) return <main className="bonoa-shell"><div className="h-96 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;
  if (allowed === false) return <main className="bonoa-shell"><Link href={`/business/${businessId}`} className="text-xs font-bold text-orange-300">← Volver</Link><div className="mt-8 rounded-[2rem] border border-amber-400/15 bg-amber-400/5 p-8 text-center text-sm text-amber-100">Solo propietarios y managers pueden modificar el catálogo.</div></main>;

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">{businessName}</p><h1 className="mt-1 text-2xl font-black text-white">Catálogo y recompensas</h1></div></div>
        <div className="flex flex-wrap gap-2 text-[10px] font-black"><span className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1.5 text-emerald-300">{activeCount} activos</span><span className="rounded-full border border-sky-400/15 bg-sky-400/5 px-3 py-1.5 text-sky-300">{publicCount} públicos</span><span className="rounded-full border border-amber-300/15 bg-amber-300/5 px-3 py-1.5 text-amber-200">{rewardOnlyCount} solo recompensa</span></div>
      </header>

      {error ? <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}
      {success ? <div className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-emerald-200"><MdCheckCircle size={17} /> {success}</div> : null}

      <section className="bonoa-card mt-7 rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Nuevo producto / regalo</p><h2 className="mt-1 text-xl font-black text-white">Crea lo que vendes o lo que premias</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">Un regalo puede estar activo para las automatizaciones sin aparecer en el escaparate. Así “Café gratis” no se confunde con algo a la venta.</p></div><MdLocalOffer size={26} className="shrink-0 text-orange-300" /></div>
        <div className="mt-5 flex flex-wrap gap-2">{presets.map((preset) => <button key={preset.label} type="button" onClick={() => applyPreset(preset)} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold text-zinc-400 hover:border-orange-400/20 hover:text-orange-200">{preset.label}</button>)}</div>

        <form onSubmit={createProduct} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-bold text-zinc-400 xl:col-span-2">Nombre<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Lavado gratis" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
          <label className="text-xs font-bold text-zinc-400">Tipo<select value={type} onChange={(event) => setType(event.target.value as "uses" | "balance")} className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"><option value="uses">Usos</option><option value="balance">Saldo</option></select></label>
          <label className="text-xs font-bold text-zinc-400">{type === "uses" ? "Usos" : "Saldo inicial (€)"}<input required type="number" min={type === "uses" ? "1" : "0.01"} max={MAX_UNITS} step={type === "uses" ? "1" : "0.01"} value={units} onChange={(event) => setUnits(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label>
          <label className="text-xs font-bold text-zinc-400">Precio de venta (€)<input type="number" min="0" max={MAX_PRICE_EUR} step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0.00" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label>
          <label className="text-xs font-bold text-zinc-400">Validez (días)<input type="number" min="1" max={MAX_VALIDITY_DAYS} step="1" value={validity} onChange={(event) => setValidity(event.target.value)} placeholder="Vacío = sin caducidad" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label>
          <label className="text-xs font-bold text-zinc-400 md:col-span-2">Descripción<input maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Premio por fidelidad" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-xs font-bold text-zinc-400 md:col-span-2 xl:col-span-3"><input type="checkbox" checked={publiclyListed} onChange={(event) => setPubliclyListed(event.target.checked)} className="h-4 w-4" /><span><span className="block text-zinc-300">Mostrar en escaparate público</span><span className="mt-1 block text-[10px] font-normal text-zinc-600">Desmárcalo si es un regalo interno que solo debe aparecer cuando el cliente lo gane.</span></span></label>
          <div className="flex items-end"><button disabled={creating || busyId !== null} className="brand-gradient inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-40"><MdAdd size={19} /> {creating ? "Creando…" : publiclyListed ? "Crear producto" : "Crear recompensa"}</button></div>
        </form>
      </section>

      <section className="mt-8">
        <div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Productos</p><h2 className="mt-1 text-xl font-black text-white">Lo que vendes y lo que regalas</h2></div>
        <div className="space-y-3">
          {products.map((product) => {
            const edit = edits[product.id] ?? { price: "", validity: "" };
            return <article key={product.id} className={`bonoa-card rounded-[1.6rem] p-5 ${product.active ? "" : "opacity-60"}`}>
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ${product.publicly_listed ? "border-orange-400/15 bg-orange-400/[0.07] text-orange-300" : "border-amber-300/15 bg-amber-300/[0.06] text-amber-200"}`}>{product.publicly_listed ? <MdStyle size={21} /> : <MdRedeem size={21} />}</div>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-white">{product.name}</h3><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${product.active ? "border-emerald-400/15 bg-emerald-400/5 text-emerald-300" : "border-white/10 text-zinc-500"}`}>{product.active ? "activo" : "inactivo"}</span><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] ${product.publicly_listed ? "border-sky-400/15 bg-sky-400/5 text-sky-300" : "border-amber-300/15 bg-amber-300/5 text-amber-200"}`}>{product.publicly_listed ? "público" : "solo recompensa"}</span></div><p className="mt-1 text-xs text-zinc-500">{product.initial_units} {product.type === "uses" ? "usos" : "€"} · {formatMoney(product.sale_price_cents, product.currency)} · {product.validity_days ? `${product.validity_days} días` : "sin caducidad"}</p>{product.description ? <p className="mt-1 max-w-2xl truncate text-[10px] text-zinc-600">{product.description}</p> : null}</div>
                </div>

                <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:w-[25rem]">
                  <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">Precio €<input value={edit.price} onChange={(event) => setEdits((current) => ({ ...current, [product.id]: { ...edit, price: event.target.value } }))} type="number" min="0" max={MAX_PRICE_EUR} step="0.01" className="mt-1.5 w-full rounded-xl border border-white/8 bg-black/30 px-3 py-2.5 text-xs text-white outline-none" /></label>
                  <label className="text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">Validez días<input value={edit.validity} onChange={(event) => setEdits((current) => ({ ...current, [product.id]: { ...edit, validity: event.target.value } }))} type="number" min="1" max={MAX_VALIDITY_DAYS} step="1" className="mt-1.5 w-full rounded-xl border border-white/8 bg-black/30 px-3 py-2.5 text-xs text-white outline-none" /></label>
                </div>

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  <button type="button" onClick={() => void saveProduct(product)} disabled={busyId !== null} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold text-zinc-300 disabled:opacity-40"><MdSave size={15} /> Guardar</button>
                  <button type="button" onClick={() => void toggleVisibility(product)} disabled={busyId !== null} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold text-zinc-400 disabled:opacity-40">{product.publicly_listed ? <MdVisibilityOff size={15} /> : <MdVisibility size={15} />}{product.publicly_listed ? "Ocultar" : "Publicar"}</button>
                  <button type="button" onClick={() => void toggleProduct(product)} disabled={busyId !== null} className={`rounded-full border px-3 py-2 text-[10px] font-bold disabled:opacity-40 ${product.active ? "border-red-400/10 text-red-300/70" : "border-emerald-400/15 bg-emerald-400/5 text-emerald-300"}`}>{product.active ? "Desactivar" : "Activar"}</button>
                </div>
              </div>
            </article>;
          })}
          {!products.length ? <div className="rounded-[1.6rem] border border-dashed border-white/10 p-10 text-center text-sm text-zinc-600">Crea tu primer producto o recompensa arriba.</div> : null}
        </div>
      </section>
    </main>
  );
}

export default function BusinessCatalogPage() {
  return <AuthGuard><CatalogContent /></AuthGuard>;
}
