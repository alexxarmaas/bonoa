"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FaInstagram } from "react-icons/fa";
import {
  MdAccessTime,
  MdArrowForward,
  MdCheckCircle,
  MdContentCopy,
  MdLanguage,
  MdLocationOn,
  MdLogin,
  MdPhone,
  MdQrCode2,
  MdRedeem,
  MdShare,
  MdStorefront,
  MdWorkspacePremium,
} from "react-icons/md";
import { useAuth } from "@/components/auth/AuthProvider";
import BonoaLogo from "@/components/brand/BonoaLogo";
import { friendlyError } from "@/lib/errors";
import { getPublicBusinessProgram, joinPublicBusiness, type PublicProgramRule } from "@/lib/commerce-v2";
import { formatMoney, getPublicBusinessBySlug, type PilotBusiness, type PilotProduct } from "@/lib/pilot-data";

type CatalogState = { business: PilotBusiness; products: PilotProduct[] };

function ruleLabel(rule: PublicProgramRule) {
  const threshold = rule.threshold_value ?? 0;
  const minimum = rule.minimum_purchase_cents ?? 0;
  if (rule.trigger_type === "purchase_count") {
    return `Compra ${threshold} ${threshold === 1 ? "vez" : "veces"}${minimum > 0 ? ` por ${formatMoney(minimum)} o más` : ""}`;
  }
  if (rule.trigger_type === "visit_count") return `Visita ${threshold} ${threshold === 1 ? "vez" : "veces"}`;
  if (rule.trigger_type === "spend_total") return `Acumula ${formatMoney(threshold)}`;
  if (rule.trigger_type === "product_redemption_count") return `Completa ${threshold} ${threshold === 1 ? "consumo" : "consumos"}`;
  return rule.rule_name || "Sigue sumando en este negocio";
}

