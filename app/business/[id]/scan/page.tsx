"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdAddCard, MdArrowBack, MdCancel, MdCheckCircle, MdClose, MdDoneAll, MdPointOfSale, MdQrCode2, MdRemoveCircleOutline, MdStorefront } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import QrScanner from "@/components/business/QrScanner";
import {
  getBusinessAccess,
  issuePass,
  lookupWalletPasses,
  parseBonoaQr,
  redeemPass,
  type BonoaQrIdentity,
  type ScannedWalletPass,
} from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import { cancelPass } from "@/lib/pass-ops";
import { formatMoney, getPilotProducts, type PilotProduct } from "@/lib/pilot-data";

type Access = Awaited<ReturnType<typeof getBusinessAccess>>;

const statusLabel: Record<ScannedWalletPass["pass_status"], string> = {
  active: "activo",
  exhausted: "agotado",
  expired: "caducado",
  cancelled: "cancelado",
};

function ScanContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [access, setAccess] = useState<Access>(null);
  const [products, setProducts] = useState<PilotProduct[]>([]);
  const [qr, setQr] = useState<BonoaQrIdentity | null>(null);
  const [rawCode, setRawCode] = useState("");
  const [passes, setPasses] = useState<ScannedWalletPass[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [loading, setLoading] = useState(true);
  const [lookingUp, setLookingUp] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [redeemValues, setRedeemValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([getBusinessAccess(businessId, user.id), getPilotProducts(businessId)])
      .then(([currentAccess, currentProducts]) => {
        if (!active) return;
        const availableProducts = currentProducts.filter((product) => product.active);
        setAccess(currentAccess);
        setProducts(availableProducts);
        setSelectedProduct(availableProducts[0]?.id ?? "");
      })
      .catch((cause) => {
        if (active) setError(friendlyError(cause, "No hemos podido preparar el escáner."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [businessId, user]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 4200);
    return () => window.clearTimeout(timer);
  }, [success]);

  const loadWallet = useCallback(async (identity: BonoaQrIdentity) => {
    setLookingUp(true);
    setError(null);
    setSuccess(null);
    try {
      const currentPasses = await lookupWalletPasses(businessId, identity);
      setQr(identity);
      setPasses(currentPasses);
      setRedeemValues(Object.fromEntries(currentPasses.map((pass) => [pass.pass_id, pass.product_type === "uses" ? "1" : "1.00"])));
    } catch (cause) {
      setQr(null);
      setPasses([]);
      setError(friendlyError(cause, "QR inválido o no accesible."));
    } finally {
      setLookingUp(false);
    }
  }, [businessId]);

  const acceptCode = useCallback((value: string) => {
    setRawCode(value);
    const identity = parseBonoaQr(value);
    if (!identity) {
      setError("Este código no es un QR válido de Bonoa.");
      return;
    }
    void loadWallet(identity);
  }, [loadWallet]);

  const submitManual = (event: FormEvent) => {
    event.preventDefault();
    acceptCode(rawCode);
  };

  const resetWallet = () => {
    setQr(null);
    setRawCode("");
    setPasses([]);
    setRedeemValues({});
    setError(null);
    setSuccess(null);
  };

  const onIssue = async () => {
    if (!qr || !selectedProduct) return;
    const product = products.find((item) => item.id === selectedProduct);
    if (!product) return;
    const priceLabel = formatMoney(product.sale_price_cents, product.currency);
    const confirmed = window.confirm(`¿Asignar “${product.name}” a esta wallet?\n\n${product.initial_units} ${product.type === "uses" ? "usos" : "€ de saldo"}\n${priceLabel}\n${product.validity_days ? `Validez: ${product.validity_days} días` : "Sin caducidad"}`);
    if (!confirmed) return;

    setBusyId("issue");
    setError(null);
    setSuccess(null);
    try {
      await issuePass(selectedProduct, qr);
      setSuccess(`“${product.name}” asignado. Ya aparece en la wallet del cliente.`);
      setPasses(await lookupWalletPasses(businessId, qr));
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo emitir el bono."));
    } finally {
      setBusyId(null);
    }
  };

  const onRedeem = async (pass: ScannedWalletPass) => {
    if (!qr) return;
    const units = Number(redeemValues[pass.pass_id] ?? "1");
    if (!Number.isFinite(units) || units <= 0) {
      setError("Introduce una cantidad válida.");
      return;
    }
    if (pass.product_type === "uses" && !Number.isInteger(units)) {
      setError("Los bonos por usos solo permiten descontar unidades completas.");
      return;
    }
    if (units > pass.remaining_units) {
      setError("No puedes descontar más saldo o usos de los disponibles.");
      return;
    }

    const unitLabel = pass.product_type === "balance" ? "€" : units === 1 ? "uso" : "usos";
    const confirmed = window.confirm(`¿Confirmar consumo?\n\n${pass.product_name}\n-${units} ${unitLabel}\nDisponible ahora: ${pass.remaining_units}\nQuedará: ${Number((pass.remaining_units - units).toFixed(2))}`);
    if (!confirmed) return;

    setBusyId(pass.pass_id);
    setError(null);
    setSuccess(null);
    try {
      await redeemPass(pass.pass_id, units);
      setSuccess(`Consumo registrado: -${units} ${unitLabel}. La wallet se ha actualizado.`);
      setPasses(await lookupWalletPasses(businessId, qr));
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo aplicar el consumo."));
    } finally {
      setBusyId(null);
    }
  };

  const onCancel = async (pass: ScannedWalletPass) => {
    if (!qr || (access?.role !== "owner" && access?.role !== "manager")) return;
    const confirmed = window.confirm(`¿Cancelar el bono “${pass.product_name}”? El cliente dejará de poder utilizarlo.`);
    if (!confirmed) return;

    const operationId = `cancel:${pass.pass_id}`;
    setBusyId(operationId);
    setError(null);
    setSuccess(null);
    try {
      await cancelPass(pass.pass_id);
      setSuccess(`Bono “${pass.product_name}” cancelado.`);
      setPasses(await lookupWalletPasses(businessId, qr));
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo cancelar el bono."));
    } finally {
      setBusyId(null);
    }
  };

  const shortWallet = useMemo(() => qr ? `BN-${qr.token.slice(0, 4).toUpperCase()}-${qr.token.slice(-4).toUpperCase()}` : null, [qr]);
  const canCancelPasses = access?.role === "owner" || access?.role === "manager";

  if (loading) return <main className="bonoa-shell"><div className="h-96 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;

  if (!access) {
    return <main className="bonoa-shell"><Link href="/business" className="text-xs font-bold text-orange-300">← Volver</Link><div className="mt-8 rounded-[2rem] border border-red-400/15 bg-red-400/5 p-8 text-center text-sm text-red-200">No tienes acceso a este negocio.</div></main>;
  }

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver"><MdArrowBack size={20} /></Link>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{access.business.name}</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">Asignar / consumir</h1></div>
        </div>
        <Link href={`/business/${businessId}/counter`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300"><MdPointOfSale size={18} /> Mostrador</Link>
      </header>

      <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-xs leading-5 text-zinc-500"><strong className="text-zinc-300">Flujo rápido:</strong> escanea la wallet → asigna o consume → confirma → termina con el cliente.</div>

      <section className="mt-6 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-4">
          <QrScanner onResult={acceptCode} />
          <form onSubmit={submitManual} className="bonoa-card rounded-[1.5rem] p-4">
            <label className="text-xs font-bold text-zinc-400">Código manual
              <input value={rawCode} onChange={(event) => setRawCode(event.target.value)} placeholder="bonoa:v1:..." className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-white outline-none focus:border-orange-400/40" />
            </label>
            <button disabled={lookingUp || !rawCode.trim()} className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-200 disabled:opacity-40"><MdQrCode2 size={17} /> {lookingUp ? "Leyendo…" : "Usar código"}</button>
          </form>
        </div>

        <div>
          {!qr ? (
            <div className="grid min-h-[28rem] place-items-center rounded-[2rem] border border-dashed border-white/10 p-8 text-center">
              <div><MdQrCode2 size={42} className="mx-auto text-zinc-700" /><p className="mt-4 text-sm font-bold text-white">Listo para el siguiente cliente</p><p className="mt-2 max-w-sm text-xs leading-5 text-zinc-600">Escanea su QR de Bonoa. El comercio solo verá sus propios bonos, nunca el email ni otros datos personales.</p></div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bonoa-card rounded-[1.6rem] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Wallet detectada</p><p className="mt-2 text-lg font-black text-white">{shortWallet}</p></div><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300"><MdCheckCircle size={14} /> válida</span><button type="button" onClick={resetWallet} disabled={busyId !== null} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-zinc-400 disabled:opacity-40"><MdClose size={14} /> Terminar cliente</button></div></div>
              </div>

              <section className="bonoa-card rounded-[1.6rem] p-5">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdAddCard size={20} /></div><div><p className="text-sm font-black text-white">Asignar un bono nuevo</p><p className="mt-1 text-[10px] text-zinc-600">Se mostrará un resumen antes de emitirlo.</p></div></div>
                {products.length ? <div className="mt-4 flex flex-col gap-3 sm:flex-row"><select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40">{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.initial_units} {product.type === "uses" ? "usos" : "€"} · {formatMoney(product.sale_price_cents, product.currency)}</option>)}</select><button type="button" onClick={() => void onIssue()} disabled={busyId !== null || !selectedProduct} className="brand-gradient rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busyId === "issue" ? "Asignando…" : "Asignar"}</button></div> : <div className="mt-4 rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4 text-xs text-amber-100">No hay bonos activos. <Link href={`/business/${businessId}/catalog`} className="font-black underline">Crear uno en Catálogo</Link>.</div>}
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-black text-white">Bonos del cliente</h2><span className="text-xs text-zinc-600">{passes.length}</span></div>
                <div className="space-y-3">
                  {passes.map((pass) => {
                    const usable = pass.pass_status === "active" && pass.remaining_units > 0;
                    return (
                      <article key={pass.pass_id} className={`bonoa-card rounded-[1.5rem] p-5 ${usable ? "" : "opacity-55"}`}>
                        <div className="flex items-start justify-between gap-4"><div><p className="font-bold text-white">{pass.product_name}</p><p className="mt-1 text-xs text-zinc-500">{pass.remaining_units} / {pass.initial_units} {pass.product_type === "uses" ? "usos" : "€"}</p>{pass.expires_at ? <p className="mt-1 text-[10px] text-zinc-600">Caduca {new Date(pass.expires_at).toLocaleDateString("es-ES")}</p> : null}</div><span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">{statusLabel[pass.pass_status]}</span></div>
                        {usable ? <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Descontar<input type="number" min={pass.product_type === "uses" ? "1" : "0.01"} max={pass.remaining_units} step={pass.product_type === "uses" ? "1" : "0.01"} value={redeemValues[pass.pass_id] ?? "1"} onChange={(event) => setRedeemValues((current) => ({ ...current, [pass.pass_id]: event.target.value }))} className="mt-1 block w-28 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-orange-400/40" /></label><button type="button" onClick={() => void onRedeem(pass)} disabled={busyId !== null} className="inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-2.5 text-xs font-black text-orange-200 disabled:opacity-40"><MdRemoveCircleOutline size={17} /> {busyId === pass.pass_id ? "Aplicando…" : "Consumir"}</button>{canCancelPasses ? <button type="button" onClick={() => void onCancel(pass)} disabled={busyId !== null} className="inline-flex items-center gap-2 rounded-full border border-red-400/15 bg-red-400/5 px-4 py-2.5 text-xs font-bold text-red-200 disabled:opacity-40"><MdCancel size={17} /> {busyId === `cancel:${pass.pass_id}` ? "Cancelando…" : "Cancelar bono"}</button> : null}</div> : null}
                      </article>
                    );
                  })}
                  {!passes.length ? <div className="rounded-[1.5rem] border border-dashed border-white/10 p-7 text-center"><p className="text-sm font-bold text-white">Cliente nuevo para este negocio</p><p className="mt-2 text-xs text-zinc-600">Todavía no tiene bonos aquí. Puedes asignarle uno desde el bloque superior.</p></div> : null}
                </div>
              </section>
            </div>
          )}

          {error ? <div className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}
        </div>
      </section>

      {success ? <div className="fixed inset-x-4 bottom-5 z-50 mx-auto flex max-w-xl items-start gap-3 rounded-[1.4rem] border border-emerald-400/20 bg-[#0c1711]/95 p-4 text-emerald-100 shadow-2xl backdrop-blur-xl"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-emerald-300"><MdDoneAll size={21} /></div><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">Operación completada</p><p className="mt-1 text-sm font-bold leading-5">{success}</p></div><button type="button" onClick={() => setSuccess(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-emerald-400/70 hover:bg-white/5"><MdClose size={18} /></button></div> : null}

      <footer className="mt-8 flex items-center gap-2 text-[11px] text-zinc-600"><MdStorefront size={15} /> Bonoa Business · La wallet no revela email ni datos personales al comercio.</footer>
    </main>
  );
}

export default function BusinessScanPage() {
  return <AuthGuard><ScanContent /></AuthGuard>;
}
