"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MdArrowBack, MdLockOutline, MdQrCode2, MdRefresh } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import WalletQr from "@/components/WalletQr";
import { friendlyError } from "@/lib/errors";
import { getWalletIdentity, rotateWalletQr, type WalletIdentity } from "@/lib/wallet-data";

function QrContent() {
  const { user, profile } = useAuth();
  const [wallet, setWallet] = useState<WalletIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getWalletIdentity(user.id)
      .then((data) => {
        setWallet(data);
        setError(data ? null : "No encontramos tu wallet.");
      })
      .catch((cause) => setError(friendlyError(cause, "No hemos podido cargar tu QR.")))
      .finally(() => setLoading(false));
  }, [user]);

  const rotate = async () => {
    setRotating(true);
    setError(null);
    setSuccess(null);
    try {
      const nextWallet = await rotateWalletQr();
      setWallet(nextWallet);
      setConfirming(false);
      setSuccess("QR renovado. El código anterior ya no es válido.");
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido renovar tu QR."));
    } finally {
      setRotating(false);
    }
  };

  const payload = wallet ? `bonoa:v${wallet.qrVersion}:${wallet.publicToken}` : "";
  const shortId = wallet ? `BN-${wallet.publicToken.slice(0, 4).toUpperCase()}-${wallet.publicToken.slice(-4).toUpperCase()}` : "";

  return (
    <main className="bonoa-shell flex min-h-screen flex-col">
      <header className="flex items-center justify-between">
        <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver"><MdArrowBack size={20} /></Link>
        <span className="text-sm font-black tracking-tight text-white">Mi QR</span>
        <span className="h-10 w-10" />
      </header>

      <section className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center py-10 text-center">
        <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-orange-400/20 bg-orange-400/10 text-orange-300"><MdQrCode2 size={28} /></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-orange-300">Bonoa ID</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] text-white">Tu wallet, en un gesto.</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">Muéstralo al establecimiento para identificar tu wallet y aplicar el bono correspondiente.</p>

        <div className="mt-8">
          {loading ? <div className="h-[280px] w-[280px] animate-pulse rounded-[2rem] border border-white/10 bg-white/5" /> : payload ? <WalletQr value={payload} /> : <div className="grid h-[280px] w-[280px] place-items-center rounded-[2rem] border border-red-400/15 bg-red-400/5 p-8 text-sm text-red-200">{error}</div>}
        </div>

        {wallet ? <p className="mt-5 text-xs font-bold tracking-[0.18em] text-zinc-400">{shortId}</p> : null}
        {profile?.display_name ? <p className="mt-2 text-xs text-zinc-600">{profile.display_name}</p> : null}

        {success ? <p className="mt-5 w-full max-w-sm rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs text-emerald-200">{success}</p> : null}
        {error && wallet ? <p className="mt-5 w-full max-w-sm rounded-2xl border border-red-400/15 bg-red-400/5 px-4 py-3 text-xs text-red-200">{error}</p> : null}

        <div className="mt-7 flex max-w-sm items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-left">
          <MdLockOutline className="mt-0.5 shrink-0 text-zinc-500" size={18} />
          <p className="text-xs leading-5 text-zinc-500">El QR solo contiene un identificador Bonoa rotatorio. No incluye tu email, saldo ni información personal.</p>
        </div>

        {wallet ? (
          <div className="mt-4 w-full max-w-sm rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-left">
            {!confirming ? (
              <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold text-white">¿Crees que alguien tiene una copia?</p><p className="mt-1 text-[11px] leading-5 text-zinc-600">Puedes invalidar el QR actual y generar otro al instante.</p></div><button type="button" onClick={() => setConfirming(true)} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2.5 text-[11px] font-bold text-zinc-300 hover:text-white"><MdRefresh size={16} /> Renovar</button></div>
            ) : (
              <div><p className="text-xs font-bold text-amber-200">El QR anterior dejará de funcionar inmediatamente.</p><p className="mt-1 text-[11px] leading-5 text-zinc-600">Tus bonos y saldos no cambian; solo cambia el identificador que enseñas al comercio.</p><div className="mt-3 flex gap-2"><button type="button" onClick={() => void rotate()} disabled={rotating} className="brand-gradient rounded-full px-4 py-2.5 text-[11px] font-black text-white disabled:opacity-50">{rotating ? "Renovando…" : "Sí, renovar QR"}</button><button type="button" onClick={() => setConfirming(false)} disabled={rotating} className="rounded-full border border-white/10 px-4 py-2.5 text-[11px] font-bold text-zinc-400">Cancelar</button></div></div>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}

export default function QrPage() {
  return <AuthGuard><QrContent /></AuthGuard>;
}
