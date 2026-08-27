"use client";

import { useEffect, useState } from "react";
import { FaApple } from "react-icons/fa";
import { MdWallet } from "react-icons/md";
import { supabase } from "@/lib/supabase/client";

type Capabilities = { google: boolean; apple: boolean };

export default function DigitalWalletButtons({ membershipId }: { membershipId: string }) {
  const [capabilities, setCapabilities] = useState<Capabilities>({ google: false, apple: false });
  const [loading, setLoading] = useState<"google" | "apple" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/wallet/capabilities", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: Capabilities) => setCapabilities(data))
      .catch(() => setCapabilities({ google: false, apple: false }));
  }, []);

  const accessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  };

  const addGoogle = async () => {
    if (!capabilities.google || loading) return;
    setLoading("google");
    setMessage(null);
    try {
      const token = await accessToken();
      if (!token) throw new Error("session");
      const response = await fetch("/api/wallet/google", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "google_wallet_failed");
      window.location.assign(data.url);
    } catch {
      setMessage("No se pudo preparar Google Wallet.");
    } finally {
      setLoading(null);
    }
  };

  const addApple = async () => {
    if (!capabilities.apple || loading) return;
    setLoading("apple");
    setMessage(null);
    try {
      const token = await accessToken();
      if (!token) throw new Error("session");
      const response = await fetch("/api/wallet/apple", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });
      if (!response.ok) throw new Error("apple_wallet_failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      window.location.assign(url);
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setMessage("No se pudo preparar Apple Wallet.");
    } finally {
      setLoading(null);
    }
  };

  if (!capabilities.google && !capabilities.apple) {
    return <p className="mt-3 text-[10px] text-zinc-700">Wallet digital preparada; pendiente de credenciales de emisor.</p>;
  }

  return (
    <div className="mt-4 border-t border-white/5 pt-4">
      <p className="mb-2 text-[9px] font-black uppercase tracking-[0.15em] text-zinc-600">Llévalo en tu móvil</p>
      <div className="flex flex-wrap gap-2">
        {capabilities.apple ? <button type="button" onClick={() => void addApple()} disabled={Boolean(loading)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white px-3.5 py-2 text-[10px] font-black text-black disabled:opacity-50"><FaApple size={16} /> {loading === "apple" ? "Preparando…" : "Apple Wallet"}</button> : null}
        {capabilities.google ? <button type="button" onClick={() => void addGoogle()} disabled={Boolean(loading)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-[10px] font-black text-white disabled:opacity-50"><MdWallet size={16} /> {loading === "google" ? "Preparando…" : "Google Wallet"}</button> : null}
      </div>
      {message ? <p className="mt-2 text-[10px] text-red-300">{message}</p> : null}
    </div>
  );
}
