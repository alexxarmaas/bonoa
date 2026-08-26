"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdAddCard, MdArrowBack, MdCheckCircle, MdQrCode2, MdRemoveCircleOutline, MdStorefront } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import QrScanner from "@/components/business/QrScanner";
import {
  getBusinessAccess,
  getBusinessProducts,
  issuePass,
  lookupWalletPasses,
  parseBonoaQr,
  redeemPass,
  type BonoaQrIdentity,
  type ScannedWalletPass,
} from "@/lib/business-data";
import type { Database } from "@/lib/supabase/database.types";

type Product = Database["public"]["Tables"]["loyalty_products"]["Row"];
type Access = Awaited<ReturnType<typeof getBusinessAccess>>;

function ScanContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [access, setAccess] = useState<Access>(null);
  const [products, setProducts] = useState<Product[]>([]);
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
    Promise.all([getBusinessAccess(businessId, user.id), getBusinessProducts(businessId)])
      .then(([currentAccess, currentProducts]) => {
        if (!active) return;
        setAccess(currentAccess);
        setProducts(currentProducts.filter((product) => product.active));
        setSelectedProduct(currentProducts.find((product) => product.active)?.id ?? "");
      })
      .catch(() => {
        if (active) setError("No hemos podido preparar el escáner.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [businessId, user]);

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
      setError(cause instanceof Error ? cause.message : "QR inválido o no accesible.");
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

  const onIssue = async () => {
    if (!qr || !selectedProduct) return;
    setBusyId("issue");
    setError(null);
    setSuccess(null);
    try {
      await issuePass(selectedProduct, qr);
      setSuccess("Bono asignado correctamente a la wallet.");
      setPasses(await lookupWalletPasses(businessId, qr));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo emitir el bono.");
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
    setBusyId(pass.pass_id);
    setError(null);
    setSuccess(null);
    try {
      await redeemPass(pass.pass_id, units);
      setSuccess(`Consumo aplicado: -${units}${pass.product_type === "balance" ? " €" : " uso(s)"}.`);
      setPasses(await lookupWalletPasses(businessId, qr));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo aplicar el consumo.");
    } finally {
      setBusyId(null);
    }
  };

  const shortWallet = useMemo(() => qr ? `BN-${qr.token.slice(0, 4).toUpperCase()}-${qr.token.slice(-4).toUpperCase()}` : null, [qr]);

  if (loading) return <main className="bonoa-shell"><div className="h-96 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;

  if (!access) {
    return <main className="bonoa-shell"><Link href="/business" className="text-xs font-bold text-orange-300">← Volver</Link><div className="mt-8 rounded-[2rem] border border-red-400/15 bg-red-400/5 p-8 text-center text-sm text-red-200">No tienes acceso a este negocio.</div></main>;
  }

  return (
    <main className="bonoa-shell min-h-screen">
      <header className="flex items-center gap-4">
        <Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver"><MdArrowBack size={20} /></Link>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{access.business.name}</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">Escanear cliente</h1></div>
      </header>

      <section className="mt-8 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
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
              <div><MdQrCode2 size={42} className="mx-auto text-zinc-700" /><p className="mt-4 text-sm font-bold text-white">Esperando una wallet</p><p className="mt-2 max-w-sm text-xs leading-5 text-zinc-600">Escanea el QR del cliente. Solo veremos los bonos vinculados a {access.business.name}.</p></div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="bonoa-card rounded-[1.6rem] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Wallet detectada</p><p className="mt-2 text-lg font-black text-white">{shortWallet}</p></div><span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300"><MdCheckCircle size={14} /> válida</span></div>
              </div>

              <section>
                <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-black text-white">Bonos disponibles</h2><span className="text-xs text-zinc-600">{passes.length}</span></div>
                <div className="space-y-3">
                  {passes.map((pass) => {
                    const usable = pass.pass_status === "active" && pass.remaining_units > 0 && (!pass.expires_at || new Date(pass.expires_at) > new Date());
                    return (
                      <article key={pass.pass_id} className={`bonoa-card rounded-[1.5rem] p-5 ${usable ? "" : "opacity-55"}`}>
                        <div className="flex items-start justify-between gap-4"><div><p className="font-bold text-white">{pass.product_name}</p><p className="mt-1 text-xs text-zinc-500">{pass.remaining_units} / {pass.initial_units} {pass.product_type === "uses" ? "usos" : "€"}</p></div><span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-400">{pass.pass_status}</span></div>
                        {usable ? <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Descontar<input type="number" min="0.01" max={pass.remaining_units} step={pass.product_type === "uses" ? "1" : "0.01"} value={redeemValues[pass.pass_id] ?? "1"} onChange={(event) => setRedeemValues((current) => ({ ...current, [pass.pass_id]: event.target.value }))} className="mt-1 block w-28 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-orange-400/40" /></label><button type="button" onClick={() => void onRedeem(pass)} disabled={busyId !== null} className="inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-400/10 px-4 py-2.5 text-xs font-black text-orange-200 disabled:opacity-40"><MdRemoveCircleOutline size={17} /> {busyId === pass.pass_id ? "Aplicando…" : "Consumir"}</button></div> : null}
                      </article>
                    );
                  })}
                  {!passes.length ? <div className="rounded-[1.5rem] border border-dashed border-white/10 p-7 text-center text-xs text-zinc-600">Esta wallet todavía no tiene bonos de este negocio.</div> : null}
                </div>
              </section>

              <section className="bonoa-card rounded-[1.6rem] p-5">
                <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdAddCard size={20} /></div><div><p className="text-sm font-black text-white">Asignar un bono</p><p className="mt-1 text-[10px] text-zinc-600">Se añadirá inmediatamente a la wallet.</p></div></div>
                {products.length ? <div className="mt-4 flex flex-col gap-3 sm:flex-row"><select value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40">{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.initial_units} {product.type === "uses" ? "usos" : "€"}</option>)}</select><button type="button" onClick={() => void onIssue()} disabled={busyId !== null || !selectedProduct} className="brand-gradient rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busyId === "issue" ? "Asignando…" : "Asignar"}</button></div> : <p className="mt-4 text-xs text-amber-200/75">Primero crea un tipo de bono en el panel del negocio.</p>}
              </section>
            </div>
          )}

          {error ? <div className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}
          {success ? <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-emerald-200">{success}</div> : null}
        </div>
      </section>

      <footer className="mt-8 flex items-center gap-2 text-[11px] text-zinc-600"><MdStorefront size={15} /> Bonoa Business · La wallet no revela email ni datos personales al comercio.</footer>
    </main>
  );
}

export default function BusinessScanPage() {
  return <AuthGuard><ScanContent /></AuthGuard>;
}
