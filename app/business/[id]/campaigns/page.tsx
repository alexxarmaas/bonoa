"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { MdArrowBack, MdCampaign, MdCheckCircle, MdContentCopy, MdGroups, MdPauseCircle, MdPlayCircle, MdRocketLaunch, MdTrendingUp } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { getBusinessCampaignPerformance, type CampaignPerformance } from "@/lib/commerce-v2";
import { friendlyError } from "@/lib/errors";
import { campaignSegmentLabel, campaignUrl, createCampaign, getBusinessCampaigns, setCampaignActive, type CampaignSegment, type LoyaltyCampaign } from "@/lib/loyalty-growth";
import { formatMoney, getPilotProducts, type PilotProduct } from "@/lib/pilot-data";

const templates: Array<{ key: string; title: string; segment: CampaignSegment; name: string; message: string; detail: string }> = [
  { key: "recovery", title: "Recuperar inactivos", segment: "at_risk", name: "Te echamos de menos", message: "Hace tiempo que no vienes. Tenemos una recompensa para darte una razón para volver.", detail: "Solo clientes que llevan más de 45 días sin actividad." },
  { key: "loyal", title: "Premiar fieles", segment: "loyal", name: "Gracias por elegirnos", message: "Esto es solo para quienes siempre vuelven. Disfruta de tu recompensa.", detail: "Premia la relación sin regalar margen a toda la base." },
  { key: "welcome", title: "Segunda visita", segment: "new", name: "Tu bienvenida continúa", message: "Ya eres parte del club. Vuelve y disfruta de esta recompensa especial.", detail: "Para clientes nuevos y acelerar su siguiente visita." },
  { key: "active", title: "Oferta para activos", segment: "active", name: "Una excusa para volver", message: "Esta semana tienes una recompensa esperándote en Bonoa.", detail: "Clientes activos que todavía no están en el segmento fiel." },
  { key: "surprise", title: "Premio sorpresa", segment: "all", name: "Sorpresa Bonoa", message: "Tenemos algo para ti. Abre esta promoción y añádela a tu wallet.", detail: "Campaña amplia para todos los clientes elegibles." },
];

