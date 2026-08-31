"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowBack, MdCheckCircle, MdGroups, MdPersonAddAlt1, MdSecurity, MdTrendingUp } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { getBusinessReferralProgram, getBusinessReferralStats, saveBusinessReferralProgram, type ReferralStats } from "@/lib/commerce-v2";
import { friendlyError } from "@/lib/errors";
import { getPilotProducts, type PilotProduct } from "@/lib/pilot-data";

const emptyStats: ReferralStats = { invites: 0, claims: 0, converted: 0 };

function ReferralsContent() {
  const { user } = useAuth();
  const { id: businessId } = useParams<{ id: string }>();
  const [businessName, setBusinessName] = useState("");
  const [canManage, setCanManage] = useState(false);
  const [products, setProducts] = useState<PilotProduct[]>([]);
  const [stats, setStats] = useState<ReferralStats>(emptyStats);
  const [headline, setHeadline] = useState("Invita a un amigo y ambos ganáis");
  const [referrerReward, setReferrerReward] = useState("");
  const [referredReward, setReferredReward] = useState("");
  const [minimumPurchase, setMinimumPurchase] = useState("0");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const access = await getBusinessAccess(businessId, user.id);
      if (!access) throw new Error("No tienes acceso a este negocio.");
      const [nextProducts, program, nextStats] = await Promise.all([
        getPilotProducts(businessId),
        getBusinessReferralProgram(businessId),
        getBusinessReferralStats(businessId),
      ]);
      const activeProducts = nextProducts.filter((product) => product.active);
      setBusinessName(access.business.name);
      setCanManage(access.role === "owner" || access.role === "manager");
      setProducts(activeProducts);
      setStats(nextStats);
      if (program) {
        setHeadline(program.headline);
        setReferrerReward(program.referrer_reward_product_id);
        setReferredReward(program.referred_reward_product_id ?? "");
        setMinimumPurchase(String(program.minimum_purchase_cents / 100));
        setActive(program.active);
      } else {
        setReferrerReward((current) => current || activeProducts[0]?.id || "");
      }
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido cargar los referidos."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [businessId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || !referrerReward || saving) return;
    const minimum = Number(minimumPurchase.replace(",", "."));
    if (!Number.isFinite(minimum) || minimum < 0 || minimum > 1_000_000) {
      setError("La compra mínima no es válida.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveBusinessReferralProgram({
        businessId,
        referrerRewardProductId: referrerReward,
        referredRewardProductId: referredReward || null,
        minimumPurchaseCents: Math.round(minimum * 100),
        headline,
        active,
      });
      setSuccess("Programa de referidos guardado. Los socios ya pueden generar su enlace desde el carnet.");
      await load();
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo guardar el programa de referidos."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <main className="bonoa-shell"><div className="h-[34rem] animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;

  const conversion = stats.claims ? Math.round((stats.converted / stats.claims) * 100) : 0;

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3"><Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300"><MdArrowBack size={20} /></Link><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">{businessName || "Bonoa Business"}</p><h1 className="mt-1 text-2xl font-black text-white">Referidos</h1></div></div>
      </header>

      <section className="mt-6 rounded-[2rem] border border-orange-400/15 bg-orange-400/[0.04] p-6"><MdPersonAddAlt1 className="text-orange-300" size={26} /><h2 className="mt-4 text-3xl font-black text-white">Convierte a tus mejores clientes en captación.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Cada socio comparte un enlace único. El referido queda asociado y el premio solo se entrega tras su primera compra válida.</p></section>

      {error ? <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}
      {success ? <div className="mt-5 flex gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-emerald-200"><MdCheckCircle size={17} /> {success}</div> : null}

      <section className="mt-7 grid grid-cols-3 gap-3">
        <article className="bonoa-card rounded-[1.5rem] p-5"><MdGroups className="text-sky-300" /><p className="mt-3 text-3xl font-black text-white">{stats.invites}</p><p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">enlaces creados</p></article>
        <article className="bonoa-card rounded-[1.5rem] p-5"><MdPersonAddAlt1 className="text-orange-300" /><p className="mt-3 text-3xl font-black text-white">{stats.claims}</p><p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">referidos</p></article>
        <article className="bonoa-card rounded-[1.5rem] p-5"><MdTrendingUp className="text-emerald-300" /><p className="mt-3 text-3xl font-black text-white">{stats.converted}</p><p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">compraron · {conversion}%</p></article>
      </section>

      {canManage ? <form onSubmit={submit} className="bonoa-card mt-6 rounded-[2rem] p-6 sm:p-7">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdPersonAddAlt1 size={22} /></div><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Programa</p><h2 className="mt-1 text-xl font-black text-white">Qué gana cada parte</h2></div></div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="text-xs font-bold text-zinc-400 md:col-span-2">Mensaje para compartir<input required minLength={2} maxLength={140} value={headline} onChange={(e) => setHeadline(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
          <label className="text-xs font-bold text-zinc-400">Premio del socio<select required value={referrerReward} onChange={(e) => setReferrerReward(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#090909] px-4 py-3 text-sm text-white"><option value="">Seleccionar</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="text-xs font-bold text-zinc-400">Premio del nuevo cliente <span className="font-normal text-zinc-600">(opcional)</span><select value={referredReward} onChange={(e) => setReferredReward(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#090909] px-4 py-3 text-sm text-white"><option value="">Sin premio</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
          <label className="text-xs font-bold text-zinc-400">Compra mínima para validar<input inputMode="decimal" value={minimumPurchase} onChange={(e) => setMinimumPurchase(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" /></label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 text-xs font-bold text-zinc-300"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" /> Programa activo</label>
        </div>
        <div className="mt-5 rounded-2xl border border-amber-300/12 bg-amber-300/[0.04] p-4 text-[11px] leading-5 text-zinc-500"><MdSecurity className="mr-2 inline text-amber-200" size={17} /> Bonoa bloquea auto-referidos y el uso de más de una invitación por nuevo cliente.</div>
        <button disabled={saving || !referrerReward} className="brand-gradient mt-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-40">{saving ? "Guardando…" : "Guardar referidos"}</button>
      </form> : null}
    </main>
  );
}

export default function ReferralsPage() { return <AuthGuard><ReferralsContent /></AuthGuard>; }
