"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowBack, MdCheckCircle, MdClose, MdDoneAll, MdEuro, MdLocalActivity, MdPointOfSale, MdQrCode2, MdRefresh, MdShoppingBag } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import QrScanner from "@/components/business/QrScanner";
import { getBusinessAccess, parseBonoaQr, type BonoaQrIdentity } from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import { registerLoyaltyEvent, type LoyaltyEventType } from "@/lib/loyalty-growth";

type Access = Awaited<ReturnType<typeof getBusinessAccess>>;
type PendingEvent = { type: LoyaltyEventType; amountCents: number; requestId: string; walletKey: string };

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}

function EngageContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [access, setAccess] = useState<Access>(null);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<BonoaQrIdentity | null>(null);
  const [rawCode, setRawCode] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [busy, setBusy] = useState<LoyaltyEventType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scannerRestartToken, setScannerRestartToken] = useState(0);
  const pendingRef = useRef<PendingEvent | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    getBusinessAccess(businessId, user.id)
      .then((current) => { if (active) setAccess(current); })
      .catch((cause) => { if (active) setError(friendlyError(cause, "No hemos podido preparar el registro de actividad.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId, user]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(null), 5000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const acceptCode = useCallback((value: string) => {
    setRawCode(value);
    setError(null);
    const identity = parseBonoaQr(value);
    if (!identity) {
      setError("Este código no es un QR válido de Bonoa.");
      window.setTimeout(() => setScannerRestartToken((token) => token + 1), 700);
      return;
    }
    pendingRef.current = null;
    setQr(identity);
    vibrate([30, 40, 30]);
  }, []);

  const submitManual = (event: FormEvent) => {
    event.preventDefault();
    if (qr || busy) return;
    acceptCode(rawCode);
  };

  const resetCustomer = () => {
    pendingRef.current = null;
    setQr(null);
    setRawCode("");
    setPurchaseAmount("");
    setBusy(null);
    setError(null);
    setSuccess(null);
    setScannerRestartToken((token) => token + 1);
  };

  const recordEvent = async (type: LoyaltyEventType) => {
    if (!qr || busy) return;
    const euros = purchaseAmount.trim() ? Number(purchaseAmount.replace(",", ".")) : 0;
    if (type === "purchase" && (!Number.isFinite(euros) || euros < 0 || euros > 1_000_000)) {
      setError("Introduce un importe válido entre 0 € y 1.000.000 €.");
      return;
    }
    const amountCents = type === "purchase" ? Math.round(euros * 100) : 0;
    const label = type === "purchase"
      ? amountCents > 0 ? `Compra de ${(amountCents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}` : "Compra"
      : "Visita";
    if (!window.confirm(`¿Registrar ${label.toLowerCase()} para este cliente?`)) return;

    const walletKey = `${qr.version}:${qr.token}`;
    const previous = pendingRef.current;
    const requestId = previous?.type === type && previous.amountCents === amountCents && previous.walletKey === walletKey
      ? previous.requestId
      : crypto.randomUUID();
    pendingRef.current = { type, amountCents, requestId, walletKey };

    setBusy(type);
    setError(null);
    setSuccess(null);
    try {
      const result = await registerLoyaltyEvent({ businessId, qr, type, amountCents, requestId });
      pendingRef.current = null;
      if (result.rewards_issued > 0) {
        setSuccess(`${label} registrada. 🎁 Bonoa ha desbloqueado ${result.rewards_issued} ${result.rewards_issued === 1 ? "recompensa" : "recompensas"} automáticamente.`);
        vibrate([50, 50, 80, 50, 100]);
      } else {
        setSuccess(`${label} registrada correctamente. El progreso de fidelización ya está actualizado.`);
        vibrate([45, 55, 45]);
      }
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo registrar la actividad. Si reintentas, Bonoa reutilizará la misma operación para no duplicarla."));
    } finally {
      setBusy(null);
    }
  };

  const customerCode = useMemo(() => qr ? `BN-${qr.token.slice(0, 4).toUpperCase()}-${qr.token.slice(-4).toUpperCase()}` : null, [qr]);

  if (loading) return <main className="bonoa-shell"><div className="h-96 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;
  if (!access) return <main className="bonoa-shell"><Link href="/business" className="text-xs font-bold text-orange-300">← Volver</Link><div className="mt-8 rounded-[2rem] border border-red-400/15 bg-red-400/5 p-8 text-center text-sm text-red-200">No tienes acceso a este negocio.</div></main>;

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{access.business.name}</p><h1 className="mt-1 text-2xl font-black text-white">Registrar actividad</h1></div></div>
        <Link href={`/business/${businessId}/counter`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300"><MdPointOfSale size={18} /> Mostrador</Link>
      </header>

      <section className="mt-5 rounded-[1.7rem] border border-orange-400/12 bg-orange-400/[0.04] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Fidelización sin tarjetas</p>
        <h2 className="mt-2 text-xl font-black text-white">Escanea. Registra. Bonoa decide si toca premio.</h2>
        <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">Úsalo aunque el cliente no tenga ningún bono. Cada compra o visita alimenta sus reglas de fidelización automáticamente.</p>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <div className="space-y-4">
          <QrScanner onResult={acceptCode} active={!qr && !busy} restartToken={scannerRestartToken} />
          <form onSubmit={submitManual} className="bonoa-card rounded-[1.5rem] p-4">
            <label className="text-xs font-bold text-zinc-400">Código manual
              <input disabled={Boolean(qr) || Boolean(busy)} value={rawCode} onChange={(event) => setRawCode(event.target.value)} placeholder="bonoa:v1:..." className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-xs text-white outline-none focus:border-orange-400/40 disabled:opacity-40" />
            </label>
            <button disabled={Boolean(qr) || Boolean(busy) || !rawCode.trim()} className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-200 disabled:opacity-40"><MdQrCode2 size={17} /> Usar código</button>
          </form>
        </div>

        {!qr ? <div className="grid min-h-[28rem] place-items-center rounded-[2rem] border border-dashed border-white/10 p-8 text-center"><div><MdQrCode2 size={42} className="mx-auto text-zinc-700" /><p className="mt-4 text-sm font-bold text-white">Listo para el siguiente cliente</p><p className="mt-2 max-w-sm text-xs leading-5 text-zinc-600">Escanea su QR universal de Bonoa para registrar una compra o una visita.</p></div></div> : (
          <div className="space-y-5">
            <div className="bonoa-card rounded-[1.6rem] p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Cliente detectado</p><p className="mt-2 text-lg font-black text-white">{customerCode}</p></div><div className="flex gap-2"><span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-300"><MdCheckCircle size={14} /> válida</span><button type="button" onClick={resetCustomer} disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-zinc-400 disabled:opacity-40"><MdClose size={14} /> Terminar</button></div></div></div>

            <section className="grid gap-4 md:grid-cols-2">
              <article className="bonoa-card rounded-[1.7rem] p-5 sm:p-6"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdShoppingBag size={22} /></div><div><p className="text-sm font-black text-white">Registrar compra</p><p className="mt-1 text-[10px] text-zinc-600">Cuenta para reglas por compras y gasto.</p></div></div><label className="mt-5 block text-xs font-bold text-zinc-400">Importe <span className="font-normal text-zinc-600">(opcional)</span><div className="relative mt-2"><MdEuro className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={17} /><input inputMode="decimal" value={purchaseAmount} onChange={(event) => { pendingRef.current = null; setPurchaseAmount(event.target.value); }} placeholder="0,00" className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-10 pr-4 text-sm text-white outline-none focus:border-orange-400/40" /></div></label><button type="button" onClick={() => void recordEvent("purchase")} disabled={Boolean(busy)} className="brand-gradient mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-40"><MdShoppingBag size={18} /> {busy === "purchase" ? "Registrando…" : "Registrar compra"}</button></article>

              <article className="bonoa-card rounded-[1.7rem] p-5 sm:p-6"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-sky-400/15 bg-sky-400/[0.07] text-sky-300"><MdLocalActivity size={22} /></div><div><p className="text-sm font-black text-white">Registrar visita</p><p className="mt-1 text-[10px] text-zinc-600">Perfecto para negocios sin ticket o importe.</p></div></div><div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4 text-xs leading-5 text-zinc-500">Ejemplo: <strong className="text-zinc-300">cada 5 visitas → regalo</strong>. No necesitas introducir importe ni consumir un bono.</div><button type="button" onClick={() => void recordEvent("visit")} disabled={Boolean(busy)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-5 py-3 text-xs font-black text-sky-100 disabled:opacity-40"><MdLocalActivity size={18} /> {busy === "visit" ? "Registrando…" : "Registrar visita"}</button></article>
            </section>

            <div className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-[11px] leading-5 text-zinc-600"><MdRefresh size={17} className="shrink-0 text-zinc-500" /> Los reintentos usan una clave idempotente: un doble toque o un fallo de red no duplica la compra/visita.</div>
          </div>
        )}
      </section>

      {error ? <div className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}
      {success ? <div className="fixed inset-x-4 bottom-5 z-50 mx-auto flex max-w-xl items-start gap-3 rounded-[1.4rem] border border-emerald-400/20 bg-[#0c1711]/95 p-4 text-emerald-100 shadow-2xl backdrop-blur-xl"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-400/10 text-emerald-300"><MdDoneAll size={21} /></div><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400">Actividad registrada</p><p className="mt-1 text-sm font-bold leading-5">{success}</p></div><button type="button" onClick={() => setSuccess(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-emerald-400/70 hover:bg-white/5"><MdClose size={18} /></button></div> : null}
    </main>
  );
}

export default function BusinessEngagePage() {
  return <AuthGuard><EngageContent /></AuthGuard>;
}