export default function PublicBusinessCatalogPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { user, loading: authLoading } = useAuth();
  const [catalog, setCatalog] = useState<CatalogState | null>(null);
  const [program, setProgram] = useState<PublicProgramRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const autoJoinAttempted = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([getPublicBusinessBySlug(slug), getPublicBusinessProgram(slug).catch(() => [])])
      .then(([catalogValue, programValue]) => {
        if (!active) return;
        if (!catalogValue) {
          setMissing(true);
          return;
        }
        setCatalog(catalogValue);
        setProgram(programValue);
      })
      .catch(() => { if (active) setMissing(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const phoneHref = useMemo(() => catalog?.business.phone ? `tel:${catalog.business.phone.replace(/[^+\d]/g, "")}` : null, [catalog]);
  const rules = useMemo(() => program.filter((item) => item.rule_id), [program]);
  const club = program[0] ?? null;

  const join = useCallback(async () => {
    if (!user || joining || joined) return;
    setJoining(true);
    setJoinError(null);
    try {
      await joinPublicBusiness(slug);
      setJoined(true);
    } catch (cause) {
      setJoinError(friendlyError(cause, "No hemos podido añadir este carnet a tu wallet."));
    } finally {
      setJoining(false);
    }
  }, [joined, joining, slug, user]);

  useEffect(() => {
    if (!user || loading || autoJoinAttempted.current || typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("join") !== "1") return;
    autoJoinAttempted.current = true;
    void join();
  }, [join, loading, user]);

  const share = async () => {
    if (!catalog) return;
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${catalog.business.name} · Bonoa`, text: `Únete a ${club?.club_name || `Club ${catalog.business.name}`} en Bonoa.`, url });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (loading) return <main className="bonoa-shell min-h-screen"><div className="mt-8 h-[32rem] animate-pulse rounded-[2.5rem] border border-[#dbe7f5] bg-white" /></main>;

  if (missing || !catalog) {
    return <main className="bonoa-shell grid min-h-screen place-items-center py-20"><div className="max-w-md text-center"><MdStorefront size={44} className="mx-auto text-[#94a3b8]" /><h1 className="mt-5 text-2xl font-black text-[#0f172a]">Este escaparate no está disponible</h1><p className="mt-3 text-sm leading-6 text-[#64748b]">Puede que el negocio esté inactivo o que el enlace haya cambiado.</p><Link href="/" className="mt-6 inline-flex rounded-full border border-[#dbe7f5] bg-white px-5 py-3 text-xs font-bold text-[#334155]">Ir a Bonoa</Link></div></main>;
  }

  const { business, products } = catalog;
  const accent = business.accent_color || "#2563eb";
  const clubName = club?.club_name?.trim() || `Club ${business.name}`;
  const clubMessage = club?.club_message?.trim() || "Tu relación con este negocio, siempre contigo. Suma progreso y recibe premios sin tarjetas de papel.";
  const joinReturnPath = `/c/${slug}?join=1`;

  return (
    <main className="min-h-screen pb-24">
      <section className="border-b border-[#dbe7f5] bg-white">
        <div className="bonoa-shell py-7 sm:py-10">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" aria-label="Bonoa, inicio"><BonoaLogo /></Link>
            <button type="button" onClick={() => void share()} className="inline-flex items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-4 py-2.5 text-xs font-bold text-[#475569] shadow-sm"><MdShare size={17} /> {copied ? "Copiado" : "Compartir"}</button>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-[1.8rem] border bg-white shadow-[0_16px_45px_rgba(15,23,42,.08)]" style={{ borderColor: `${accent}45` }}>
                {business.logo_url ? <img src={business.logo_url} alt={`Logo de ${business.name}`} className="h-full w-full object-contain p-2" /> : <MdStorefront size={38} style={{ color: accent }} />}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: accent }}>Club digital en Bonoa</p>
                <h1 className="mt-2 text-4xl font-black tracking-[-.04em] text-[#0f172a] sm:text-5xl">{business.name}</h1>
                {business.description ? <p className="mt-3 max-w-2xl text-sm leading-6 text-[#64748b]">{business.description}</p> : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:max-w-sm lg:justify-end">
              {phoneHref ? <a href={phoneHref} className="inline-flex items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-4 py-2.5 text-xs font-bold text-[#475569]"><MdPhone size={16} /> Llamar</a> : null}
              {business.website_url ? <a href={business.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-4 py-2.5 text-xs font-bold text-[#475569]"><MdLanguage size={16} /> Web</a> : null}
              {business.instagram_url ? <a href={business.instagram_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-4 py-2.5 text-xs font-bold text-[#475569]"><FaInstagram size={16} /> Instagram</a> : null}
            </div>
          </div>

          {business.address ? <div className="mt-6 flex items-center gap-2 text-xs text-[#64748b]"><MdLocationOn size={17} style={{ color: accent }} /> {business.address}</div> : null}
        </div>
      </section>

      <section className="bonoa-shell pt-8">
        <div className="relative overflow-hidden rounded-[2.2rem] border bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,.08)] sm:p-8" style={{ borderColor: `${accent}35` }}>
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full opacity-15 blur-3xl" style={{ background: accent }} />
          <div className="relative grid gap-8 lg:grid-cols-[1fr_.8fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em]" style={{ borderColor: `${accent}35`, color: accent }}><MdWorkspacePremium size={16} /> {club?.membership_badge_label || "MIEMBRO"}</div>
              <h2 className="mt-4 text-3xl font-black tracking-[-.035em] text-[#0f172a] sm:text-4xl">{clubName}</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-[#64748b]">{clubMessage}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                {joined ? (
                  <Link href="/wallet" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white" style={{ background: accent }}><MdCheckCircle size={18} /> Carnet añadido · Abrir wallet</Link>
                ) : user ? (
                  <button type="button" onClick={() => void join()} disabled={joining || authLoading} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-60" style={{ background: accent }}><MdQrCode2 size={18} /> {joining ? "Añadiendo carnet…" : "Añadir mi carnet"}</button>
                ) : (
                  <>
                    <Link href={`/register?next=${encodeURIComponent(joinReturnPath)}`} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white" style={{ background: accent }}><MdWorkspacePremium size={18} /> Crear cuenta y unirme</Link>
                    <Link href={`/login?next=${encodeURIComponent(joinReturnPath)}`} className="inline-flex items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-5 py-3 text-xs font-black text-[#334155]"><MdLogin size={17} /> Ya tengo cuenta</Link>
                  </>
                )}
              </div>
              {joinError ? <p className="mt-3 text-xs font-semibold text-red-600">{joinError}</p> : null}
            </div>

            <div className="rounded-[1.8rem] border border-[#e2e8f0] bg-[#f8fbff] p-5">
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#64748b]">Cómo ganas aquí</p>
              {rules.length ? <div className="mt-4 space-y-3">{rules.slice(0, 3).map((rule) => (
                <div key={rule.rule_id} className="rounded-2xl border border-[#dbe7f5] bg-white p-4 shadow-sm">
                  <p className="text-sm font-black text-[#0f172a]">{ruleLabel(rule)}</p>
                  <div className="mt-2 flex items-center gap-2 text-xs font-bold" style={{ color: accent }}><MdRedeem size={17} /> {rule.reward_product_name || "Premio Bonoa"}</div>
                </div>
              ))}</div> : <p className="mt-3 text-sm leading-6 text-[#64748b]">El negocio está preparando su primera regla de fidelización. Puedes añadir el carnet igualmente y tenerlo listo en tu wallet.</p>}
              <p className="mt-4 text-[10px] leading-5 text-[#94a3b8]">El carnet es permanente. Cuando alcanzas un objetivo, el premio aparece aparte para consumirlo.</p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: accent }}>Bonos y ventajas</p><h2 className="mt-1 text-2xl font-black text-[#0f172a]">Más formas de aprovechar tu visita</h2></div>
          <span className="text-xs text-[#94a3b8]">{products.length} {products.length === 1 ? "bono público" : "bonos públicos"}</span>
        </div>

        {products.length ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{products.map((product) => (
          <article key={product.id} className="relative overflow-hidden rounded-[2rem] border border-[#dbe7f5] bg-white p-6 shadow-[0_16px_45px_rgba(15,23,42,.055)]">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: accent }} />
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#94a3b8]">{product.type === "uses" ? "Bono por usos" : "Bono de saldo"}</p><h3 className="mt-2 text-xl font-black text-[#0f172a]">{product.name}</h3></div><span className="rounded-full border px-3 py-1.5 text-xs font-black" style={{ borderColor: `${accent}35`, color: accent }}>{formatMoney(product.sale_price_cents, product.currency)}</span></div>
            {product.description ? <p className="mt-4 text-xs leading-5 text-[#64748b]">{product.description}</p> : null}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fbff] p-4"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]">Incluye</p><p className="mt-1 text-lg font-black text-[#0f172a]">{product.initial_units} {product.type === "uses" ? "usos" : "€"}</p></div>
              <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fbff] p-4"><p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#94a3b8]"><MdAccessTime size={13} /> Validez</p><p className="mt-1 text-lg font-black text-[#0f172a]">{product.validity_days ? `${product.validity_days} días` : "Sin límite"}</p></div>
            </div>
            <p className="mt-5 text-[11px] leading-5 text-[#94a3b8]">Solicítalo en el establecimiento. El negocio lo activa directamente en tu wallet Bonoa.</p>
          </article>
        ))}</div> : <div className="mt-6 rounded-[2rem] border border-dashed border-[#cbd5e1] bg-white/60 p-10 text-center text-sm text-[#64748b]">Este negocio todavía no tiene bonos públicos activos. Su carnet de fidelización puede seguir funcionando igualmente.</div>}

        <div className="mt-8 rounded-[2rem] border border-[#dbe7f5] bg-white p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div><p className="text-sm font-black text-[#0f172a]">Todo queda en tu wallet Bonoa</p><p className="mt-1 text-xs leading-5 text-[#64748b]">Un único QR para identificarte en todos tus negocios, con progreso, bonos y premios en tiempo real.</p></div>
          <Link href={user ? "/wallet" : "/login?next=/wallet"} className="mt-4 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white sm:mt-0" style={{ background: accent }}>Abrir mi wallet <MdArrowForward size={17} /></Link>
        </div>

        <footer className="mt-8 flex items-center justify-center gap-2 text-[10px] text-[#94a3b8]"><MdContentCopy size={13} /> Club y escaparate gestionados con Bonoa</footer>
      </section>
    </main>
  );
}
