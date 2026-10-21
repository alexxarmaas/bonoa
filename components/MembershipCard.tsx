import { MdCardMembership, MdEmojiEvents, MdShoppingBag, MdWorkspacePremium } from "react-icons/md";
import DigitalWalletButtons from "@/components/DigitalWalletButtons";
import ReferralShareButton from "@/components/ReferralShareButton";
import {
  membershipSegmentLabel,
  qualifiedPurchaseLabel,
  type MembershipRuleProgress,
  type WalletMembership,
} from "@/lib/membership-retention";

function metricLabel(rule: MembershipRuleProgress, value: number) {
  if (rule.trigger_type === "spend_total") return (value / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  if (rule.trigger_type === "purchase_count") return `${value} compra${value === 1 ? "" : "s"}`;
  if (rule.trigger_type === "visit_count") return `${value} visita${value === 1 ? "" : "s"}`;
  return `${value} consumo${value === 1 ? "" : "s"}`;
}

function RuleProgress({ rule, accent }: { rule: MembershipRuleProgress; accent: string }) {
  const threshold = Math.max(1, rule.threshold_value);
  const progress = Math.max(0, Math.min(threshold, rule.progress_value));
  const percent = Math.min(100, Math.round((progress / threshold) * 100));
  const qualified = qualifiedPurchaseLabel(rule.minimum_purchase_cents);
  const useStamps = rule.trigger_type !== "spend_total" && threshold <= 12;

  return (
    <div className="rounded-[1.35rem] border border-[#dbe7f5] bg-[#f8fbff] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#0f172a]">{rule.rule_name}</p>
          <p className="mt-1 text-[10px] leading-5 text-[#64748b]">{qualified ? `${qualified} · ` : ""}Premio: <span className="font-bold text-[#0f172a]">{rule.reward_product_name}</span></p>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border" style={{ borderColor: `${accent}35`, backgroundColor: `${accent}10`, color: accent }}><MdEmojiEvents size={18} /></div>
      </div>

      {useStamps ? (
        <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {Array.from({ length: threshold }).map((_, index) => {
            const filled = index < progress;
            return (
              <div
                key={index}
                className="grid aspect-square min-h-8 place-items-center rounded-xl border text-[10px] font-black"
                style={filled
                  ? { borderColor: `${accent}45`, backgroundColor: accent, color: "white" }
                  : { borderColor: "#dbe7f5", backgroundColor: "#ffffff", color: "#94a3b8" }}
              >
                {filled ? "✓" : index + 1}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#e8eef7]"><div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, background: `linear-gradient(90deg, ${accent}, #06b6d4)` }} /></div>
      )}

      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-lg font-black text-[#0f172a]">{metricLabel(rule, progress)} <span className="text-[#94a3b8]">/ {metricLabel(rule, threshold)}</span></p>
          <p className="mt-1 text-[10px] text-[#64748b]">{rule.completed ? "Objetivo completado" : rule.remaining_value <= 0 ? "Premio desbloqueado" : `Te faltan ${metricLabel(rule, rule.remaining_value)}`}</p>
        </div>
        {rule.rewards_earned > 0 ? <span className="shrink-0 rounded-full border border-[#bae6fd] bg-[#ecfeff] px-3 py-1.5 text-[10px] font-black text-[#0e7490]">{rule.rewards_earned} premio{rule.rewards_earned === 1 ? "" : "s"}</span> : null}
      </div>
    </div>
  );
}

export default function MembershipCard({ membership, rules }: { membership: WalletMembership; rules: MembershipRuleProgress[] }) {
  const accent = /^#[0-9a-fA-F]{6}$/.test(membership.business_accent_color || "") ? membership.business_accent_color : "#2563eb";
  const clubName = membership.club_name || `Club ${membership.business_name}`;
  const badge = membership.membership_badge_label || membershipSegmentLabel(membership.segment).toUpperCase();
  const coverUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/business-assets/${membership.business_id}/club-cover` : null;
  const primaryRule = rules.find((rule) => !rule.completed) ?? rules[0];
  const percent = primaryRule ? Math.min(100, Math.round((Math.max(0, primaryRule.progress_value) / Math.max(1, primaryRule.threshold_value)) * 100)) : 0;

  return (
    <article className="group overflow-hidden rounded-[2rem] border border-[#dbe7f5] bg-white shadow-[0_22px_55px_rgba(15,23,42,.1)] transition-shadow hover:shadow-[0_28px_70px_rgba(15,23,42,.16)]">
      <div className="relative isolate flex min-h-[255px] flex-col justify-between overflow-hidden rounded-[1.7rem] p-6 text-white sm:min-h-[285px] sm:p-7" style={{ background: `linear-gradient(125deg, #101827 0%, ${accent} 110%)` }}>
        {coverUrl ? <img src={coverUrl} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-65" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
        {membership.business_logo_url ? (
          <img src={membership.business_logo_url} alt="" aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 -z-10 h-[125%] w-[85%] rotate-[-12deg] object-contain opacity-20 blur-[3px]" />
        ) : null}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/25 to-black/40" />
        <div className="pointer-events-none absolute -right-20 bottom-[-7rem] -z-10 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/30 bg-white/90 shadow-lg">
              {membership.business_logo_url ? <img src={membership.business_logo_url} alt={`Logo de ${membership.business_name}`} className="h-full w-full object-contain p-1.5" /> : <MdCardMembership size={29} style={{ color: accent }} />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">{membership.business_name}</p>
              <h3 className="mt-1 truncate text-xl font-black tracking-tight sm:text-2xl">{clubName}</h3>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider backdrop-blur-sm"><MdWorkspacePremium className="mr-1 inline" size={13} />{badge}</span>
        </div>
        <div className="mt-12">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Tu carnet de socio</p>
          {primaryRule ? (
            <>
              <div className="mt-2 flex items-end justify-between gap-2">
                <p className="max-w-[75%] text-sm font-bold leading-5">{primaryRule.rule_name}</p>
                <p className="text-xl font-black tabular-nums">{primaryRule.progress_value}<span className="text-sm text-white/65"> / {primaryRule.threshold_value}</span></p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25"><div className="h-full rounded-full bg-white transition-all" style={{ width: `${percent}%` }} /></div>
            </>
          ) : <p className="mt-2 text-sm font-semibold text-white/90">{membership.club_message || "Tus visitas y compras, siempre contigo."}</p>}
          <div className="mt-4 flex items-center justify-between text-[10px] font-semibold text-white/75">
            <span>Socio desde {new Date(membership.joined_at).toLocaleDateString("es-ES", { month: "short", year: "numeric" })}</span>
            <span>{membership.rewards_earned} premio{membership.rewards_earned === 1 ? "" : "s"}</span>
          </div>
        </div>
      </div>

      <details className="group/details">
        <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-xs font-black text-[#0f172a] marker:hidden [&::-webkit-details-marker]:hidden">
          <span>Ver detalles y beneficios</span>
          <span className="text-lg text-[#64748b] transition-transform group-open/details:rotate-180" aria-hidden="true">⌄</span>
        </summary>
        <div className="border-t border-[#e2e8f0] px-5 pb-5 pt-4 sm:px-6">
          {membership.club_message ? <p className="mb-4 text-xs leading-5 text-[#475569]">{membership.club_message}</p> : null}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-[#f8fbff] p-3"><MdShoppingBag style={{ color: accent }} size={16} /><p className="mt-1 text-xl font-black text-[#0f172a]">{membership.purchases}</p><p className="text-[10px] text-[#64748b]">Compras</p></div>
            <div className="rounded-xl bg-[#f8fbff] p-3"><MdCardMembership style={{ color: accent }} size={16} /><p className="mt-1 text-xl font-black text-[#0f172a]">{membership.visits}</p><p className="text-[10px] text-[#64748b]">Visitas</p></div>
            <div className="rounded-xl bg-[#f8fbff] p-3"><MdEmojiEvents style={{ color: accent }} size={16} /><p className="mt-1 text-xl font-black text-[#0f172a]">{membership.rewards_earned}</p><p className="text-[10px] text-[#64748b]">Premios</p></div>
          </div>
          <div className="mt-4 space-y-3">{rules.length ? rules.map((rule) => <RuleProgress key={rule.rule_id} rule={rule} accent={accent} />) : <p className="rounded-xl bg-[#f8fbff] p-4 text-xs text-[#64748b]">Tu carnet está activo. Los objetivos aparecerán aquí cuando el negocio los configure.</p>}</div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] pt-4">
            <ReferralShareButton businessId={membership.business_id} businessName={membership.business_name} />
            <DigitalWalletButtons membershipId={membership.membership_id} />
          </div>
        </div>
      </details>
    </article>
  );
}
