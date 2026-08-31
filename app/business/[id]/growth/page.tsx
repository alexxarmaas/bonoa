"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  MdArrowBack,
  MdAutoAwesome,
  MdCampaign,
  MdCheckCircle,
  MdContentCopy,
  MdGroups,
  MdLocalActivity,
  MdPauseCircle,
  MdPlayCircle,
  MdRedeem,
  MdShoppingBag,
} from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import { getPilotProducts, type PilotProduct } from "@/lib/pilot-data";
import {
  automationTriggerLabel,
  campaignSegmentLabel,
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
  type CampaignSegment,
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
  const { id: businessId } = useParams<{ id: string }>();
  const [businessName, setBusinessName] = useState("");
  const [role, setRole] = useState<"owner" | "manager" | "staff">("staff");
  const [products, setProducts] = useState<PilotProduct[]>([]);
  const [campaigns, setCampaigns] = useState<LoyaltyCampaign[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [summary, setSummary] = useState<LoyaltyEventSummary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [ruleName, setRuleName] = useState("10 compras = premio");
  const [triggerType, setTriggerType] = useState<AutomationTrigger>("purchase_count");
  const [triggerValue, setTriggerValue] = useState("10");
  const [minimumPurchase, setMinimumPurchase] = useState("50");
  const [triggerProduct, setTriggerProduct] = useState("");
  const [rewardProduct, setRewardProduct] = useState("");
  const [repeatable, setRepeatable] = useState(true);
  const [ruleMax, setRuleMax] = useState("");

  const [campaignName, setCampaignName] = useState("Vuelve y disfruta");
  const [campaignMessage, setCampaignMessage] = useState("Una recompensa para darte las gracias por confiar en nosotros.");
  const [campaignProduct, setCampaignProduct] = useState("");
  const [campaignSegment, setCampaignSegment] = useState<CampaignSegment>("all");
  const [campaignEnds, setCampaignEnds] = useState("");
  const [campaignMax, setCampaignMax] = useState("50");

  const canManage = role === "owner" || role === "manager";

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const access = await getBusinessAccess(businessId, user.id);
      if (!access) throw new Error("No tienes acceso a este negocio.");
      const [nextProducts, nextCampaigns, nextRules, nextSummary] = await Promise.all([
        getPilotProducts(businessId),
        getBusinessCampaigns(businessId),
        getBusinessAutomationRules(businessId),
        getLoyaltyEventSummary(businessId),
      ]);
      const activeProducts = nextProducts.filter((product) => product.active);
      setBusinessName(access.business.name);
      setRole(access.role);
      setProducts(activeProducts);
      setCampaigns(nextCampaigns);
      setRules(nextRules);
      setSummary(nextSummary);
      setRewardProduct((current) => current || activeProducts[0]?.id || "");
      setTriggerProduct((current) => current || activeProducts[0]?.id || "");
      setCampaignProduct((current) => current || activeProducts[0]?.id || "");
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido preparar la fidelización."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [businessId, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const totals = useMemo(() => ({
    activeRules: rules.filter((rule) => rule.active).length,
    rewards: rules.reduce((sum, rule) => sum + rule.rewards_issued, 0),
    activeCampaigns: campaigns.filter((campaign) => campaign.state === "active").length,
    claims: campaigns.reduce((sum, campaign) => sum + campaign.claims, 0),
  }), [rules, campaigns]);

  const thresholdPreview = Number(triggerValue.replace(",", ".")) || 0;
  const minPreview = Math.max(0, Math.round((Number(minimumPurchase.replace(",", ".")) || 0) * 100));

  const submitRule = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || !rewardProduct || busy) return;
    const threshold = Number(triggerValue.replace(",", "."));
    const minimum = Number(minimumPurchase.replace(",", "."));
    const maxRewards = ruleMax.trim() ? Number(ruleMax) : null;
    const countTrigger = triggerType !== "spend_total";

    if (!Number.isFinite(threshold) || threshold <= 0 || (countTrigger && !Number.isInteger(threshold))) {
      setError(triggerType === "spend_total" ? "Introduce un objetivo de gasto válido." : "El objetivo debe ser un entero positivo.");
      return;
    }
    if (["purchase_count", "spend_total"].includes(triggerType) && (!Number.isFinite(minimum) || minimum < 0)) {
      setError("La compra mínima no puede ser negativa.");
      return;
    }
    if (triggerType === "product_redemption_count" && !triggerProduct) {
      setError("Selecciona el producto cuyos consumos cuentan.");
      return;
    }
    if (maxRewards !== null && (!Number.isInteger(maxRewards) || maxRewards < 1 || maxRewards > 100)) {
      setError("El máximo de premios debe estar entre 1 y 100.");
      return;
    }

    setBusy("rule-create");
    setError(null);
    setSuccess(null);
    try {
      await createAutomationRule({
        businessId,
        name: ruleName,
        triggerType,
        thresholdValue: threshold,
        minimumPurchaseAmount: ["purchase_count", "spend_total"].includes(triggerType) ? minimum : 0,
        triggerProductId: triggerType === "product_redemption_count" ? triggerProduct : null,
        rewardProductId: rewardProduct,
        repeatable,
        maxRewards,
      });
      setSuccess("Objetivo activado. Aparecerá dentro del carnet permanente y el premio se generará al completarlo.");
      await load();
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo crear el objetivo."));
    } finally {
      setBusy(null);
    }
  };

  const submitCampaign = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || !campaignProduct || busy) return;
    const maxClaims = campaignMax.trim() ? Number(campaignMax) : null;
    const end = campaignEnds ? new Date(campaignEnds) : null;
    if (maxClaims !== null && (!Number.isInteger(maxClaims) || maxClaims < 1 || maxClaims > 100000)) {
      setError("El límite debe estar entre 1 y 100.000.");
      return;
    }
    if (end && end <= new Date()) {
      setError("La fecha de fin debe estar en el futuro.");
      return;
    }

    setBusy("campaign-create");
    setError(null);
    setSuccess(null);
    try {
      await createCampaign({
        businessId,
        productId: campaignProduct,
        name: campaignName,
        message: campaignMessage,
        endsAt: end?.toISOString() ?? null,
        maxClaims,
        targetSegment: campaignSegment,
      });
      setSuccess(`Campaña creada para ${campaignSegmentLabel(campaignSegment).toLowerCase()}.`);
      await load();
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo crear la campaña."));
    } finally {
      setBusy(null);
    }
  };

  const toggleRule = async (rule: AutomationRule) => {
    if (!canManage || busy) return;
    setBusy(`rule:${rule.rule_id}`);
    try { await setAutomationRuleActive(rule.rule_id, !rule.active); await load(); }
    catch (cause) { setError(friendlyError(cause, "No se pudo actualizar el objetivo.")); }
    finally { setBusy(null); }
  };

  const toggleCampaign = async (campaign: LoyaltyCampaign) => {
    if (!canManage || busy) return;
    setBusy(`campaign:${campaign.campaign_id}`);
    try { await setCampaignActive(campaign.campaign_id, !campaign.active); await load(); }
    catch (cause) { setError(friendlyError(cause, "No se pudo actualizar la campaña.")); }
    finally { setBusy(null); }
  };

  const copyCampaign = async (campaign: LoyaltyCampaign) => {
    const url = campaignUrl(campaign.share_code);
    try {
      await navigator.clipboard.writeText(url);
      setSuccess("Enlace copiado.");
    } catch {
      window.prompt("Copia este enlace", url);
    }
  };

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{businessName || "Bonoa Business"}</p><h1 className="mt-1 text-2xl font-black text-white">Fidelización</h1></div>
        </div>
        <Link href={`/business/${businessId}/engage`} className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2.5 text-xs font-black text-orange-200"><MdLocalActivity size={18} /> Registrar compra / visita</Link>
      </header>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-orange-400/15 bg-orange-400/[0.045] p-5 sm:p-7">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Carnet permanente + premios</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-white">El carnet suma. El premio se consume.</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">Cada cliente conserva un carnet fijo de tu negocio. Puedes definir objetivos como “10 compras de al menos 50 €” y Bonoa solo suma las compras que cumplen la condición. Al completar el objetivo, el premio aparece como bono independiente.</p>
      </section>

      {error ? <p className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</p> : null}
      {success ? <p className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs leading-5 text-emerald-200"><MdCheckCircle className="mt-0.5 shrink-0" size={16} />{success}</p> : null}

      {loading ? <div className="mt-7 h-72 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /> : <>
        <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdShoppingBag className="text-emerald-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Compras · 30 días</p><p className="mt-2 text-3xl font-black text-white">{summary.purchases_30d}</p><p className="mt-1 text-[10px] text-zinc-600">{(summary.spend_30d_cents / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdLocalActivity className="text-sky-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Visitas · 30 días</p><p className="mt-2 text-3xl font-black text-white">{summary.visits_30d}</p><p className="mt-1 text-[10px] text-zinc-600">compras incluidas</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdAutoAwesome className="text-amber-200" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Objetivos activos</p><p className="mt-2 text-3xl font-black text-white">{totals.activeRules}</p><p className="mt-1 text-[10px] text-zinc-600">{totals.rewards} premios entregados</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdCampaign className="text-orange-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Campañas activas</p><p className="mt-2 text-3xl font-black text-white">{totals.activeCampaigns}</p><p className="mt-1 text-[10px] text-zinc-600">{totals.claims} reclamaciones</p></article>
        </section>

        {!products.length ? <section className="mt-6 rounded-[1.7rem] border border-dashed border-white/10 p-8 text-center"><p className="text-sm font-black text-white">Primero crea un premio</p><p className="mt-2 text-xs text-zinc-600">Los objetivos y campañas entregan un producto de tu catálogo como recompensa.</p><Link href={`/business/${businessId}/catalog`} className="mt-4 inline-flex rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2.5 text-xs font-bold text-orange-200">Ir al catálogo</Link></section> : <>
          {canManage ? <section className="mt-7 grid gap-5 xl:grid-cols-2">
            <form onSubmit={submitRule} className="bonoa-card rounded-[1.7rem] p-5 sm:p-6">
              <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] text-amber-200"><MdAutoAwesome size={21} /></div><div><p className="text-sm font-black text-white">Objetivo del carnet</p><p className="mt-1 text-[10px] text-zinc-600">Se muestra como progreso permanente al cliente.</p></div></div>

              <label className="mt-5 block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">Nombre</label>
              <input value={ruleName} onChange={(e) => setRuleName(e.target.value)} maxLength={120} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div><label className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">Qué suma</label><select value={triggerType} onChange={(e) => setTriggerType(e.target.value as AutomationTrigger)} className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"><option value="purchase_count">Número de compras</option><option value="visit_count">Visitas</option><option value="spend_total">Gasto acumulado</option><option value="product_redemption_count">Consumos de un producto</option></select></div>
                <div><label className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">Objetivo</label><input type="number" min="1" step={triggerType === "spend_total" ? "0.01" : "1"} value={triggerValue} onChange={(e) => setTriggerValue(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white" /></div>
              </div>

              {["purchase_count", "spend_total"].includes(triggerType) ? <div className="mt-4"><label className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">Compra mínima para contar · €</label><input type="number" min="0" step="0.01" value={minimumPurchase} onChange={(e) => setMinimumPurchase(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white" /><p className="mt-2 text-[10px] text-zinc-600">Pon 0 si cualquier compra debe sumar.</p></div> : null}

              {triggerType === "product_redemption_count" ? <div className="mt-4"><label className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">Producto que suma</label><select value={triggerProduct} onChange={(e) => setTriggerProduct(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div> : null}

              <div className="mt-4"><label className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">Premio al completar</label><select value={rewardProduct} onChange={(e) => setRewardProduct(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div>

              <div className="mt-4 rounded-2xl border border-orange-400/12 bg-orange-400/[0.04] p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-300">Vista previa</p><p className="mt-2 text-sm font-black text-white">{automationTriggerLabel(triggerType, triggerType === "spend_total" ? Math.round(thresholdPreview * 100) : Math.round(thresholdPreview), products.find((product) => product.id === triggerProduct)?.name, minPreview)}</p><p className="mt-1 text-xs text-zinc-500">→ {products.find((product) => product.id === rewardProduct)?.name || "Premio"}</p></div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="flex items-center gap-3 rounded-2xl border border-white/8 p-3 text-xs text-zinc-300"><input type="checkbox" checked={repeatable} onChange={(e) => setRepeatable(e.target.checked)} /> Repetir al completar</label><input type="number" min="1" max="100" placeholder="Máx. premios · opcional" value={ruleMax} onChange={(e) => setRuleMax(e.target.value)} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white" /></div>

              <button disabled={Boolean(busy)} className="brand-gradient mt-5 w-full rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy === "rule-create" ? "Creando…" : "Activar objetivo"}</button>
            </form>

            <form onSubmit={submitCampaign} className="bonoa-card rounded-[1.7rem] p-5 sm:p-6">
              <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-300/15 bg-orange-300/[0.06] text-orange-200"><MdCampaign size={21} /></div><div><p className="text-sm font-black text-white">Campaña segmentada</p><p className="mt-1 text-[10px] text-zinc-600">El enlace solo se puede reclamar si el cliente pertenece al segmento.</p></div></div>

              <label className="mt-5 block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">Nombre</label><input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} maxLength={120} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white" />
              <label className="mt-4 block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">Mensaje</label><textarea value={campaignMessage} onChange={(e) => setCampaignMessage(e.target.value)} maxLength={500} rows={3} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white" />

              <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><label className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">Premio</label><select value={campaignProduct} onChange={(e) => setCampaignProduct(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white">{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></div><div><label className="text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">Quién puede reclamar</label><select value={campaignSegment} onChange={(e) => setCampaignSegment(e.target.value as CampaignSegment)} className="mt-2 w-full rounded-2xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white"><option value="all">Todos</option><option value="new">Clientes nuevos</option><option value="active">Clientes activos</option><option value="loyal">Clientes fieles</option><option value="at_risk">Clientes en riesgo</option></select></div></div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><input type="datetime-local" value={campaignEnds} onChange={(e) => setCampaignEnds(e.target.value)} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white" /><input type="number" min="1" max="100000" value={campaignMax} onChange={(e) => setCampaignMax(e.target.value)} placeholder="Máx. reclamaciones" className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white" /></div>
              <button disabled={Boolean(busy)} className="mt-5 w-full rounded-full border border-orange-400/20 bg-orange-400/10 px-5 py-3 text-xs font-black text-orange-200 disabled:opacity-40">{busy === "campaign-create" ? "Creando…" : "Crear campaña"}</button>
            </form>
          </section> : null}

          <section className="mt-8 grid gap-5 xl:grid-cols-2">
            <div><div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">Carnets</p><h2 className="mt-1 text-xl font-black text-white">Objetivos activos</h2></div><span className="text-xs text-zinc-600">{rules.length}</span></div><div className="space-y-3">{rules.length ? rules.map((rule) => <article key={rule.rule_id} className="bonoa-card rounded-[1.5rem] p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-black text-white">{rule.rule_name}</p><p className="mt-1 text-xs leading-5 text-zinc-500">{automationTriggerLabel(rule.trigger_type, rule.threshold_value, rule.trigger_product_name, rule.minimum_purchase_cents)} → <span className="text-zinc-300">{rule.reward_product_name}</span></p><p className="mt-2 text-[10px] text-zinc-600">{rule.customers_rewarded} clientes premiados · {rule.rewards_issued} premios</p></div><button type="button" disabled={!canManage || Boolean(busy)} onClick={() => void toggleRule(rule)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-300">{rule.active ? <MdPauseCircle size={19} /> : <MdPlayCircle size={19} />}</button></div></article>) : <p className="rounded-[1.5rem] border border-dashed border-white/10 p-5 text-xs text-zinc-600">No hay objetivos todavía.</p>}</div></div>

            <div><div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">Captación y retorno</p><h2 className="mt-1 text-xl font-black text-white">Campañas</h2></div><span className="text-xs text-zinc-600">{campaigns.length}</span></div><div className="space-y-3">{campaigns.length ? campaigns.map((campaign) => <article key={campaign.campaign_id} className="bonoa-card rounded-[1.5rem] p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black text-white">{campaign.campaign_name}</p><span className="rounded-full border border-white/8 px-2 py-1 text-[9px] font-black text-zinc-500">{campaignSegmentLabel(campaign.target_segment)}</span></div><p className="mt-1 text-xs text-zinc-500">{campaign.product_name} · {stateLabels[campaign.state]} · {campaign.claims} reclamaciones</p></div><div className="flex gap-2"><button type="button" onClick={() => void copyCampaign(campaign)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-300"><MdContentCopy size={17} /></button><button type="button" disabled={!canManage || Boolean(busy)} onClick={() => void toggleCampaign(campaign)} className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-zinc-300">{campaign.active ? <MdPauseCircle size={19} /> : <MdPlayCircle size={19} />}</button></div></div></article>) : <p className="rounded-[1.5rem] border border-dashed border-white/10 p-5 text-xs text-zinc-600">No hay campañas todavía.</p>}</div></div>
          </section>
        </>}

        <section className="mt-8 rounded-[1.7rem] border border-white/8 bg-white/[0.025] p-5"><div className="flex items-start gap-3"><MdRedeem className="mt-0.5 shrink-0 text-amber-200" size={20} /><div><p className="text-sm font-black text-white">Modelo Bonoa</p><p className="mt-2 text-xs leading-5 text-zinc-500">Carnet = relación permanente. Objetivo = progreso dentro del carnet. Premio = bono consumible. Campaña = incentivo compartible o segmentado. Todo usa el mismo QR del cliente.</p></div></div></section>
      </>}
    </main>
  );
}

export default function GrowthPage() {
  return <AuthGuard><GrowthContent /></AuthGuard>;
}
