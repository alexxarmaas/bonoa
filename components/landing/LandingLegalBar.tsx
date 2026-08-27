import Link from "next/link";

export default function LandingLegalBar() {
  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-5 py-5 text-[10px] font-semibold text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>Bonoa está actualmente en fase piloto.</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/privacidad" className="transition hover:text-[#2563eb]">Privacidad</Link>
          <Link href="/terminos" className="transition hover:text-[#2563eb]">Condiciones de uso</Link>
          <a href="mailto:partnerships@tramassso.com" className="transition hover:text-[#2563eb]">Contacto</a>
        </div>
      </div>
    </div>
  );
}
