import Link from "next/link";
import { MdChevronRight, MdSchedule, MdStorefront } from "react-icons/md";
import type { WalletPass } from "@/lib/wallet-data";

const statusMeta = {
  active: { label: "Activo", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  expiring_soon: { label: "Caduca pronto", className: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  exhausted: { label: "Agotado", className: "border-slate-200 bg-slate-50 text-slate-500" },
  expired: { label: "Caducado", className: "border-slate-200 bg-slate-50 text-slate-500" },
  cancelled: { label: "Cancelado", className: "border-red-200 bg-red-50 text-red-600" },
} as const;

function formatIssuedPrice(pass: WalletPass) {
  if (pass.issuedPriceCents === null) return null;
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: pass.issuedCurrency ?? "EUR",
  }).format(pass.issuedPriceCents / 100);
}

export default function PassCard({ pass }: { pass: WalletPass }) {
  const used = pass.initialUnits - pass.remainingUnits;
  const percentage = pass.initialUnits > 0 ? Math.max(0, Math.min(100, (pass.remainingUnits / pass.initialUnits) * 100)) : 0;
  const status = statusMeta[pass.status];
  const isBalance = pass.productType === "balance";
  const faded = ["exhausted", "expired", "cancelled"].includes(pass.status);
  const issuedPrice = formatIssuedPrice(pass);
  const accent = pass.businessAccentColor || "#2563eb";

  return (
    <Link
      href={`/bonos/${pass.id}`}
      className={`group relative block overflow-hidden rounded-[1.7rem] border border-[#dbe7f5] bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,.07)] transition hover:-translate-y-0.5 hover:border-[#bfdbfe] hover:shadow-[0_24px_65px_rgba(37,99,235,.1)] ${faded ? "opacity-65" : ""}`}
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${accent}, #06b6d4)` }} />
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-[#f8fbff]" style={{ borderColor: `${accent}35` }}>
            {pass.businessLogoUrl ? <img src={pass.businessLogoUrl} alt="" className="h-full w-full object-contain p-1.5" /> : <MdStorefront size={22} style={{ color: accent }} />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>{pass.businessName}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-black tracking-tight text-[#0f172a]">{pass.productName}</h2>
              {issuedPrice ? <span className="rounded-full border border-[#dbe7f5] bg-[#f8fbff] px-2.5 py-1 text-[9px] font-black text-[#64748b]">{issuedPrice}</span> : null}
            </div>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#64748b]">{pass.description}</p>
          </div>
        </div>
        <MdChevronRight size={24} className="mt-1 shrink-0 text-[#94a3b8] transition group-hover:translate-x-0.5" style={{ color: accent }} />
      </div>

      <div className="mt-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-black tabular-nums text-[#0f172a]">
            {pass.remainingUnits}<span className="ml-1 text-base font-medium text-[#94a3b8]">/{pass.initialUnits}{isBalance ? " €" : ""}</span>
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#64748b]">
            {isBalance ? "saldo disponible" : "usos disponibles"}
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${status.className}`}>{status.label}</span>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#e8eef7]">
        <div className="h-full rounded-full transition-all" style={{ width: `${percentage}%`, background: `linear-gradient(90deg, ${accent}, #06b6d4)` }} />
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 text-xs text-[#64748b]">
        <span>{used} {isBalance ? "consumido" : `uso${used === 1 ? "" : "s"} consumido${used === 1 ? "" : "s"}`}</span>
        <span className="flex items-center gap-1.5 text-right"><MdSchedule size={15} /> {pass.expiresAt ? new Date(pass.expiresAt).toLocaleDateString("es-ES") : "Sin caducidad"}</span>
      </div>
    </Link>
  );
}
