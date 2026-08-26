"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowBack, MdAutoAwesome, MdCampaign, MdCheckCircle, MdContentCopy, MdGroups, MdLocalActivity, MdPauseCircle, MdPlayCircle, MdRedeem, MdShare, MdShoppingBag } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import { getPilotProducts, type PilotProduct } from "@/lib/pilot-data";
import {
  automationTriggerLabel,
  campaignUrl,
  createAutomationRule,
  createCampaign,
  getBusinessAutomationRules,
  getBusinessCampaigns,
  getLoyaltyEventSummary,
  setAutomationRuleActive,
  setCampaignActive,
  type AutomationRule,
  type AutomationTrigger,
  type LoyaltyCampaign,
  type LoyaltyEventSummary,
} from "@/lib/loyalty-growth";

const stateLabels: Record<LoyaltyCampaign["state"], string> = {
  active: "Activa",
  upcoming: "Programada",
  ended: "Finalizada",
  exhausted: "Agotada",
  disabled: "Pausada",
};

const emptySummary: LoyaltyEventSummary = { purchases_30d: 0, visits_30d: 0, spend_30d_cents: 0, rewards_30d: 0 };

function GrowthContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [businessName, setBusinessName] = useState("");
  const [role, setRole] = useState<"owner" | "manager" | "staff">("staff");
  const [products, setProducts] = useState<PilotProduct[]>([]);
  const [campaigns, setCampaigns] = useState<LoyaltyCampaign[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [eventSummary, setEventSummary] = useState<LoyaltyEventSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [campaignName, setCampaignName] = useState("Vuelve y disfruta");
  const [campaignMessage, setCampaignMessage] = useState("Una recompensa para darte las gracias por confiar en nosotros.");
  const [campaignProduct, setCampaignProduct] = useState("");
  const [campaignEnds, setCampaignEnds] = useState("");
  const [campaignMax, setCampaignMax] = useState("50");

  const [ruleName, setRuleName] = useState("Premio por fidelidad");
  const [triggerType, setTriggerType] = useState<AutomationTrigger>("purchase_count");
  const [triggerValue, setTriggerValue] = useState("5");
  const [triggerProduct, setTriggerProduct] = useState("");
  const [rewardProduct, setRewardProduct] = useState("");
  const [repeatable, setRepeatable] = useState(true);
  const [ruleMax, setRuleMax] = useState("");

  const canManage = role === "owner" || role === "manager";

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const access = await getBusinessAccess(businessId, user.id);
      if (!access) throw new Error("No tienes acceso a este negocio.");
      const [currentProducts, currentCampaigns, currentRules, currentSummary] = await Promise.all([
        getPilotProducts(businessId),
        getBusinessCampaigns(businessId),
        getBusinessAutomationRules(businessId),
        getLoyaltyEventSummary(businessId),
      ]);
      const activeProducts = currentProducts.filter((product) => product.active);
      setBusinessName(access.business.name);
      setRole(access.role);
      setProducts(activeProducts);
      setCampaigns(currentCampaigns);
      setRules(currentRules);
      setEventSummary(currentSummary);
      setCampaignProduct((previous) => previous || activeProducts[0]?.id || "");
      setTriggerProduct((previous) => previous || activeProducts[0]?.id || "");
      setRewardProduct((previous) => previous || activeProducts[0]?.id || "");
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido preparar las herramientas de fidelización."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [businessId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => ({
    activeCampaigns: campaigns.filter((campaign) => campaign.state === "active").length,
    claims: campaigns.reduce((sum, campaign) => sum + campaign.claims, 0),
    activeRules: rules.filter((rule) => rule.active).length,
    rewards: rules.reduce((sum, rule) => sum + rule.rewards_issued, 0),
  }), [campaigns, rules]);

  const submitCampaign = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || !campaignProduct || busy) return;
    const maxClaims = campaignMax.trim() ? Number(campaignMax) : null;
    if (maxClaims !== null && (!Number.isInteger(maxClaims) || maxClaims < 1 || maxClaims > 100000)) {
      setError("El límite de reclamaciones debe ser un entero entre 1 y 100.000.");
      return;
    }
    const end = campaignEnds ? new Date(campaignEnds) : null;
    if (end && end <= new Date()) {
      setError("La fecha de fin debe estar en el futuro.");
      return;
    }

    setBusy("campaign-create");
    setError(null);
    setSuccess(null);
    try {
      await createCampaign({ businessId, productId: campaignProduct, name: campaignName, message: campaignMessage, endsAt: end?.toISOString() ?? null, maxClaims });
      setSuccess("Campaña creada. El enlace ya se puede compartir con clientes.");
      await load();
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo crear la campaña."));
    } finally { setBusy(null); }
  };

  const submitRule = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || !rewardProduct || busy) return;
    const threshold = Number(triggerValue.replace(",", "."));
    const maxRewards = ruleMax.trim() ? Number(ruleMax) : null;
    const countTrigger = triggerType !== "spend_total";
    if (!Number.isFinite(threshold) || threshold <= 0 || (countTrigger && !Number.isInteger(threshold))) {
      setError(triggerType === "spend_total" ? "Introduce un importe válido." : "El umbral debe ser un número entero positivo.");
      return;
    }
    if (triggerType === "spend_total" && threshold < 1) {
      setError("El gasto mínimo para una regla es 1 €.");
      return;
    }
    if (triggerType === "product_redemption_count" && !triggerProduct) {
      setError("Selecciona el producto cuyos consumos cuentan para la regla.");
      return;
    }
    if (maxRewards !== null && (!Number.isInteger(maxRewards) || maxRewards < 1 || maxRewards > 100)) {
      setError("El máximo de premios debe ser un entero entre 1 y 100.");
      return;
    }

    setBusy("rule-create");
    setError(null);
    setSuccess(null);
    try {
      await createAutomationRule({ businessId, name: ruleName, triggerType, thresholdValue: threshold, triggerProductId: triggerType === "product_redemption_count" ? triggerProduct : null, rewardProductId: rewardProduct, repeatable, maxRewards });
      setSuccess("Automatización activada. Bonoa llevará la cuenta y entregará el premio al alcanzar el objetivo.");
      await load();
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo crear la automatización."));
    } finally { setBusy(null); }
  };

  const toggleCampaign = async (campaign: LoyaltyCampaign) => {
    if (!canManage || busy) return;
    setBusy(`campaign:${campaign.campaign_id}`);
    setError(null);
    try { await setCampaignActive(campaign.campaign_id, !campaign.active); await load(); }
    catch (cause) { setError(friendlyError(cause, "No se pudo actualizar la campaña.")); }
    finally { setBusy(null); }
  };

  const toggleRule = async (rule: AutomationRule) => {
    if (!canManage || busy) return;
    setBusy(`rule:${rule.rule_id}`);
    setError(null);
    try { await setAutomationRuleActive(rule.rule_id, !rule.active); await load(); }
    catch (cause) { setError(friendlyError(cause, "No se pudo actualizar la automatización.")); }
    finally { setBusy(null); }
  };

  const copyCampaign = async (campaign: LoyaltyCampaign) => {
    const url = campaignUrl(campaign.share_code);
    try { await navigator.clipboard.writeText(url); setSuccess("Enlace copiado. Puedes enviarlo por WhatsApp, Instagram o email."); }
    catch { window.prompt("Copia este enlace", url); }
  };

  const rulePreviewValue = Number(triggerValue.replace(",", ".")) || 0;

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4"><div className="flex items-center gap-3"><Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{businessName || "Bonoa Business"}</p><h1 className="mt-1 text-2xl font-black text-white">Fidelización</h1></div></div><Link href={`/business/${businessId}/engage`} className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2.5 text-xs font-black text-orange-200"><MdLocalActivity size={18} /> Registrar compra / visita</Link></header>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-orange-400/15 bg-orange-400/[0.045] p-5 sm:p-7"><div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Motor de fidelización</p><h2 className="mt-2 max-w-2xl text-3xl font-black tracking-tight text-white">Tú decides qué significa ser fiel. Bonoa lleva la cuenta.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Premia compras, visitas, gasto acumulado o consumos concretos. El cliente solo enseña su QR y el equipo registra la actividad.</p></div><Link href={`/business/${businessId}/customers`} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-black text-zinc-200"><MdGroups size={18} /> Ver radar de clientes</Link></div></section>

      {error ? <p className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</p> : null}
      {success ? <p className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs leading-5 text-emerald-200"><MdCheckCircle className="mt-0.5 shrink-0" size={16} />{success}</p> : null}

      {loading ? <div className="mt-7 h-72 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /> : <>
        <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdShoppingBag className="text-emerald-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Compras · 30 días</p><p className="mt-2 text-3xl font-black text-white">{eventSummary.purchases_30d}</p><p className="mt-1 text-[10px] text-zinc-600">{(eventSummary.spend_30d_cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" })} identificados</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdLocalActivity className="text-sky-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Visitas · 30 días</p><p className="mt-2 text-3xl font-black text-white">{eventSummary.visits_30d}</p><p className="mt-1 text-[10px] text-zinc-600">No requieren importe ni bono.</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdAutoAwesome className="text-amber-200" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Automatizaciones</p><p className="mt-2 text-3xl font-black text-white">{totals.activeRules}</p><p className="mt-1 text-[10px] text-zinc-600">{totals.rewards} premios históricos.</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdCampaign className="text-orange-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Campañas activas</p><p className="mt-2 text-3xl font-black text-white">{totals.activeCampaigns}</p><p className="mt-1 text-[10px] text-zinc-600">{totals.claims} reclamaciones.</p></article>
        </section>

        {!products.length ? <section className="mt-6 rounded-[1.7rem] border border-dashed border-white/10 p-8 text-center"><p className="text-sm font-black text-white">Primero crea una recompensa</p><p className="mt-2 text-xs text-zinc-600">Una automatización necesita saber qué producto/regalo entregar cuando se cumpla la condición.</p><Link href={`/business/${businessId}/catalog`} className="mt-4 inline-flex rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2.5 text-xs font-bold text-orange-200">Ir al catálogo</Link></section> : <>
          {canManage ? <section className="mt-7 grid gap-5 xl:grid-cols-2">
            <form onSubmit={submitRule} className="bonoa-card rounded-[1.7rem] p-5 sm:p-6">
              <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] text-amber-200"><MdAutoAwesome size={21} /></div><div><p className="text-sm font-black text-white">Recompensa automática</p><p className="mt-1 text-[10px] text-zinc-600">Ej.: cada 5 compras → un regalo.</p></div></div>
              <div className="mt-5 space-y-3">
                <label className="block text-xs font-bold text-zinc-400">Nombre<input required minLength={2} maxLength={120} value={ruleName} onChange={(event) => setRuleName(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
                <div className="grid gap-3 sm:grid-cols-[1.3fr_.7fr]"><label className="block text-xs font-bold text-zinc-400">Cuando…<select value={triggerType} onChange={(event) => setTriggerType(event.target.value as AutomationTrigger)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none"><option value="purchase_count">Complete X compras</option><option value="visit_count">Complete X visitas</option><option value="spend_total">Acumule X € de gasto</option><option value="product_redemption_count">Consuma X veces un producto</option></select></label><label className="block text-xs font-bold text-zinc-400">Objetivo<input required inputMode="decimal" value={triggerValue} onChange={(event) => setTriggerValue(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label></div>
                {triggerType === "product_redemption_count" ? <label className="block text-xs font-bold text-zinc-400">Producto que cuenta<select required value={triggerProduct} onChange={(event) => setTriggerProduct(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label> : null}
                <label className="block text-xs font-bold text-zinc-400">Entonces regalar…<select required value={rewardProduct} onChange={(event) => setRewardProduct(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                <div className="rounded-2xl border border-orange-400/12 bg-orange-400/[0.035] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-300">Vista previa</p><p className="mt-2 text-sm font-black text-white">{automationTriggerLabel(triggerType, triggerType === "spend_total" ? Math.round(rulePreviewValue * 100) : Math.round(rulePreviewValue), products.find((p) => p.id === triggerProduct)?.name)} → {products.find((p) => p.id === rewardProduct)?.name || "recompensa"}</p></div>
                <div className="grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-xs font-bold text-zinc-400"><input type="checkbox" checked={repeatable} onChange={(event) => setRepeatable(event.target.checked)} className="h-4 w-4" /> Repetir cada vez</label><label className="block text-xs font-bold text-zinc-400">Máx. premios / cliente<input inputMode="numeric" value={ruleMax} onChange={(event) => setRuleMax(event.target.value)} placeholder="Sin límite" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label></div>
              </div>
              <button disabled={Boolean(busy)} className="brand-gradient mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-40"><MdRedeem size={18} /> {busy === "rule-create" ? "Activando…" : "Activar recompensa"}</button>
            </form>

            <form onSubmit={submitCampaign} className="bonoa-card rounded-[1.7rem] p-5 sm:p-6">
              <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdCampaign size={21} /></div><div><p className="text-sm font-black text-white">Campaña compartible</p><p className="mt-1 text-[10px] text-zinc-600">Un enlace, una recompensa por wallet.</p></div></div>
              <div className="mt-5 space-y-3"><label className="block text-xs font-bold text-zinc-400">Nombre<input required minLength={2} maxLength={120} value={campaignName} onChange={(event) => setCampaignName(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label><label className="block text-xs font-bold text-zinc-400">Mensaje<textarea maxLength={500} value={campaignMessage} onChange={(event) => setCampaignMessage(event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label><label className="block text-xs font-bold text-zinc-400">Regalo<select required value={campaignProduct} onChange={(event) => setCampaignProduct(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold text-zinc-400">Finaliza<input type="datetime-local" value={campaignEnds} onChange={(event) => setCampaignEnds(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label><label className="block text-xs font-bold text-zinc-400">Máx. reclamaciones<input inputMode="numeric" value={campaignMax} onChange={(event) => setCampaignMax(event.target.value)} placeholder="Sin límite" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label></div></div>
              <button disabled={Boolean(busy)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-5 py-3 text-xs font-black text-orange-100 disabled:opacity-40"><MdShare size={18} /> {busy === "campaign-create" ? "Creando…" : "Crear campaña"}</button>
            </form>
          </section> : null}

          <section className="mt-8"><div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">Automatizaciones</p><h2 className="mt-1 text-xl font-black text-white">Reglas que trabajan solas</h2></div>{rules.length ? <div className="grid gap-3 lg:grid-cols-2">{rules.map((rule) => <article key={rule.rule_id} className={`bonoa-card rounded-[1.5rem] p-5 ${rule.active ? "" : "opacity-60"}`}><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-black text-white">{rule.rule_name}</p><p className="mt-2 text-xs font-bold text-amber-100">{automationTriggerLabel(rule.trigger_type, rule.threshold_value, rule.trigger_product_name)} → {rule.reward_product_name}</p><p className="mt-2 text-[10px] leading-5 text-zinc-600">{rule.repeatable ? "Se repite al completar cada ciclo" : "Solo se entrega una vez"}{rule.max_rewards_per_wallet ? ` · máx. ${rule.max_rewards_per_wallet} por cliente` : ""}</p></div>{canManage ? <button type="button" onClick={() => void toggleRule(rule)} disabled={Boolean(busy)} className="shrink-0 text-zinc-400">{rule.active ? <MdPauseCircle size={22} /> : <MdPlayCircle size={22} />}</button> : null}</div><div className="mt-4 flex gap-4 border-t border-white/8 pt-4 text-[10px] text-zinc-500"><span><strong className="text-white">{rule.rewards_issued}</strong> premios</span><span><strong className="text-white">{rule.customers_rewarded}</strong> clientes premiados</span></div></article>)}</div> : <div className="rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center text-xs text-zinc-600">Aún no hay automatizaciones. Crea la primera arriba: por compras, visitas, gasto o consumos.</div>}</section>

          <section className="mt-8"><div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Campañas</p><h2 className="mt-1 text-xl font-black text-white">Enlaces para captar y recuperar clientes</h2></div>{campaigns.length ? <div className="grid gap-3 lg:grid-cols-2">{campaigns.map((campaign) => <article key={campaign.campaign_id} className="bonoa-card rounded-[1.5rem] p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-white">{campaign.campaign_name}</p><p className="mt-1 text-xs text-zinc-500">Regala {campaign.product_name} · {campaign.claims}{campaign.max_claims ? `/${campaign.max_claims}` : ""} reclamaciones</p></div><span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-bold uppercase text-zinc-400">{stateLabels[campaign.state]}</span></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void copyCampaign(campaign)} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold text-zinc-300"><MdContentCopy size={15} /> Copiar enlace</button>{canManage ? <button type="button" onClick={() => void toggleCampaign(campaign)} disabled={Boolean(busy)} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold text-zinc-400">{campaign.active ? <MdPauseCircle size={15} /> : <MdPlayCircle size={15} />}{campaign.active ? "Pausar" : "Activar"}</button> : null}</div></article>)}</div> : <div className="rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center text-xs text-zinc-600">No hay campañas todavía.</div>}</section>
        </>}
      </>}
    </main>
  );
}

export default function BusinessGrowthPage() {
  return <AuthGuard><GrowthContent /></AuthGuard>;
}
