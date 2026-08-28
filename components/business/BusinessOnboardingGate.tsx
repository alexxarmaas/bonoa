"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { MdArrowBack, MdLockClock, MdRocketLaunch } from "react-icons/md";
import { useAuth } from "@/components/auth/AuthProvider";
import { getBusinessAccess } from "@/lib/business-data";

type GateState = "checking" | "allowed" | "staff-blocked" | "error";

export default function BusinessOnboardingGate({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { id: businessId } = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const onboardingPath = `/business/${businessId}/onboarding`;
  const [state, setState] = useState<GateState>("checking");

  useEffect(() => {
    if (pathname === onboardingPath || authLoading || !user) return;

    let active = true;
    getBusinessAccess(businessId, user.id)
      .then((access) => {
        if (!active) return;

        // Each page already owns its normal access-denied UX. The gate only adds
        // the onboarding requirement for users that actually belong to the business.
        if (!access || access.business.onboarding_completed_at) {
          setState("allowed");
          return;
        }

        if (access.role === "owner" || access.role === "manager") {
          router.replace(onboardingPath);
          return;
        }

        setState("staff-blocked");
      })
      .catch(() => {
        if (active) setState("error");
      });

    return () => {
      active = false;
    };
  }, [authLoading, businessId, onboardingPath, pathname, router, user]);

  if (pathname === onboardingPath || authLoading || !user) return <>{children}</>;

  if (state === "checking") {
    return (
      <main className="bonoa-shell grid min-h-[60vh] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-orange-400" />
          <p className="mt-4 text-xs font-semibold text-zinc-500">Comprobando la puesta en marcha…</p>
        </div>
      </main>
    );
  }

  if (state === "staff-blocked") {
    return (
      <main className="bonoa-shell min-h-[70vh]">
        <section className="bonoa-card mx-auto mt-16 max-w-xl rounded-[2rem] p-8 text-center">
          <MdLockClock className="mx-auto text-amber-300" size={42} />
          <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-amber-200">Alta pendiente</p>
          <h1 className="mt-2 text-2xl font-black text-white">El negocio todavía no puede operar</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Un propietario o manager debe completar la ficha, marca y fidelización inicial antes de usar el mostrador o registrar actividad.</p>
          <Link href="/business" className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-xs font-black text-zinc-300"><MdArrowBack /> Volver a negocios</Link>
        </section>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="bonoa-shell min-h-[70vh]">
        <section className="bonoa-card mx-auto mt-16 max-w-xl rounded-[2rem] p-8 text-center">
          <MdRocketLaunch className="mx-auto text-orange-300" size={42} />
          <h1 className="mt-4 text-2xl font-black text-white">No podemos verificar el alta del negocio</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">Por seguridad no habilitamos las operaciones hasta poder confirmar que el onboarding está completado.</p>
          <Link href="/business" className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-xs font-black text-zinc-300"><MdArrowBack /> Volver a negocios</Link>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
