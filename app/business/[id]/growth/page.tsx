"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdArrowBack, MdAutoAwesome, MdCampaign, MdCheckCircle, MdContentCopy, MdGroups, MdLink, MdPauseCircle, MdPlayCircle, MdRedeem, MdShare } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import { getPilotProducts, type PilotProduct } from "@/lib/pilot-data";
import { campaignUrl, createCampaign, createRewardRule, getBusinessCampaigns, getBusinessRewardRules, setCampaignActive, setRewardRuleActive, type LoyaltyCampaign, type RewardRule } from "@/lib/loyalty-growth";

const stateLabels: Record<LoyaltyCampaign["state"], string> = {
  active: "Activa",
  upcoming: "Programada",
  ended: "Finalizada",
  exhausted: "Agotada",
  disabled: "Pausada",
};

function GrowthContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [businessName, setBusinessName] = useState("");
  const [role, setRole] = useState<"owner" | "manager" | "staff">("staff");
  const [products, setProducts] = useState<PilotProduct[]>([]);
  const [campaigns, setCampaigns] = useState<LoyaltyCampaign[]>([]);
  const [rules, setRules] = useState<RewardRule[]>([]);
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
  const [triggerProduct, setTriggerProduct] = useState("");
  const [rewardProduct, setRewardProduct] = useState("");
  const [ruleEvery, setRuleEvery] = useState("5");
  const [ruleMax, setRuleMax] = useState("");

  const canManage = role === "owner" || role === "manager";

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const access = await getBusinessAccess(businessId, user.id);
      if (!access) throw new Error("No tienes acceso a este negocio.");
      const [currentProducts, currentCampaigns, currentRules] = await Promise.all([
        getPilotProducts(businessId),
        getBusinessCampaigns(businessId),
        getBusinessRewardRules(businessId),
      ]);
      const activeProducts = currentProducts.filter((product) => product.active);
      setBusinessName(access.business.name);
      setRole(access.role);
      setProducts(activeProducts);
      setCampaigns(currentCampaigns);
      setRules(currentRules);
      setCampaignProduct((previous) => previous || activeProducts[0]?.id || "");
      setTriggerProduct((previous) => previous || activeProducts[0]?.id || "");
      setRewardProduct((previous) => previous || activeProducts[0]?.id || "");
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido preparar las herramientas de fidelización."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [businessId, user]); // eslint-disable-line react-hooks/exhaustive-deps

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
      setSuccess("Campaña creada. Ya puedes copiar el enlace o compartirlo como QR desde cualquier herramienta.");
      await load();
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo crear la campaña."));
    } finally {
      setBusy(null);
    }
  };

  const submitRule = async (event: FormEvent) => {
    event.preventDefault();
    if (!canManage || !triggerProduct || !rewardProduct || busy) return;
    const every = Number(ruleEvery);
    const maxRewards = ruleMax.trim() ? Number(ruleMax) : null;
    if (!Number.isInteger(every) || every < 1 || every > 100) {
      setError("El número de consumos debe ser un entero entre 1 y 100.");
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
      await createRewardRule({ businessId, triggerProductId: triggerProduct, rewardProductId: rewardProduct, name: ruleName, every, maxRewards });
      setSuccess("Recompensa automática activada. Bonoa premiará al cliente justo cuando alcance el hito.");
      await load();
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo crear la recompensa automática."));
    } finally {
      setBusy(null);
    }
  };

  const toggleCampaign = async (campaign: LoyaltyCampaign) => {
    if (!canManage || busy) return;
    setBusy(`campaign:${campaign.campaign_id}`);
    setError(null);
    try {
      await setCampaignActive(campaign.campaign_id, !campaign.active);
      await load();
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo actualizar la campaña."));
    } finally { setBusy(null); }
  };

  const toggleRule = async (rule: RewardRule) => {
    if (!canManage || busy) return;
    setBusy(`rule:${rule.rule_id}`);
    setError(null);
    try {
      await setRewardRuleActive(rule.rule_id, !rule.active);
      await load();
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo actualizar la recompensa."));
    } finally { setBusy(null); }
  };

  const copyCampaign = async (campaign: LoyaltyCampaign) => {
    const url = campaignUrl(campaign.share_code);
    try {
      await navigator.clipboard.writeText(url);
      setSuccess("Enlace copiado. Puedes enviarlo por WhatsApp, Instagram, email o convertirlo en QR.");
    } catch {
      window.prompt("Copia este enlace", url);
    }
  };

  return (
    <main className="bonoa-shell min-h-screen pb-24">
      <header className="flex items-center gap-3"><Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300" aria-label="Volver"><MdArrowBack size={20} /></Link><div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{businessName || "Bonoa Business"}</p><h1 className="mt-1 text-2xl font-black text-white">Fidelización</h1></div></header>

      <section className="mt-6 overflow-hidden rounded-[2rem] border border-orange-400/15 bg-orange-400/[0.045] p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Growth engine</p><h2 className="mt-2 max-w-2xl text-3xl font-black tracking-tight text-white">Haz que volver tenga premio.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Crea promociones que se reclaman con un enlace y reglas que premian automáticamente la recurrencia. El equipo atiende al cliente; Bonoa se encarga de recordar quién se lo ha ganado.</p></div><Link href={`/business/${businessId}/customers`} className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-black text-zinc-200"><MdGroups size={18} /> Ver radar de clientes</Link></div>
      </section>

      {error ? <p className="mt-5 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</p> : null}
      {success ? <p className="mt-5 flex items-start gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs leading-5 text-emerald-200"><MdCheckCircle className="mt-0.5 shrink-0" size={16} />{success}</p> : null}

      {loading ? <div className="mt-7 h-72 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /> : <>
        <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdCampaign className="text-orange-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Campañas activas</p><p className="mt-2 text-3xl font-black text-white">{totals.activeCampaigns}</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdLink className="text-sky-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Reclamaciones</p><p className="mt-2 text-3xl font-black text-white">{totals.claims}</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdAutoAwesome className="text-amber-200" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Reglas activas</p><p className="mt-2 text-3xl font-black text-white">{totals.activeRules}</p></article>
          <article className="bonoa-card rounded-[1.5rem] p-5"><MdRedeem className="text-emerald-300" size={20} /><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-600">Premios entregados</p><p className="mt-2 text-3xl font-black text-white">{totals.rewards}</p></article>
        </section>

        {!products.length ? <section className="mt-6 rounded-[1.7rem] border border-dashed border-white/10 p-8 text-center"><p className="text-sm font-black text-white">Primero necesitas un producto activo</p><p className="mt-2 text-xs text-zinc-600">Las campañas y recompensas entregan bonos de tu catálogo.</p><Link href={`/business/${businessId}/catalog`} className="mt-4 inline-flex rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2.5 text-xs font-bold text-orange-200">Ir al catálogo</Link></section> : <>
          {canManage ? <section className="mt-7 grid gap-5 xl:grid-cols-2">
            <form onSubmit={submitCampaign} className="bonoa-card rounded-[1.7rem] p-5 sm:p-6">
              <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdCampaign size={21} /></div><div><p className="text-sm font-black text-white">Campaña compartible</p><p className="mt-1 text-[10px] text-zinc-600">Un enlace, una recompensa por wallet.</p></div></div>
              <div className="mt-5 space-y-3">
                <label className="block text-xs font-bold text-zinc-400">Nombre<input required minLength={2} maxLength={120} value={campaignName} onChange={(event) => setCampaignName(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
                <label className="block text-xs font-bold text-zinc-400">Mensaje<textarea maxLength={500} value={campaignMessage} onChange={(event) => setCampaignMessage(event.target.value)} rows={3} className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
                <label className="block text-xs font-bold text-zinc-400">Bono que recibirá<select required value={campaignProduct} onChange={(event) => setCampaignProduct(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"><option value="">Selecciona…</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold text-zinc-400">Finaliza (opcional)<input type="datetime-local" value={campaignEnds} onChange={(event) => setCampaignEnds(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label><label className="block text-xs font-bold text-zinc-400">Máx. reclamaciones<input inputMode="numeric" value={campaignMax} onChange={(event) => setCampaignMax(event.target.value)} placeholder="Sin límite" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label></div>
              </div>
              <button disabled={Boolean(busy)} className="brand-gradient mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-40"><MdShare size={18} /> {busy === "campaign-create" ? "Creando…" : "Crear campaña"}</button>
            </form>

            <form onSubmit={submitRule} className="bonoa-card rounded-[1.7rem] p-5 sm:p-6">
              <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-300/15 bg-amber-300/[0.06] text-amber-200"><MdAutoAwesome size={21} /></div><div><p className="text-sm font-black text-white">Recompensa automática</p><p className="mt-1 text-[10px] text-zinc-600">Premia recurrencia sin acordarte de hacerlo.</p></div></div>
              <div className="mt-5 space-y-3">
                <label className="block text-xs font-bold text-zinc-400">Nombre<input required minLength={2} maxLength={120} value={ruleName} onChange={(event) => setRuleName(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-amber-300/40" /></label>
                <label className="block text-xs font-bold text-zinc-400">Cuando consuma<select required value={triggerProduct} onChange={(event) => setTriggerProduct(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"><option value="">Selecciona…</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
                <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold text-zinc-400">Cada X consumos<input required min={1} max={100} type="number" value={ruleEvery} onChange={(event) => setRuleEvery(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label><label className="block text-xs font-bold text-zinc-400">Máx. premios/cliente<input min={1} max={100} type="number" value={ruleMax} onChange={(event) => setRuleMax(event.target.value)} placeholder="Sin límite" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none" /></label></div>
                <label className="block text-xs font-bold text-zinc-400">Regala<select required value={rewardProduct} onChange={(event) => setRewardProduct(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none"><option value="">Selecciona…</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
              </div>
              <div className="mt-4 rounded-2xl border border-amber-300/10 bg-amber-300/[0.035] p-4 text-[11px] leading-5 text-zinc-500">Ejemplo: <strong className="text-amber-100">cada 5 consumos del Bono Lavado, regalar Lavado Premium</strong>. El premio aparece automáticamente en la wallet al registrar el quinto consumo.</div>
              <button disabled={Boolean(busy)} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-5 py-3 text-xs font-black text-amber-100 disabled:opacity-40"><MdAutoAwesome size={18} /> {busy === "rule-create" ? "Activando…" : "Activar recompensa"}</button>
            </form>
          </section> : <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-xs text-zinc-500">Puedes consultar campañas y resultados. Solo propietarios y managers pueden crear o cambiar reglas de fidelización.</div>}

          <section className="mt-9 grid gap-7 xl:grid-cols-2">
            <div><div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Captación y retorno</p><h2 className="mt-1 text-xl font-black text-white">Campañas</h2></div>{campaigns.length ? <div className="space-y-3">{campaigns.map((campaign) => <article key={campaign.campaign_id} className="bonoa-card rounded-[1.5rem] p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black text-white">{campaign.campaign_name}</p><span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-400">{stateLabels[campaign.state]}</span></div><p className="mt-1 text-xs text-zinc-500">{campaign.product_name}</p></div><MdCampaign className="shrink-0 text-orange-300" size={20} /></div>{campaign.message ? <p className="mt-3 text-xs leading-5 text-zinc-500">{campaign.message}</p> : null}<div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[9px] uppercase tracking-[0.13em] text-zinc-600">Reclamados</p><p className="mt-1 text-lg font-black text-white">{campaign.claims}{campaign.max_claims ? ` / ${campaign.max_claims}` : ""}</p></div><div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[9px] uppercase tracking-[0.13em] text-zinc-600">Caduca</p><p className="mt-1 text-xs font-bold text-zinc-300">{campaign.ends_at ? new Date(campaign.ends_at).toLocaleDateString("es-ES") : "Sin fecha"}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void copyCampaign(campaign)} className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-2 text-[10px] font-bold text-orange-200"><MdContentCopy size={15} /> Copiar enlace</button><Link href={`/promo/${campaign.share_code}`} target="_blank" className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-bold text-zinc-300"><MdLink size={15} /> Ver campaña</Link>{canManage ? <button type="button" disabled={Boolean(busy)} onClick={() => void toggleCampaign(campaign)} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold text-zinc-400 disabled:opacity-40">{campaign.active ? <MdPauseCircle size={15} /> : <MdPlayCircle size={15} />}{campaign.active ? "Pausar" : "Activar"}</button> : null}</div></article>)}</div> : <div className="rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center text-xs text-zinc-600">Aún no has creado campañas.</div>}</div>

            <div><div className="mb-4"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">Recurrencia automática</p><h2 className="mt-1 text-xl font-black text-white">Reglas de recompensa</h2></div>{rules.length ? <div className="space-y-3">{rules.map((rule) => <article key={rule.rule_id} className="bonoa-card rounded-[1.5rem] p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-black text-white">{rule.rule_name}</p><span className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${rule.active ? "border-emerald-400/15 bg-emerald-400/8 text-emerald-200" : "border-white/10 bg-white/5 text-zinc-500"}`}>{rule.active ? "Activa" : "Pausada"}</span></div><p className="mt-2 text-xs leading-5 text-zinc-500">Cada <strong className="text-white">{rule.every_n_redemptions}</strong> consumos de <strong className="text-zinc-300">{rule.trigger_product_name}</strong> → <strong className="text-amber-100">{rule.reward_product_name}</strong>.</p></div><MdRedeem className="shrink-0 text-amber-200" size={20} /></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[9px] uppercase tracking-[0.13em] text-zinc-600">Premios emitidos</p><p className="mt-1 text-lg font-black text-white">{rule.rewards_issued}</p></div><div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[9px] uppercase tracking-[0.13em] text-zinc-600">Clientes premiados</p><p className="mt-1 text-lg font-black text-white">{rule.customers_rewarded}</p></div></div>{canManage ? <button type="button" disabled={Boolean(busy)} onClick={() => void toggleRule(rule)} className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold text-zinc-400 disabled:opacity-40">{rule.active ? <MdPauseCircle size={15} /> : <MdPlayCircle size={15} />}{rule.active ? "Pausar regla" : "Activar regla"}</button> : null}</article>)}</div> : <div className="rounded-[1.5rem] border border-dashed border-white/10 p-8 text-center text-xs text-zinc-600">Aún no hay recompensas automáticas.</div>}</div>
          </section>
        </>}
      </>}
    </main>
  );
}

export default function BusinessGrowthPage() {
  return <AuthGuard><GrowthContent /></AuthGuard>;
}
