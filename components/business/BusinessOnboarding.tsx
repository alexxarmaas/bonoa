"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { MdCheckCircle, MdCircle, MdQrCodeScanner, MdSettings, MdStyle } from "react-icons/md";
import { getPilotOnboarding } from "@/lib/pilot-data";

export default function BusinessOnboarding() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const businessId = params.id;
  const base = `/business/${businessId}`;
  const [state, setState] = useState<Awaited<ReturnType<typeof getPilotOnboarding>> | null>(null);

  useEffect(() => {
    if (pathname !== base) return;
    let active = true;
    getPilotOnboarding(businessId)
      .then((value) => { if (active) setState(value); })
      .catch(() => { if (active) setState(null); });
    return () => { active = false; };
  }, [base, businessId, pathname]);

  if (pathname !== base || !state || state.completed === state.total) return null;

  const steps = [
    {
      done: state.profileReady,
      title: "Completa la ficha",
      detail: "Añade descripción y al menos un canal de contacto.",
      href: `${base}/settings`,
      icon: MdSettings,
    },
    {
      done: state.productReady,
      title: "Crea un bono",
      detail: "Define usos, validez y precio comercial.",
      href: `${base}/catalog`,
      icon: MdStyle,
    },
    {
      done: state.firstPassIssued,
      title: "Asigna el primero",
      detail: "Escanea una wallet y emite tu primer bono.",
      href: `${base}/scan`,
      icon: MdQrCodeScanner,
    },
  ];

  return (
    <section className="bonoa-shell pb-0 pt-5">
      <div className="rounded-[1.7rem] border border-orange-400/15 bg-orange-400/[0.045] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-300">Puesta en marcha</p>
            <h2 className="mt-1 text-lg font-black text-white">Deja {state.business.name} listo para clientes</h2>
            <p className="mt-1 text-xs text-zinc-500">{state.completed} de {state.total} pasos completados.</p>
          </div>
          <div className="rounded-full border border-orange-400/15 bg-orange-400/5 px-3 py-1.5 text-[10px] font-black text-orange-200">{Math.round((state.completed / state.total) * 100)}%</div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Link key={step.title} href={step.href} className={`rounded-2xl border p-4 transition ${step.done ? "border-emerald-400/15 bg-emerald-400/[0.035]" : "border-white/8 bg-black/15 hover:border-orange-400/20"}`}>
                <div className="flex items-start gap-3">
                  {step.done ? <MdCheckCircle size={20} className="mt-0.5 shrink-0 text-emerald-300" /> : <MdCircle size={20} className="mt-0.5 shrink-0 text-zinc-700" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><Icon size={16} className={step.done ? "text-emerald-300" : "text-orange-300"} /><p className="text-xs font-black text-white">{step.title}</p></div>
                    <p className="mt-1 text-[11px] leading-5 text-zinc-500">{step.detail}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
