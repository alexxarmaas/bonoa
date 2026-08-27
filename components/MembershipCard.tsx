import { MdCardMembership, MdEmojiEvents, MdShoppingBag, MdWorkspacePremium } from "react-icons/md";
import DigitalWalletButtons from "@/components/DigitalWalletButtons";
import {
  membershipSegmentLabel,
  qualifiedPurchaseLabel,
  type MembershipRuleProgress,
  type WalletMembership,
} from "@/lib/membership-retention";

function metricLabel(rule: MembershipRuleProgress, value: number) {
  if (rule.trigger_type === "spend_total") {
    return (value / 100).toLocaleString("es-ES", { style: "currency", currency: "EUR" });
  }
  if (rule.trigger_type === "purchase_count") return `${value} compra${value === 1 ? "" : "s"}`;
  if (rule.trigger_type === "visit_count") return `${value} visita${value === 1 ? "" : "s"}`;
  return `${value} consumo${value === 1 ? "" : "s"}`;
}

function RuleProgress({ rule }: { rule: MembershipRuleProgress }) {
  const threshold = Math.max(1, rule.threshold_value);
  const progress = Math.max(0, Math.min(threshold, rule.progress_value));
  const percent = Math.min(100, Math.round((progress / threshold) * 100));
  const qualified = qualifiedPurchaseLabel(rule.minimum_purchase_cents);
  const useStamps = rule.trigger_type !== "spend_total" && threshold <= 12;

  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-white">{rule.rule_name}</p>
          <p className="mt-1 text-[11px] leading-5 text-zinc-500">
            {qualified ? `${qualified} · ` : ""}Premio: <span className="text-zinc-300">{rule.reward_product_name}</span>
          </p>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber-300/15 bg-amber-300/[0.06] text-amber-200">
          <MdEmojiEvents size={18} />
        </div>
      </div>

      {useStamps ? (
        <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-10">
          {Array.from({ length: threshold }).map((_, index) => {
            const filled = index < progress;
            return (
              <div key={index} className={`grid aspect-square min-h-8 place-items-center rounded-xl border text-[10px] font-black ${filled ? "border-orange-400/30 bg-orange-400/15 text-orange-200" : "border-white/8 bg-white/[0.025] text-zinc-700"}`}>
                {filled ? "✓" : index + 1}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-white/75 transition-all" style={{ width: `${percent}%` }} />
        </div>
      )}

      <div className="mt-3 flex items-end justify-between gap-4">
        <div>
          <p className="text-lg font-black text-white">{metricLabel(rule, progress)} <span className="text-zinc-600">/ {metricLabel(rule, threshold)}</span></p>
          <p className="mt-1 text-[10px] text-zinc-600">
            {rule.completed ? "Objetivo completado" : rule.remaining_value <= 0 ? "Premio desbloqueado" : `Te faltan ${metricLabel(rule, rule.remaining_value)}`}
          </p>
        </div>
        {rule.rewards_earned > 0 ? <span className="shrink-0 rounded-full border border-amber-300/15 bg-amber-300/[0.06] px-3 py-1.5 text-[10px] font-black text-amber-200">{rule.rewards_earned} premio{rule.rewards_earned === 1 ? "" : "s"}</span> : null}
      </div>
    </div>
  );
}

export default function MembershipCard({ membership, rules }: { membership: WalletMembership; rules: MembershipRuleProgress[] }) {
  return (
    <article className="bonoa-card overflow-hidden rounded-[1.8rem]">
      <div className="h-1.5" style={{ backgroundColor: membership.business_accent_color || "#f97316" }} />
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-orange-300">
              {membership.business_logo_url ? <img src={membership.business_logo_url} alt="" className="h-full w-full object-cover" /> : <MdCardMembership size={24} />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-black text-white">{membership.business_name}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-600">Carnet de fidelización · socio desde {new Date(membership.joined_at).toLocaleDateString("es-ES", { month: "short", year: "numeric" })}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black text-zinc-300"><MdWorkspacePremium className="mr-1 inline" size={13} /> {membershipSegmentLabel(membership.segment)}</span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-white/7 bg-white/[0.025] p-3"><MdShoppingBag className="text-emerald-300" size={16} /><p className="mt-2 text-xl font-black text-white">{membership.purchases}</p><p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Compras</p></div>
          <div className="rounded-2xl border border-white/7 bg-white/[0.025] p-3"><MdCardMembership className="text-sky-300" size={16} /><p className="mt-2 text-xl font-black text-white">{membership.visits}</p><p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Visitas</p></div>
          <div className="rounded-2xl border border-white/7 bg-white/[0.025] p-3"><MdEmojiEvents className="text-amber-200" size={16} /><p className="mt-2 text-xl font-black text-white">{membership.rewards_earned}</p><p className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">Premios</p></div>
        </div>

        <div className="mt-4 space-y-3">
          {rules.length ? rules.map((rule) => <RuleProgress key={rule.rule_id} rule={rule} />) : <div className="rounded-2xl border border-dashed border-white/10 p-4 text-xs leading-5 text-zinc-600">Tu carnet está activo. Cuando este comercio añada un objetivo de fidelización, el progreso aparecerá aquí sin que tengas que hacer nada.</div>}
        </div>

        <DigitalWalletButtons membershipId={membership.membership_id} />
      </div>
    </article>
  );
}
