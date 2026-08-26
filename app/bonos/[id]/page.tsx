"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowBack, MdHistory, MdSchedule, MdStorefront } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getWalletHistory, getWalletPass, type WalletPass, type WalletRedemption } from "@/lib/wallet-data";

const statusLabels = {
  active: "Activo",
  expiring_soon: "Caduca pronto",
  exhausted: "Agotado",
  expired: "Caducado",
  cancelled: "Cancelado",
} as const;

function formatIssuedPrice(pass: WalletPass) {
  if (pass.issuedPriceCents === null) return null;
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: pass.issuedCurrency ?? "EUR" }).format(pass.issuedPriceCents / 100);
}

function PassDetailContent() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [pass, setPass] = useState<WalletPass | null>(null);
  const [movements, setMovements] = useState<WalletRedemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !params.id) return;
    let active = true;

    Promise.all([getWalletPass(user.id, params.id), getWalletHistory(user.id)])
      .then(([passData, history]) => {
        if (!active) return;
        setPass(passData);
        setMovements(history.filter((movement) => movement.passId === params.id));
        setError(passData ? null : "Este bono no existe o no pertenece a tu wallet.");
      })
      .catch(() => { if (active) setError("No hemos podido cargar este bono."); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [user, params.id]);

  const percentage = useMemo(() => {
    if (!pass || pass.initialUnits <= 0) return 0;
    return Math.max(0, Math.min(100, (pass.remainingUnits / pass.initialUnits) * 100));
  }, [pass]);

  if (loading) return <main className="bonoa-shell"><div className="bonoa-card mt-16 h-96 animate-pulse rounded-[2rem]" /></main>;

  if (!pass || error) {
    return <main className="bonoa-shell"><Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white"><MdArrowBack size={18} /> Volver a la wallet</Link><div className="mt-8 rounded-[2rem] border border-red-400/15 bg-red-400/5 p-8 text-center text-sm text-red-200">{error || "Bono no encontrado."}</div></main>;
  }

  const isBalance = pass.productType === "balance";
  const accent = pass.businessAccentColor || "#ff5a1f";
  const issuedPrice = formatIssuedPrice(pass);

  return (
    <main className="bonoa-shell pb-24">
      <header className="flex items-center gap-4">
        <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver"><MdArrowBack size={20} /></Link>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: accent }}>{pass.businessName}</p><h1 className="mt-1 text-xl font-black tracking-tight text-white">{pass.productName}</h1></div>
      </header>

      <section className="bonoa-card relative mt-8 overflow-hidden rounded-[2rem] p-6 sm:p-8">
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: accent }} />
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-black/25" style={{ borderColor: `${accent}35` }}>{pass.businessLogoUrl ? <img src={pass.businessLogoUrl} alt="" className="h-full w-full object-contain p-1.5" /> : <MdStorefront size={25} style={{ color: accent }} />}</div>
            <div><p className="text-sm leading-6 text-zinc-400">{pass.description}</p>{issuedPrice ? <p className="mt-2 text-xs font-black" style={{ color: accent }}>Emitido por {issuedPrice}</p> : null}</div>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300">{statusLabels[pass.status]}</span>
        </div>

        <div className="mt-8">
          <p className="text-6xl font-black tracking-[-0.06em] text-white">{pass.remainingUnits}<span className="ml-2 text-xl font-medium text-zinc-600">/{pass.initialUnits}{isBalance ? " €" : ""}</span></p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">{isBalance ? "saldo disponible" : "usos disponibles"}</p>
          <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${percentage}%`, background: `linear-gradient(90deg, ${accent}, ${accent}bb)` }} /></div>
        </div>

        <div className="mt-7 flex items-center gap-2 border-t border-white/8 pt-5 text-xs text-zinc-500"><MdSchedule size={17} /> {pass.expiresAt ? `Caduca el ${new Date(pass.expiresAt).toLocaleDateString("es-ES")}` : "Este bono no tiene fecha de caducidad"}</div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-2"><MdHistory style={{ color: accent }} size={19} /><h2 className="text-lg font-black text-white">Movimientos</h2></div>
        <div className="space-y-3">
          {movements.length ? movements.map((movement) => (
            <div key={movement.id} className="bonoa-card flex items-center justify-between rounded-2xl p-4"><div><p className="text-sm font-bold text-white">Consumo de bono</p><p className="mt-1 text-xs text-zinc-500">{new Date(movement.createdAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</p></div><span className="font-black text-white">-{movement.units}{isBalance ? " €" : ""}</span></div>
          )) : <div className="rounded-2xl border border-dashed border-white/10 p-7 text-center"><p className="text-sm font-bold text-white">Aún no se ha utilizado</p><p className="mt-2 text-xs text-zinc-600">Los consumos aparecerán aquí en cuanto el negocio los registre.</p></div>}
        </div>
      </section>
    </main>
  );
}

export default function PassDetailPage() {
  return <AuthGuard><PassDetailContent /></AuthGuard>;
}
