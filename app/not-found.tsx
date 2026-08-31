import Link from "next/link";
import { MdArrowBack, MdSearchOff } from "react-icons/md";

export default function NotFound() {
  return (
    <main className="bonoa-shell grid min-h-screen place-items-center py-10">
      <section className="bonoa-card w-full max-w-md rounded-[2rem] p-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdSearchOff size={28} /></div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">404</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Aquí no hay ningún bono.</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-500">El enlace puede haber cambiado o el contenido ya no está disponible.</p>
        <Link href="/" className="brand-gradient mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white"><MdArrowBack size={17} /> Volver a Bonoa</Link>
      </section>
    </main>
  );
}
