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
    <div className="rounded-[1.35rem] border border-white/10 bg-black/25 p-4 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-black text-white">{rule.rule_name}</p><p className="mt-1 text-[10px] leading-5 text-zinc-400">{qualified ? `${qualified} · ` : ""}Premio: <span className="font-bold text-white">{rule.reward_product_name}</span></p></div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border" style={{ borderColor: `${accent}35`, backgroundColor: `${accent}12`, color: accent }}><MdEmojiEvents size={18} /></div>
      </div>

      {useStamps ? <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">{Array.from({ length: threshold }).map((_, index) => {
        const filled = index < progress;
        return <div key={index} className="grid aspect-square min-h-8 place-items-center rounded-xl border text-[10px] font-black" style={filled ? { borderColor: `${accent}45`, backgroundColor: `${accent}22`, color: "white" } : { borderColor: "rgba(255,255,255,.08)", backgroundColor: "rgba(255,255,255,.025)", color: "#52525b" }}>{filled ? "✓" : index + 1}</div>;
      })}</div> : <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/7"><div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: accent }} /></div>}

      <div className="mt-3 flex items-end justify-between gap-4">
        <div><p className="text-lg font-black text-white">{metricLabel(rule, progress)} <span className="text-zinc-600">/ {metricLabel(rule, threshold)}</span></p><p className="mt-1 text-[10px] text-zinc-500">{rule.completed ? "Objetivo completado" : rule.remaining_value <= 0 ? "Premio desbloqueado" : `Te faltan ${metricLabel(rule, rule.remaining_value)}`}</p></div>
        {rule.rewards_earned > 0 ? <span className="shrink-0 rounded-full border border-amber-300/15 bg-amber-300/[0.06] px-3 py-1.5 text-[10px] font-black text-amber-200">{rule.rewards_earned} premio{rule.rewards_earned === 1 ? "" : "s"}</span> : null}
      </div>
    </div>
  );
}

export default function MembershipCard({ membership, rules }: { membership: WalletMembership; rules: MembershipRuleProgress[] }) {
  const accent = membership.business_accent_color || "#f97316";
  const clubName = membership.club_name || `Club ${membership.business_name}`;
  const badge = membership.membership_badge_label || membershipSegmentLabel(membership.segment).toUpperCase();

  return (
    <article className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#090909] shadow-[0_24px_80px_rgba(0,0,0,.25)]">
      <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full blur-3xl" style={{ backgroundColor: `${accent}24` }} />
      <div className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: accent }} />
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-[1.15rem] border bg-black/35" style={{ borderColor: `${accent}40` }}>
              {membership.business_logo_url ? <img src={membership.business_logo_url} alt="" className="h-full w-full object-contain p-1.5" /> : <MdCardMembership size={27} style={{ color: accent }} />}
            </div>
            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.22em]" style={{ color: accent }}>{membership.business_name}</p><p className="mt-1 truncate text-xl font-black text-white">{clubName}</p><p className="mt-1 text-[10px] text-zinc-500">Socio desde {new Date(membership.joined_at).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</p></div>
          </div>
          <span className="shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em]" style={{ borderColor: `${accent}35`, backgroundColor: `${accent}12`, color: accent }}><MdWorkspacePremium className="mr-1 inline" size={13} /> {badge}</span>
        </div>

        {membership.club_message ? <p className="mt-5 max-w-xl text-xs leading-5 text-zinc-400">{membership.club_message}</p> : null}

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><MdShoppingBag style={{ color: accent }} size={16} /><p className="mt-2 text-xl font-black text-white">{membership.purchases}</p><p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Compras</p></div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><MdCardMembership className="text-sky-300" size={16} /><p className="mt-2 text-xl font-black text-white">{membership.visits}</p><p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Visitas</p></div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3"><MdEmojiEvents className="text-amber-200" size={16} /><p className="mt-2 text-xl font-black text-white">{membership.rewards_earned}</p><p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Premios</p></div>
        </div>

        <div className="mt-4 space-y-3">{rules.length ? rules.map((rule) => <RuleProgress key={rule.rule_id} rule={rule} accent={accent} />) : <div className="rounded-2xl border border-dashed border-white/10 p-4 text-xs leading-5 text-zinc-600">Tu carnet está activo. Cuando este comercio añada un objetivo, tu progreso aparecerá aquí automáticamente.</div>}</div>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/8 pt-4">
          <ReferralShareButton businessId={membership.business_id} businessName={membership.business_name} />
          <DigitalWalletButtons membershipId={membership.membership_id} />
        </div>
      </div>
    </article>
  );
}
