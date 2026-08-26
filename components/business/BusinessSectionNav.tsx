"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { MdAssessment, MdCampaign, MdDashboard, MdGroups, MdHistory, MdPeople, MdPointOfSale, MdQrCodeScanner, MdSettings, MdStyle, MdViewList } from "react-icons/md";

const items = [
  { suffix: "", label: "Resumen", icon: MdDashboard },
  { suffix: "/counter", label: "Mostrador", icon: MdPointOfSale },
  { suffix: "/customers", label: "Clientes", icon: MdGroups },
  { suffix: "/growth", label: "Fidelización", icon: MdCampaign },
  { suffix: "/catalog", label: "Catálogo", icon: MdViewList },
  { suffix: "/insights", label: "Métricas", icon: MdAssessment },
  { suffix: "/passes", label: "Bonos", icon: MdStyle },
  { suffix: "/activity", label: "Actividad", icon: MdHistory },
  { suffix: "/team", label: "Equipo", icon: MdPeople },
  { suffix: "/scan", label: "Asignar / consumir", icon: MdQrCodeScanner },
  { suffix: "/settings", label: "Configuración", icon: MdSettings },
];

export default function BusinessSectionNav() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const base = `/business/${params.id}`;

  return (
    <nav className="bonoa-shell pb-0 pt-4" aria-label="Secciones del negocio">
      <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/8 bg-black/20 p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map(({ suffix, label, icon: Icon }) => {
          const href = `${base}${suffix}`;
          const active = suffix === "" ? pathname === base : pathname.startsWith(href);
          return (
            <Link
              key={suffix || "root"}
              href={href}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-bold transition ${active ? "bg-white/10 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"}`}
            >
              <Icon size={17} /> {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
