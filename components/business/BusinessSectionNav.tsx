"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { MdAssessment, MdCampaign, MdDashboard, MdGroups, MdHistory, MdPeople, MdPointOfSale, MdRocketLaunch, MdSecurity, MdSettings, MdStorefront, MdStyle, MdViewList, MdWorkspacePremium, MdPersonAddAlt1 } from "react-icons/md";

const items = [
  { suffix: "", label: "Resumen", icon: MdDashboard },
  { suffix: "/onboarding", label: "Puesta en marcha", icon: MdRocketLaunch },
  { suffix: "/terminal", label: "Mostrador", icon: MdPointOfSale },
  { suffix: "/customers", label: "Clientes", icon: MdGroups },
  { suffix: "/club", label: "Carnet", icon: MdWorkspacePremium },
  { suffix: "/campaigns", label: "Campañas", icon: MdCampaign },
  { suffix: "/referrals", label: "Referidos", icon: MdPersonAddAlt1 },
  { suffix: "/security", label: "Seguridad", icon: MdSecurity },
  { suffix: "/catalog", label: "Catálogo", icon: MdViewList },
  { suffix: "/insights", label: "Métricas", icon: MdAssessment },
  { suffix: "/passes", label: "Bonos", icon: MdStyle },
  { suffix: "/activity", label: "Actividad", icon: MdHistory },
  { suffix: "/team", label: "Equipo", icon: MdPeople },
  { suffix: "/directory", label: "Directorio", icon: MdStorefront },
  { suffix: "/settings", label: "Configuración", icon: MdSettings },
];

export default function BusinessSectionNav() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const base = `/business/${params.id}`;

  return (
    <nav className="bonoa-shell pb-0 pt-4" aria-label="Secciones del negocio">
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-[#dbe7f5] bg-white/90 p-2 shadow-[0_12px_34px_rgba(15,23,42,.05)] backdrop-blur [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map(({ suffix, label, icon: Icon }) => {
          const href = `${base}${suffix}`;
          const active = suffix === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link key={suffix || "root"} href={href} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold transition ${active ? "bg-[#eff6ff] text-[#1d4ed8] shadow-sm" : "text-[#64748b] hover:bg-[#f8fbff] hover:text-[#0f172a]"}`}>
              <Icon size={17} /> {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
