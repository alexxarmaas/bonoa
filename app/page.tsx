import type { Metadata } from "next";
import Link from "next/link";
import {
  MdArrowForward,
  MdCampaign,
  MdCheckCircle,
  MdGroups,
  MdHistory,
  MdNotificationsNone,
  MdPersonAddAlt1,
  MdQrCode2,
  MdRedeem,
  MdShoppingBag,
  MdStorefront,
  MdVerified,
  MdWallet,
} from "react-icons/md";
import BonoaLogo from "@/components/brand/BonoaLogo";
import LandingHeaderActions from "@/components/landing/LandingHeaderActions";

export const metadata: Metadata = {
  title: "Bonoa | Fidelización, bonos y recompensas",
  description: "Carnets digitales, bonos, recompensas, campañas y referidos para clientes y negocios. Un QR. Todos tus beneficios.",
};

const stamps = Array.from({ length: 10 }, (_, index) => index < 6);

function ProgressStamps({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {stamps.map((filled, index) => (
        <span
          key={index}
          className={`${compact ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-[10px]"} grid place-items-center rounded-full border font-black ${filled ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-slate-300 bg-white text-slate-300"}`}
        >
          {filled ? "✓" : index + 1}
        </span>
      ))}
    </div>
  );
}

function MiniWalletPhone() {
  return (
    <div className="relative mx-auto w-[286px] rounded-[3.1rem] border-[9px] border-[#0f172a] bg-[#0f172a] p-1.5 shadow-[0_40px_90px_rgba(15,23,42,.25)] sm:w-[318px]">
      <div className="absolute left-1/2 top-3 z-20 h-5 w-20 -translate-x-1/2 rounded-full bg-[#05070c]" />
      <div className="overflow-hidden rounded-[2.45rem] bg-white px-4 pb-4 pt-9">
        <div className="flex items-center justify-between">
          <BonoaLogo className="scale-[.8] origin-left" wordmarkClassName="text-[.9rem]" />
          <MdNotificationsNone className="text-slate-500" size={19} />
        </div>

        <div className="mt-4 rounded-[1.45rem] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(37,99,235,.09)]">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#0f172a] text-lg text-white">★</div>
            <div>
              <p className="text-sm font-black text-[#0f172a]">Club StarGarage</p>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-500">Lavado & estética</p>
            </div>
          </div>
          <div className="mt-5"><ProgressStamps compact /></div>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div><p className="text-2xl font-black tracking-tight text-[#0f172a]">6/10</p><p className="text-[10px] font-bold text-slate-500">compras</p></div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black text-[#2563EB]">En progreso</span>
          </div>
          <p className="mt-4 border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-500">Compras válidas desde 50 €</p>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-blue-100 bg-[#f2f7ff] p-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-white text-[#2563EB]"><MdRedeem size={19} /></div>
            <div><p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">Próximo premio</p><p className="mt-0.5 text-xs font-black text-[#0f172a]">Lavado premium</p></div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-4 gap-1 text-center text-[8px] font-bold text-slate-400">
          <div className="text-[#2563EB]"><MdWallet className="mx-auto mb-1" size={17} />Carnets</div>
          <div><MdRedeem className="mx-auto mb-1" size={17} />Premios</div>
          <div><MdHistory className="mx-auto mb-1" size={17} />Historial</div>
          <div><MdNotificationsNone className="mx-auto mb-1" size={17} />Avisos</div>
        </div>
      </div>
    </div>
  );
}

function CustomerPhone() {
  const cards = [
    ["Club StarGarage", "6/10 compras", "bg-[#2563EB]"],
    ["Café Central", "3/8 compras", "bg-[#06B6D4]"],
    ["Pizzería Napoli", "2/10 compras", "bg-[#0f172a]"],
    ["Gym Plus", "4/12 visitas", "bg-[#38bdf8]"],
  ];

  return (
    <div className="relative mx-auto w-[230px] rounded-[2.65rem] border-[8px] border-[#0f172a] bg-[#0f172a] p-1 shadow-[0_28px_70px_rgba(15,23,42,.18)]">
      <div className="rounded-[2.05rem] bg-white px-3 pb-5 pt-7">
        <p className="text-[10px] font-black text-[#0f172a]">Mis carnets</p>
        <div className="mt-3 space-y-2">
          {cards.map(([name, progress, color]) => (
            <div key={name} className={`${color} rounded-xl px-3 py-2.5 text-white shadow-sm`}>
              <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-black">{name}</span><span className="text-xs">›</span></div>
              <p className="mt-1 text-[8px] font-semibold text-white/75">{progress}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f8fbff] text-[#0f172a]">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-5 sm:h-20 sm:px-8">
          <Link href="/" aria-label="Bonoa, inicio"><BonoaLogo /></Link>
          <nav className="hidden items-center gap-7 text-xs font-bold text-slate-600 lg:flex">
            <a href="#como-funciona" className="transition hover:text-[#2563EB]">Cómo funciona</a>
            <a href="#clientes" className="transition hover:text-[#2563EB]">Para clientes</a>
            <a href="#negocios" className="transition hover:text-[#2563EB]">Para negocios</a>
            <a href="#fidelizacion" className="transition hover:text-[#2563EB]">Fidelización</a>
          </nav>
          <LandingHeaderActions />
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-slate-200/70 bg-white">
        <div className="pointer-events-none absolute -right-44 top-8 h-[36rem] w-[36rem] rounded-full bg-[#dfeeff] blur-2xl" />
        <div className="pointer-events-none absolute right-40 top-40 h-72 w-72 rounded-full bg-[#dff9fd] blur-3xl" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:py-24">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.28em] text-[#2563EB]">Wallet digital para bonos, fidelización y recompensas</p>
            <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[.96] tracking-[-.055em] text-[#0f172a] sm:text-6xl lg:text-7xl">
              Tus clientes vuelven.<br />Tú sabes <span className="text-[#2563EB]">por qué.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg font-medium leading-8 text-slate-600">Carnets de fidelización, bonos, recompensas y campañas en un único lugar.</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-500">Un QR para el cliente. Una herramienta sencilla para el negocio. Bonoa convierte cada interacción en progreso medible y cada premio en una razón para volver.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-6 py-3.5 text-sm font-black text-white shadow-[0_18px_40px_rgba(37,99,235,.22)] transition hover:-translate-y-0.5 hover:bg-[#1d4ed8]">Probar Bonoa <MdArrowForward size={18} /></Link>
              <Link href="/register?next=/business" className="inline-flex items-center gap-2 rounded-full border border-[#2563EB]/25 bg-white px-6 py-3.5 text-sm font-black text-[#2563EB] transition hover:border-[#2563EB]/50 hover:bg-blue-50"><MdStorefront size={18} /> Soy un negocio</Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-bold text-slate-500">
              <span className="inline-flex items-center gap-2"><MdVerified className="text-[#2563EB]" size={18} /> Sin tarjetas de papel</span>
              <span className="inline-flex items-center gap-2"><MdQrCode2 className="text-[#06B6D4]" size={18} /> Un único QR</span>
              <span className="inline-flex items-center gap-2"><MdWallet className="text-[#2563EB]" size={18} /> PWA, sin instalar una app</span>
            </div>
          </div>

          <div className="relative min-h-[520px] lg:min-h-[600px]">
            <div className="absolute left-1/2 top-1/2 h-[440px] w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-100 via-cyan-50 to-transparent blur-xl" />
            <div className="relative z-10 pt-4 lg:pt-0"><MiniWalletPhone /></div>
            <div className="absolute bottom-4 right-0 z-20 w-52 rotate-[4deg] rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_24px_65px_rgba(37,99,235,.14)] sm:right-10 lg:right-0">
              <p className="text-xs font-black text-slate-500">Bono de bienvenida</p>
              <p className="mt-3 text-3xl font-black tracking-tight text-[#2563EB]">10% DTO.</p>
              <p className="mt-1 text-xs font-bold text-slate-600">en tu próximo servicio</p>
              <div className="mt-5 flex items-center justify-between"><span className="text-[9px] font-semibold text-slate-400">Disponible al reclamarlo</span><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-[#2563EB]"><MdRedeem size={20} /></span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-black uppercase tracking-[.25em] text-[#2563EB]">Cómo funciona</p>
          <h2 className="mt-4 text-4xl font-black tracking-[-.04em] sm:text-5xl">Fidelizar puede ser así de simple.</h2>
          <p className="mt-4 text-sm leading-7 text-slate-500">El cliente enseña siempre el mismo QR y Bonoa mantiene unidos su carnet, su progreso, sus bonos y sus recompensas.</p>
        </div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          <article className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,.05)]">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#2563EB]"><MdQrCode2 size={24} /></div>
            <p className="mt-6 text-xs font-black uppercase tracking-[.18em] text-[#2563EB]">1. Únete</p>
            <h3 className="mt-2 text-xl font-black">Escanea y entra.</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">El cliente escanea el QR público del negocio, crea su cuenta si hace falta y añade su carnet.</p>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,.05)]">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-50 text-[#06B6D4]"><MdShoppingBag size={24} /></div>
            <p className="mt-6 text-xs font-black uppercase tracking-[.18em] text-[#06B6D4]">2. Suma</p>
            <h3 className="mt-2 text-xl font-black">Cada interacción cuenta.</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">Compras, visitas o gasto hacen avanzar automáticamente los objetivos configurados por el negocio.</p>
          </article>
          <article className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,.05)]">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><MdRedeem size={24} /></div>
            <p className="mt-6 text-xs font-black uppercase tracking-[.18em] text-emerald-600">3. Gana</p>
            <h3 className="mt-2 text-xl font-black">El premio aparece solo.</h3>
            <p className="mt-3 text-sm leading-6 text-slate-500">Al alcanzar el objetivo, Bonoa desbloquea el premio o bono correspondiente sin consumir el carnet permanente.</p>
          </article>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-5 rounded-[2rem] border border-blue-100 bg-gradient-to-r from-[#eff6ff] to-[#f2fdff] p-6 sm:flex-row sm:p-8">
          <div><p className="text-sm font-black text-[#0f172a]">Ejemplo de progreso</p><p className="mt-1 text-xs text-slate-500">Seis compras válidas de diez necesarias.</p></div>
          <ProgressStamps compact />
          <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700"><MdRedeem size={17} /> Premio al completar</div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-2">
          <article id="clientes" className="overflow-hidden rounded-[2.3rem] border border-slate-200 bg-[#f8fbff] p-6 sm:p-8">
            <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-center">
              <CustomerPhone />
              <div>
                <p className="text-[11px] font-black uppercase tracking-[.22em] text-[#2563EB]">Para el cliente</p>
                <h2 className="mt-3 text-3xl font-black tracking-[-.04em]">Todos sus beneficios en un solo lugar.</h2>
                <div className="mt-6 space-y-3 text-sm font-semibold text-slate-600">
                  {[
                    "Un único QR para todos los negocios.",
                    "Carnets permanentes con progreso visible.",
                    "Bonos y premios disponibles al instante.",
                    "Historial claro de compras y consumos.",
                    "Avisos cuando está cerca de conseguir algo.",
                  ].map((text) => <p key={text} className="flex gap-2.5"><MdCheckCircle className="mt-0.5 shrink-0 text-[#2563EB]" size={18} />{text}</p>)}
                </div>
                <Link href="/register" className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#2563EB]/25 bg-white px-5 py-3 text-xs font-black text-[#2563EB]">Quiero mi wallet <MdArrowForward size={16} /></Link>
              </div>
            </div>
          </article>

          <article id="negocios" className="rounded-[2.3rem] border border-slate-200 bg-[#0f172a] p-6 text-white sm:p-8">
            <p className="text-[11px] font-black uppercase tracking-[.22em] text-cyan-300">Para el negocio</p>
            <h2 className="mt-3 max-w-lg text-3xl font-black tracking-[-.04em]">Fideliza sin tarjetas de papel ni apps complicadas.</h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">Bonoa convierte el comportamiento de tus clientes en acciones claras: quién vuelve, quién está cerca de un premio y quién necesita una campaña.</p>
            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><MdNotificationsNone className="text-cyan-300" size={20} /><p className="mt-4 text-[10px] font-bold text-slate-400">Clientes en riesgo</p><p className="mt-1 text-2xl font-black">18</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><MdRedeem className="text-emerald-300" size={20} /><p className="mt-4 text-[10px] font-bold text-slate-400">Cerca de premio</p><p className="mt-1 text-2xl font-black">34</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><MdGroups className="text-blue-300" size={20} /><p className="mt-4 text-[10px] font-bold text-slate-400">Nuevos esta semana</p><p className="mt-1 text-2xl font-black">27</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><MdCampaign className="text-blue-300" size={20} /><p className="mt-4 text-[10px] font-bold text-slate-400">Campañas</p><p className="mt-1 text-sm font-black">Segmentadas</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><MdPersonAddAlt1 className="text-cyan-300" size={20} /><p className="mt-4 text-[10px] font-bold text-slate-400">Referidos</p><p className="mt-1 text-sm font-black">Medibles</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><MdQrCode2 className="text-emerald-300" size={20} /><p className="mt-4 text-[10px] font-bold text-slate-400">Scanner</p><p className="mt-1 text-sm font-black">Desde el móvil</p></div>
            </div>
            <Link href="/register?next=/business" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#2563EB] px-5 py-3 text-xs font-black text-white">Crear mi negocio <MdArrowForward size={16} /></Link>
          </article>
        </div>
      </section>

      <section id="fidelizacion" className="mx-auto w-full max-w-7xl px-5 py-20 sm:px-8 sm:py-24">
        <div className="overflow-hidden rounded-[2.4rem] border border-blue-100 bg-gradient-to-br from-white via-[#f5f9ff] to-[#eaf7ff] p-7 sm:p-10 lg:p-12">
          <div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#2563EB] text-white shadow-[0_15px_35px_rgba(37,99,235,.22)]"><MdShoppingBag size={27} /></span>
              <p className="mt-7 text-[11px] font-black uppercase tracking-[.22em] text-[#2563EB]">Reglas que se entienden</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-.045em]">10 compras de 50 € o más → 1 premio</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">Solo cuentan las compras que cumplen la condición. Una compra de 49 € queda en el historial, pero no suma al objetivo. Al llegar a 10/10, el premio se crea y el carnet sigue activo para el siguiente ciclo.</p>
            </div>
            <div className="rounded-[2rem] border border-white bg-white/85 p-6 shadow-[0_20px_70px_rgba(37,99,235,.08)] sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black text-[#0f172a]">Progreso del carnet</p><p className="mt-1 text-[10px] font-semibold text-slate-400">Club StarGarage</p></div><span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-black text-[#2563EB]">6 / 10</span></div>
              <div className="mt-7 flex flex-wrap gap-2">{stamps.map((filled, index) => <span key={index} className={`grid h-9 w-9 place-items-center rounded-full border text-[10px] font-black ${filled ? "border-[#2563EB] bg-[#2563EB] text-white" : "border-slate-200 bg-white text-slate-400"}`}>{index + 1}</span>)}</div>
              <div className="mt-7 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><MdRedeem className="shrink-0 text-emerald-600" size={23} /><div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-emerald-600">Al completar</p><p className="mt-1 text-sm font-black text-emerald-950">Lavado premium desbloqueado</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          <div className="flex gap-4"><MdVerified className="shrink-0 text-[#2563EB]" size={28} /><div><p className="text-sm font-black">Fiable</p><p className="mt-1 text-xs leading-5 text-slate-500">Identidad y operaciones trazables.</p></div></div>
          <div className="flex gap-4"><MdStorefront className="shrink-0 text-[#2563EB]" size={28} /><div><p className="text-sm font-black">Hecho para negocios locales</p><p className="mt-1 text-xs leading-5 text-slate-500">Pensado para el día a día del mostrador.</p></div></div>
          <div className="flex gap-4"><MdWallet className="shrink-0 text-[#06B6D4]" size={28} /><div><p className="text-sm font-black">Beneficios conectados</p><p className="mt-1 text-xs leading-5 text-slate-500">Carnets, campañas, bonos y premios unidos.</p></div></div>
          <div className="flex gap-4"><MdQrCode2 className="shrink-0 text-[#2563EB]" size={28} /><div><p className="text-sm font-black">Simple en cualquier lugar</p><p className="mt-1 text-xs leading-5 text-slate-500">Funciona desde el móvil y con un QR.</p></div></div>
        </div>
      </section>

      <section className="bg-[#0f172a] text-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-8 px-5 py-16 sm:px-8 lg:flex-row lg:items-center">
          <div><p className="text-[11px] font-black uppercase tracking-[.25em] text-cyan-300">¿Listo para probarlo?</p><h2 className="mt-3 text-4xl font-black tracking-[-.04em]">Convierte cada compra en una razón para volver.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Empieza con un carnet sencillo, prueba el flujo con tus clientes y deja que Bonoa haga visible el progreso.</p></div>
          <div className="flex shrink-0 flex-wrap gap-3"><Link href="/register" className="rounded-full bg-[#2563EB] px-6 py-3.5 text-sm font-black text-white">Crear cuenta</Link><Link href="/login?next=/wallet" className="rounded-full border border-white/15 bg-white/[.06] px-6 py-3.5 text-sm font-black text-white">Acceder</Link></div>
        </div>
      </section>

      <footer className="bg-white">
        <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8">
          <div className="grid gap-10 border-b border-slate-200 pb-10 md:grid-cols-[1.25fr_.75fr_.75fr_.75fr]">
            <div><BonoaLogo /><p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">Un QR. Todos tus beneficios.</p></div>
            <div><p className="text-xs font-black text-[#0f172a]">Producto</p><div className="mt-4 space-y-2 text-xs font-semibold text-slate-500"><p><a href="#como-funciona" className="hover:text-[#2563EB]">Cómo funciona</a></p><p><a href="#clientes" className="hover:text-[#2563EB]">Para clientes</a></p><p><a href="#negocios" className="hover:text-[#2563EB]">Para negocios</a></p></div></div>
            <div><p className="text-xs font-black text-[#0f172a]">Acceso</p><div className="mt-4 space-y-2 text-xs font-semibold text-slate-500"><p><Link href="/login?next=/wallet" className="hover:text-[#2563EB]">Mi wallet</Link></p><p><Link href="/business" className="hover:text-[#2563EB]">Bonoa Business</Link></p><p><Link href="/register" className="hover:text-[#2563EB]">Crear cuenta</Link></p></div></div>
            <div><p className="text-xs font-black text-[#0f172a]">Ecosistema</p><div className="mt-4 space-y-2 text-xs font-semibold text-slate-500"><p><Link href="/tramassso" className="hover:text-[#2563EB]">Tramassso</Link></p><p><Link href="/forgot-password" className="hover:text-[#2563EB]">Recuperar acceso</Link></p></div></div>
          </div>
          <div className="flex flex-col gap-3 pt-6 text-[10px] font-semibold text-slate-400 sm:flex-row sm:items-center sm:justify-between"><p>© 2026 BONŌA. Todos los derechos reservados.</p><p>Una iniciativa de <span className="font-black text-slate-600">Tramassso</span></p></div>
        </div>
      </footer>
    </main>
  );
}
