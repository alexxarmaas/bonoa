import Link from "next/link";
import BonoaLogo from "@/components/brand/BonoaLogo";

export default function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f8fbff] text-[#0f172a]">
      <header className="border-b border-[#dbe7f5] bg-white">
        <div className="mx-auto flex h-20 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Bonoa, inicio"><BonoaLogo /></Link>
          <Link href="/" className="rounded-full border border-[#dbe7f5] bg-white px-4 py-2.5 text-xs font-black text-[#475569] shadow-sm">Volver</Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#2563eb]">{eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black tracking-[-.04em] sm:text-5xl">{title}</h1>
        <p className="mt-5 text-base leading-8 text-[#64748b]">{intro}</p>
        <div className="mt-10 space-y-9 text-sm leading-7 text-[#475569] [&_a]:font-bold [&_a]:text-[#2563eb] [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-black [&_h2]:tracking-tight [&_h2]:text-[#0f172a] [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          {children}
        </div>
        <footer className="mt-14 border-t border-[#dbe7f5] pt-6 text-xs leading-6 text-[#94a3b8]">
          BONŌA · Una iniciativa de Tramassso · Última actualización: 27 de agosto de 2026.
        </footer>
      </article>
    </main>
  );
}
