"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MdCheckCircle, MdLock, MdRedeem, MdSchedule, MdStorefront, MdWallet } from "react-icons/md";
import { useAuth } from "@/components/auth/AuthProvider";
import { friendlyError } from "@/lib/errors";
import { claimCampaign, getPublicCampaign, type CampaignClaim, type PublicCampaign } from "@/lib/loyalty-growth";

const unavailableCopy: Record<string, string> = {
  upcoming: "Esta campaña todavía no ha empezado.",
  ended: "Esta campaña ya ha finalizado.",
  exhausted: "Se han agotado todas las recompensas disponibles.",
  disabled: "Esta campaña está pausada temporalmente.",
};

export default function PromoPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null);
  const [claim, setClaim] = useState<CampaignClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getPublicCampaign(params.code)
      .then((data) => { if (active) setCampaign(data); })
      .catch((cause) => { if (active) setError(friendlyError(cause, "No hemos podido cargar esta campaña.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.code]);

  const onClaim = async () => {
    if (authLoading || claiming) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/promo/${params.code}`)}`);
      return;
    }

    setClaiming(true);
    setError(null);
    try {
      const result = await claimCampaign(params.code);
      setClaim(result);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido añadir esta recompensa a tu wallet."));
      const refreshed = await getPublicCampaign(params.code).catch(() => null);
      if (refreshed) setCampaign(refreshed);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return <main className="bonoa-shell grid min-h-screen place-items-center py-10"><div className="h-[34rem] w-full max-w-lg animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;
  }

  if (!campaign) {
    return <main className="bonoa-shell grid min-h-screen place-items-center py-10"><section className="bonoa-card w-full max-w-lg rounded-[2rem] p-8 text-center"><MdRedeem size={38} className="mx-auto text-zinc-700" /><h1 className="mt-4 text-2xl font-black text-white">Campaña no disponible</h1><p className="mt-3 text-sm leading-6 text-zinc-500">El enlace no existe, ha dejado de estar disponible o el negocio ya no publica esta promoción.</p><Link href="/" className="mt-6 inline-flex rounded-full border border-white/10 px-5 py-3 text-xs font-bold text-zinc-300">Ir a mi wallet</Link></section></main>;
  }

  const available = campaign.state === "active";
  const unit = campaign.product_type === "uses" ? (campaign.initial_units === 1 ? "uso" : "usos") : "€ de saldo";

  return (
    <main className="bonoa-shell grid min-h-screen place-items-center py-8 sm:py-12">
      <section className="w-full max-w-lg">
        <div className="mb-6 text-center"><Link href="/" className="text-3xl font-black tracking-[-0.05em] text-white">bon<span className="text-brand-gradient">ō</span>a</Link><p className="mt-2 text-xs text-zinc-600">Una recompensa de {campaign.business_name}</p></div>

        <article className="bonoa-card overflow-hidden rounded-[2rem]">
          <div className="h-1.5" style={{ backgroundColor: campaign.business_accent_color || "#f97316" }} />
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-4">
              {campaign.business_logo_url ? <img src={campaign.business_logo_url} alt={`Logo de ${campaign.business_name}`} className="h-14 w-14 rounded-2xl border border-white/10 object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-lg font-black text-white">{campaign.business_name.slice(0, 1).toUpperCase()}</div>}
              <div className="min-w-0"><p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600"><MdStorefront size={14} /> {campaign.business_name}</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">{campaign.campaign_name}</h1></div>
            </div>

            {campaign.campaign_message ? <p className="mt-5 text-sm leading-6 text-zinc-400">{campaign.campaign_message}</p> : null}

            <div className="mt-6 rounded-[1.5rem] border border-orange-400/15 bg-orange-400/[0.045] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-orange-300">Tu recompensa</p>
              <div className="mt-3 flex items-end justify-between gap-4"><div><h2 className="text-xl font-black text-white">{campaign.product_name}</h2>{campaign.product_description ? <p className="mt-2 text-xs leading-5 text-zinc-500">{campaign.product_description}</p> : null}</div><MdRedeem className="shrink-0 text-orange-300" size={28} /></div>
              <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-bold text-zinc-300">{campaign.initial_units} {unit}</span>{campaign.validity_days ? <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-bold text-zinc-300"><MdSchedule size={13} /> {campaign.validity_days} días de validez</span> : <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[10px] font-bold text-zinc-300">Sin caducidad</span>}</div>
            </div>

            {claim ? <div className="mt-5 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/[0.06] p-5 text-center"><MdCheckCircle className="mx-auto text-emerald-300" size={34} /><p className="mt-3 text-base font-black text-white">{claim.already_claimed ? "Ya era tuyo" : "Añadido a tu wallet"}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{claim.product_name} está disponible en Bonoa{claim.expires_at ? ` hasta el ${new Date(claim.expires_at).toLocaleDateString("es-ES")}` : ""}.</p><Link href={`/bonos/${claim.pass_id}`} className="brand-gradient mt-4 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white"><MdWallet size={18} /> Ver mi bono</Link></div> : available ? <>
              <button type="button" onClick={() => void onClaim()} disabled={claiming || authLoading} className="brand-gradient mt-5 flex w-full items-center justify-center gap-2 rounded-full px-5 py-4 text-sm font-black text-white disabled:opacity-50"><MdRedeem size={20} /> {claiming ? "Añadiendo…" : user ? "Añadir gratis a mi wallet" : "Entrar y reclamar"}</button>
              {!user && !authLoading ? <p className="mt-3 text-center text-[10px] leading-5 text-zinc-600"><MdLock className="mr-1 inline" size={12} />Necesitas una cuenta Bonoa para que la recompensa quede vinculada únicamente a tu wallet. <Link href={`/register?next=${encodeURIComponent(`/promo/${params.code}`)}`} className="font-bold text-orange-300">Crear cuenta</Link></p> : null}
            </> : <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-white/[0.025] p-5 text-center"><p className="text-sm font-black text-white">No se puede reclamar ahora</p><p className="mt-2 text-xs leading-5 text-zinc-500">{unavailableCopy[campaign.state] ?? "Esta campaña no está disponible."}</p></div>}

            {campaign.claims_remaining !== null && campaign.state === "active" ? <p className="mt-4 text-center text-[10px] font-bold uppercase tracking-[0.13em] text-zinc-600">Quedan {campaign.claims_remaining} recompensa{campaign.claims_remaining === 1 ? "" : "s"}</p> : null}
            {campaign.ends_at && campaign.state === "active" ? <p className="mt-1 text-center text-[10px] text-zinc-700">Disponible hasta el {new Date(campaign.ends_at).toLocaleDateString("es-ES")}</p> : null}
            {error ? <p className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs leading-5 text-red-200">{error}</p> : null}
          </div>
        </article>
        <p className="mt-5 text-center text-[10px] leading-5 text-zinc-700">Cada campaña puede reclamarse una sola vez por wallet. El comercio no recibe tu email a través de esta pantalla.</p>
      </section>
    </main>
  );
}