function GuidedCampaignsContent() {
  const { user } = useAuth();
  const { id: businessId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const requestedSegment = searchParams.get("segment") as CampaignSegment | null;
  const [businessName, setBusinessName] = useState("");
  const [role, setRole] = useState<"owner" | "manager" | "staff">("staff");
  const [products, setProducts] = useState<PilotProduct[]>([]);
  const [campaigns, setCampaigns] = useState<LoyaltyCampaign[]>([]);
  const [performance, setPerformance] = useState<CampaignPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState("Te echamos de menos");
  const [message, setMessage] = useState("Hace tiempo que no vienes. Tenemos una recompensa para darte una razón para volver.");
  const [segment, setSegment] = useState<CampaignSegment>(["all","new","active","loyal","at_risk"].includes(requestedSegment ?? "") ? requestedSegment! : "at_risk");
  const [productId, setProductId] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [maxClaims, setMaxClaims] = useState("50");

  const canManage = role === "owner" || role === "manager";
  const perfByCampaign = useMemo(() => new Map(performance.map((item) => [item.campaign_id, item])), [performance]);

  const load = async () => {
    if (!user) return;
    setLoading(true); setError(null);
    try {
      const access = await getBusinessAccess(businessId, user.id);
      if (!access) throw new Error("No tienes acceso a este negocio.");
      const [nextProducts, nextCampaigns, nextPerformance] = await Promise.all([getPilotProducts(businessId), getBusinessCampaigns(businessId), getBusinessCampaignPerformance(businessId)]);
      const activeProducts = nextProducts.filter((product) => product.active);
      setBusinessName(access.business.name); setRole(access.role); setProducts(activeProducts); setCampaigns(nextCampaigns); setPerformance(nextPerformance);
      setProductId((current) => current || activeProducts[0]?.id || "");
    } catch (cause) { setError(friendlyError(cause, "No hemos podido preparar las campañas.")); }
    finally { setLoading(false); }
  };

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [businessId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyTemplate = (key: string) => {
    const item = templates.find((template) => template.key === key);
    if (!item) return;
    setName(item.name); setMessage(item.message); setSegment(item.segment); setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || !productId || busy) return;
    const limit = maxClaims.trim() ? Number(maxClaims) : null;
    const end = endsAt ? new Date(endsAt) : null;
    if (limit !== null && (!Number.isInteger(limit) || limit < 1 || limit > 100000)) { setError("El límite debe estar entre 1 y 100.000."); return; }
    if (end && end <= new Date()) { setError("La fecha de fin debe estar en el futuro."); return; }
    setBusy("create"); setError(null); setSuccess(null);
    try {
      await createCampaign({ businessId, productId, name, message, targetSegment: segment, endsAt: end?.toISOString() ?? null, maxClaims: limit });
      setSuccess(`Campaña creada para ${campaignSegmentLabel(segment).toLowerCase()}. Ya puedes compartir el enlace.`);
      await load();
    } catch (cause) { setError(friendlyError(cause, "No se pudo crear la campaña.")); }
    finally { setBusy(null); }
  };

  const toggle = async (campaign: LoyaltyCampaign) => {
    if (!canManage || busy) return;
    setBusy(campaign.campaign_id);
    try { await setCampaignActive(campaign.campaign_id, !campaign.active); await load(); }
    catch (cause) { setError(friendlyError(cause, "No se pudo actualizar la campaña.")); }
    finally { setBusy(null); }
  };

  const copy = async (campaign: LoyaltyCampaign) => {
    try { await navigator.clipboard.writeText(campaignUrl(campaign.share_code)); setSuccess("Enlace de campaña copiado."); }
    catch { setError("No hemos podido copiar el enlace."); }
  };

  if (loading) return <main className="bonoa-shell"><div className="h-[38rem] animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300"><MdArrowBack size={20} /></Link><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">{businessName || "Bonoa Business"}</p><h1 className="mt-1 text-2xl font-black text-white">Campañas guiadas</h1></div></div><Link href={`/business/${businessId}/growth`} className="text-xs font-black text-zinc-400 hover:text-white">Objetivos avanzados →</Link></header>

      <section className="mt-6 rounded-[2rem] border border-orange-400/15 bg-orange-400/[0.04] p-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Primero el objetivo, después el formulario</p><h2 className="mt-2 text-3xl font-black text-white">¿A quién quieres hacer volver?</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Elige una intención y Bonoa prepara segmento, mensaje y enfoque. Tú decides el premio y el límite.</p></section>

      {error ? <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}
      {success ? <div className="mt-5 flex gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-emerald-200"><MdCheckCircle size={17} /> {success}</div> : null}

      {canManage ? <form onSubmit={submit} className="mt-7 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <section className="bonoa-card rounded-[2rem] p-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Plantillas</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{templates.map((item) => <button key={item.key} type="button" onClick={() => applyTemplate(item.key)} className={`rounded-[1.4rem] border p-4 text-left transition ${segment === item.segment && name === item.name ? "border-orange-400/30 bg-orange-400/[0.08]" : "border-white/8 bg-white/[0.02] hover:border-white/15"}`}><p className="text-xs font-black text-white">{item.title}</p><p className="mt-2 text-[10px] leading-5 text-zinc-500">{item.detail}</p></button>)}</div></section>
        <section className="bonoa-card rounded-[2rem] p-6"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Campaña</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold text-zinc-400 sm:col-span-2">Nombre<input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label><label className="text-xs font-bold text-zinc-400 sm:col-span-2">Mensaje<textarea required maxLength={500} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label><label className="text-xs font-bold text-zinc-400">Segmento<select value={segment} onChange={(e) => setSegment(e.target.value as CampaignSegment)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#090909] px-4 py-3 text-sm text-white"><option value="at_risk">En riesgo</option><option value="new">Nuevos</option><option value="active">Activos</option><option value="loyal">Fieles</option><option value="all">Todos</option></select></label><label className="text-xs font-bold text-zinc-400">Premio<select required value={productId} onChange={(e) => setProductId(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-[#090909] px-4 py-3 text-sm text-white"><option value="">Seleccionar</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label className="text-xs font-bold text-zinc-400">Límite de reclamaciones<input inputMode="numeric" value={maxClaims} onChange={(e) => setMaxClaims(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" /></label><label className="text-xs font-bold text-zinc-400">Finaliza <span className="font-normal text-zinc-600">(opcional)</span><input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white" /></label></div><button disabled={Boolean(busy) || !productId} className="brand-gradient mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-xs font-black text-white disabled:opacity-40"><MdRocketLaunch size={18} /> {busy === "create" ? "Creando…" : "Lanzar campaña"}</button></section>
      </form> : null}

      <section className="mt-8"><div className="mb-4"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-300">Resultados</p><h2 className="mt-1 text-xl font-black text-white">Campañas y retorno atribuido</h2></div>{campaigns.length ? <div className="grid gap-4 lg:grid-cols-2">{campaigns.map((campaign) => { const perf = perfByCampaign.get(campaign.campaign_id); const conversion = perf?.claims ? Math.round((perf.converted_customers / perf.claims) * 100) : 0; return <article key={campaign.campaign_id} className="bonoa-card rounded-[1.7rem] p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-300">{campaignSegmentLabel(campaign.target_segment)}</p><h3 className="mt-2 text-lg font-black text-white">{campaign.campaign_name}</h3><p className="mt-2 text-xs leading-5 text-zinc-500">{campaign.message}</p></div><button type="button" onClick={() => void toggle(campaign)} disabled={Boolean(busy)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300">{campaign.active ? <MdPauseCircle size={21} /> : <MdPlayCircle size={21} />}</button></div><div className="mt-5 grid grid-cols-3 gap-2"><div className="rounded-2xl border border-white/8 bg-black/20 p-3"><MdGroups className="text-sky-300" /><p className="mt-2 text-xl font-black text-white">{perf?.claims ?? campaign.claims}</p><p className="text-[9px] text-zinc-600">reclamaciones</p></div><div className="rounded-2xl border border-white/8 bg-black/20 p-3"><MdTrendingUp className="text-emerald-300" /><p className="mt-2 text-xl font-black text-white">{perf?.converted_customers ?? 0}</p><p className="text-[9px] text-zinc-600">volvieron · {conversion}%</p></div><div className="rounded-2xl border border-white/8 bg-black/20 p-3"><p className="text-[9px] text-zinc-600">ingreso identificado</p><p className="mt-2 text-sm font-black text-white">{formatMoney(perf?.identified_revenue_cents ?? 0)}</p></div></div><button type="button" onClick={() => void copy(campaign)} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-[10px] font-black text-zinc-300"><MdContentCopy size={15} /> Copiar enlace</button></article>; })}</div> : <div className="rounded-[1.7rem] border border-dashed border-white/10 p-8 text-center"><MdCampaign className="mx-auto text-zinc-700" size={30} /><p className="mt-3 text-sm font-black text-white">Todavía no hay campañas</p><p className="mt-2 text-xs text-zinc-600">Elige una plantilla arriba y lanza la primera.</p></div>}</section>
    </main>
  );
}

export default function GuidedCampaignsPage() { return <AuthGuard><GuidedCampaignsContent /></AuthGuard>; }
