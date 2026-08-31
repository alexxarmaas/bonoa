"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowBack, MdCheckCircle, MdSave, MdWorkspacePremium } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { updateBusinessClubProfile } from "@/lib/commerce-v2";
import { friendlyError } from "@/lib/errors";
import { getPilotBusiness } from "@/lib/pilot-data";

type ClubBusiness = Awaited<ReturnType<typeof getPilotBusiness>> & {
  club_name?: string | null;
  club_message?: string | null;
  membership_badge_label?: string | null;
};

function ClubContent() {
  const { user } = useAuth();
  const { id: businessId } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<ClubBusiness | null>(null);
  const [allowed, setAllowed] = useState(false);
  const [clubName, setClubName] = useState("");
  const [clubMessage, setClubMessage] = useState("");
  const [badge, setBadge] = useState("MIEMBRO");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    Promise.all([getBusinessAccess(businessId, user.id), getPilotBusiness(businessId)])
      .then(([access, value]) => {
        if (!active) return;
        const next = value as ClubBusiness;
        setAllowed(access?.role === "owner" || access?.role === "manager");
        setBusiness(next);
        setClubName(next.club_name || `Club ${next.name}`);
        setClubMessage(next.club_message || "Gracias por volver. Cada visita cuenta.");
        setBadge(next.membership_badge_label || "MIEMBRO");
      })
      .catch((cause) => { if (active) setError(friendlyError(cause, "No hemos podido cargar el carnet.")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [businessId, user]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!allowed || saving) return;
    setSaving(true); setError(null); setSuccess(null);
    try {
      await updateBusinessClubProfile(businessId, { clubName, clubMessage, badgeLabel: badge });
      setSuccess("Carnet actualizado. Los clientes verán esta identidad en su wallet.");
    } catch (cause) { setError(friendlyError(cause, "No se pudo actualizar el carnet.")); }
    finally { setSaving(false); }
  };

  if (loading) return <main className="bonoa-shell"><div className="h-96 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;
  if (!business) return <main className="bonoa-shell"><p className="text-sm text-red-200">{error || "Negocio no disponible."}</p></main>;

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex items-center gap-3"><Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300"><MdArrowBack size={20} /></Link><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Identidad de fidelización</p><h1 className="mt-1 text-2xl font-black text-white">Carnet del club</h1></div></header>
      <p className="mt-5 max-w-2xl text-sm leading-6 text-zinc-500">El carnet es permanente. Los bonos y premios siguen siendo consumibles independientes. Personaliza aquí la sensación de pertenencia que verá el cliente.</p>
      {error ? <p className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</p> : null}
      {success ? <p className="mt-5 flex items-center gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-emerald-200"><MdCheckCircle />{success}</p> : null}
      <section className="mt-7 grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <form onSubmit={submit} className="bonoa-card rounded-[2rem] p-6">
          <h2 className="text-lg font-black text-white">Configura tu carnet</h2>
          <div className="mt-5 space-y-4">
            <label className="block text-xs font-bold text-zinc-400">Nombre del club<input disabled={!allowed} value={clubName} onChange={(e) => setClubName(e.target.value)} maxLength={80} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
            <label className="block text-xs font-bold text-zinc-400">Mensaje al socio<textarea disabled={!allowed} value={clubMessage} onChange={(e) => setClubMessage(e.target.value)} maxLength={240} rows={4} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none focus:border-orange-400/40" /></label>
            <label className="block text-xs font-bold text-zinc-400">Etiqueta del carnet<input disabled={!allowed} value={badge} onChange={(e) => setBadge(e.target.value.toUpperCase())} maxLength={24} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm font-black uppercase tracking-[.15em] text-white outline-none focus:border-orange-400/40" /></label>
          </div>
          <button disabled={!allowed || saving} className="brand-gradient mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-40"><MdSave size={18}/>{saving ? "Guardando…" : "Guardar carnet"}</button>
        </form>
        <div className="rounded-[2rem] border border-white/10 p-1" style={{ background: `linear-gradient(135deg, ${business.accent_color || "#ff5a1f"}55, #111 55%, #050505)` }}>
          <div className="flex min-h-[25rem] flex-col justify-between rounded-[1.8rem] bg-black/65 p-7 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3">{business.logo_url ? <img src={business.logo_url} alt="" className="h-14 w-14 rounded-2xl object-contain bg-white/5 p-2" /> : <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/5 text-orange-300"><MdWorkspacePremium size={27}/></div>}<div><p className="text-[10px] font-black uppercase tracking-[.18em] text-zinc-500">{business.name}</p><h2 className="mt-1 text-2xl font-black text-white">{clubName || `Club ${business.name}`}</h2></div></div><span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-black tracking-[.15em] text-white">{badge || "MIEMBRO"}</span></div>
            <div><p className="max-w-lg text-lg font-bold leading-7 text-white">{clubMessage || "Gracias por volver. Cada visita cuenta."}</p><div className="mt-6 grid grid-cols-3 gap-3"><div className="rounded-2xl bg-white/5 p-4"><p className="text-2xl font-black text-white">6</p><p className="mt-1 text-[9px] uppercase tracking-[.15em] text-zinc-500">Compras</p></div><div className="rounded-2xl bg-white/5 p-4"><p className="text-2xl font-black text-white">8</p><p className="mt-1 text-[9px] uppercase tracking-[.15em] text-zinc-500">Visitas</p></div><div className="rounded-2xl bg-white/5 p-4"><p className="text-2xl font-black text-white">1</p><p className="mt-1 text-[9px] uppercase tracking-[.15em] text-zinc-500">Premio</p></div></div></div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-zinc-600">Carnet permanente · Bonoa</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function BusinessClubPage() { return <AuthGuard><ClubContent /></AuthGuard>; }
