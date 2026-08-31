"use client";

import { useState } from "react";
import { MdPersonAddAlt1, MdShare } from "react-icons/md";
import { getWalletReferralLink } from "@/lib/commerce-v2";

export default function ReferralShareButton({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const share = async () => {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const invite = await getWalletReferralLink(businessId);
      const url = `${window.location.origin}/r/${invite.code}`;
      const text = `${invite.headline} · ${businessName}`;
      if (navigator.share) {
        try { await navigator.share({ title: `${businessName} · Bonoa`, text, url }); setMessage("Invitación preparada."); return; }
        catch { /* sharing cancelled; fall back to clipboard */ }
      }
      await navigator.clipboard.writeText(url);
      setMessage("Enlace de invitación copiado.");
    } catch {
      setMessage("Referidos no activos en este negocio.");
    } finally {
      setBusy(false);
      window.setTimeout(() => setMessage(null), 2500);
    }
  };

  return (
    <div className="mt-4">
      <button type="button" onClick={() => void share()} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black text-zinc-300 transition hover:border-orange-400/25 hover:text-orange-200 disabled:opacity-50">
        {busy ? <MdShare size={16} /> : <MdPersonAddAlt1 size={16} />} {busy ? "Preparando…" : "Invitar a un amigo"}
      </button>
      {message ? <p className="mt-2 text-[10px] text-zinc-500">{message}</p> : null}
    </div>
  );
}
