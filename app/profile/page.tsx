import Link from "next/link";
import { MdArrowBack, MdBadge, MdLogout, MdSecurity } from "react-icons/md";
import { demoUser } from "@/lib/mock-data";

export default function ProfilePage() {
  return (
    <main className="bonoa-shell">
      <header className="flex items-center gap-4">
        <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver">
          <MdArrowBack size={20} />
        </Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Cuenta</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Perfil</h1>
        </div>
      </header>

      <section className="bonoa-card mt-8 rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="brand-gradient grid h-16 w-16 place-items-center rounded-2xl text-xl font-black text-white">A</div>
          <div>
            <h2 className="text-xl font-black text-white">{demoUser.name}</h2>
            <p className="mt-1 text-xs font-semibold tracking-[0.16em] text-zinc-500">{demoUser.publicId}</p>
          </div>
        </div>

        <div className="mt-8 divide-y divide-white/8 border-y border-white/8">
          <div className="flex items-center gap-3 py-4 text-sm text-zinc-300"><MdBadge className="text-orange-300" size={20} /> Identidad Bonoa</div>
          <div className="flex items-center gap-3 py-4 text-sm text-zinc-300"><MdSecurity className="text-orange-300" size={20} /> Seguridad y acceso</div>
        </div>

        <button type="button" disabled className="mt-7 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-600" title="Disponible al conectar autenticación">
          <MdLogout size={17} /> Cerrar sesión
        </button>
        <p className="mt-3 text-[11px] text-zinc-600">La autenticación se habilitará al conectar el proyecto Supabase.</p>
      </section>
    </main>
  );
}
