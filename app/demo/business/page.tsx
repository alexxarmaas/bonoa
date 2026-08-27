import Link from "next/link";
import {
  MdArrowBack,
  MdArrowForward,
  MdAutoAwesome,
  MdCampaign,
  MdGroups,
  MdHistory,
  MdPersonAddAlt1,
  MdPointOfSale,
  MdQrCodeScanner,
  MdRedeem,
  MdShoppingBag,
  MdTrendingUp,
  MdWarningAmber,
} from "react-icons/md";
import BonoaLogo from "@/components/brand/BonoaLogo";

const customers = [
  { code: "CL-9F2A", segment: "Fiel", detail: "8/10 compras · a 2 del premio", last: "Hoy, 12:18" },
  { code: "CL-3B71", segment: "Activo", detail: "4/10 compras · 286 € identificados", last: "Hoy, 11:42" },
  { code: "CL-7C10", segment: "En riesgo", detail: "47 días sin volver", last: "11 jul" },
  { code: "CL-1D84", segment: "Nuevo", detail: "Primera compra · 68 €", last: "Ayer" },
];

const campaigns = [
  { name: "Vuelve esta semana", audience: "18 clientes en riesgo", claims: "7 reclamaciones", revenue: "436 € retorno" },
  { name: "A una compra del premio", audience: "9 clientes", claims: "5 visitas", revenue: "312 € retorno" },
];

function Metric({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: typeof MdGroups }) {
  return (
    <article className="bonoa-card rounded-[1.55rem] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[9px] font-black uppercase tracking-[.17em] text-[#64748b]">{label}</p>
        <Icon size={19} className="text-[#2563eb]" />
      </div>
      <p className="mt-4 text-3xl font-black tracking-[-.04em] text-[#0f172a]">{value}</p>
      <p className="mt-1 text-[10px] font-semibold text-[#94a3b8]">{note}</p>
    </article>
  );
}

export default function BusinessDemoPage() {
  return (
    <main className="bonoa-shell min-h-screen pb-20">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-[#dbe7f5] bg-white text-[#475569] shadow-sm" aria-label="Volver"><MdArrowBack size={19} /></Link>
          <BonoaLogo />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#bfdbfe] bg-[#eff6ff] px-3 py-2 text-[10px] font-black uppercase tracking-[.15em] text-[#2563eb]">Demo · datos ficticios</span>
          <Link href="/register?next=/business" className="brand-gradient inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-black text-white">Crear mi negocio <MdArrowForward size={16} /></Link>
        </div>
      </header>

      <section className="mt-8 overflow-hidden rounded-[2rem] border border-[#bfdbfe] bg-gradient-to-br from-white via-[#f4f8ff] to-[#ecfeff] p-6 shadow-[0_22px_65px_rgba(37,99,235,.09)] sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#2563eb]">Bonoa Business · vista comercial</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-.05em] text-[#0f172a] sm:text-5xl">StarGarage Demo</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#64748b]">Así se ve un negocio cuando Bonoa ya tiene suficiente actividad para convertir compras y visitas en decisiones: quién vuelve, quién está cerca de premio y a quién conviene recuperar.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-4 py-2.5 text-xs font-black text-[#334155]"><MdPointOfSale size={17} /> Registrar compra</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-4 py-2.5 text-xs font-black text-[#334155]"><MdQrCodeScanner size={17} /> Escanear QR</span>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Socios" value="126" note="+24 este mes" icon={MdGroups} />
        <Metric label="Recurrencia" value="62%" note="78 clientes recurrentes" icon={MdTrendingUp} />
        <Metric label="Compras · 30d" value="214" note="8.420 € identificados" icon={MdShoppingBag} />
        <Metric label="Premios · 30d" value="31" note="24 clientes premiados" icon={MdRedeem} />
        <Metric label="Referidos" value="17" note="8 ya convertidos" icon={MdPersonAddAlt1} />
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <article className="rounded-[1.65rem] border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start justify-between gap-4"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-amber-600 shadow-sm"><MdWarningAmber size={22} /></div><span className="text-3xl font-black text-[#0f172a]">18</span></div>
          <h2 className="mt-5 text-lg font-black text-[#0f172a]">Clientes en riesgo</h2>
          <p className="mt-2 text-xs leading-5 text-[#64748b]">Llevan más de 45 días sin volver. Bonoa los deja listos para una campaña de retorno.</p>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[.14em] text-amber-700">Crear campaña de retorno →</p>
        </article>
        <article className="rounded-[1.65rem] border border-cyan-200 bg-cyan-50 p-5">
          <div className="flex items-start justify-between gap-4"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-cyan-600 shadow-sm"><MdAutoAwesome size={22} /></div><span className="text-3xl font-black text-[#0f172a]">9</span></div>
          <h2 className="mt-5 text-lg font-black text-[#0f172a]">Cerca de un premio</h2>
          <p className="mt-2 text-xs leading-5 text-[#64748b]">Clientes en el último tramo del objetivo. Un recordatorio puede convertir progreso en una visita.</p>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[.14em] text-cyan-700">Ver clientes →</p>
        </article>
        <article className="rounded-[1.65rem] border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-start justify-between gap-4"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-[#2563eb] shadow-sm"><MdTrendingUp size={22} /></div><span className="text-3xl font-black text-[#0f172a]">24</span></div>
          <h2 className="mt-5 text-lg font-black text-[#0f172a]">Nuevos este mes</h2>
          <p className="mt-2 text-xs leading-5 text-[#64748b]">Primeras relaciones creadas con el carnet digital de StarGarage.</p>
          <p className="mt-4 text-[10px] font-black uppercase tracking-[.14em] text-[#2563eb]">Revisar nuevos →</p>
        </article>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
        <div className="bonoa-card rounded-[1.8rem] p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#2563eb]">Clientes</p><h2 className="mt-1 text-xl font-black text-[#0f172a]">Radar de fidelización</h2></div><MdGroups size={23} className="text-[#2563eb]" /></div>
          <div className="mt-5 divide-y divide-[#e2e8f0]">
            {customers.map((customer) => (
              <div key={customer.code} className="grid gap-2 py-4 sm:grid-cols-[.65fr_.6fr_1.4fr_.6fr] sm:items-center">
                <p className="font-mono text-xs font-black text-[#0f172a]">{customer.code}</p>
                <span className={`w-fit rounded-full px-2.5 py-1 text-[9px] font-black ${customer.segment === "En riesgo" ? "bg-amber-50 text-amber-700" : customer.segment === "Fiel" ? "bg-blue-50 text-[#2563eb]" : customer.segment === "Nuevo" ? "bg-cyan-50 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>{customer.segment}</span>
                <p className="text-xs font-semibold text-[#475569]">{customer.detail}</p>
                <p className="text-[10px] text-[#94a3b8] sm:text-right">{customer.last}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bonoa-card rounded-[1.8rem] p-5 sm:p-6">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#2563eb]">Campañas</p><h2 className="mt-1 text-xl font-black text-[#0f172a]">Retorno medible</h2></div><MdCampaign size={23} className="text-[#2563eb]" /></div>
            <div className="mt-5 space-y-3">{campaigns.map((campaign) => <div key={campaign.name} className="rounded-2xl border border-[#e2e8f0] bg-[#f8fbff] p-4"><p className="text-sm font-black text-[#0f172a]">{campaign.name}</p><p className="mt-1 text-[10px] text-[#64748b]">{campaign.audience}</p><div className="mt-3 flex flex-wrap gap-2 text-[9px] font-black"><span className="rounded-full bg-white px-2.5 py-1 text-[#475569]">{campaign.claims}</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{campaign.revenue}</span></div></div>)}</div>
          </div>

          <div className="rounded-[1.8rem] bg-[#0f172a] p-5 text-white shadow-[0_22px_60px_rgba(15,23,42,.18)] sm:p-6">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">Referidos</p><h2 className="mt-1 text-xl font-black">Clientes que traen clientes</h2></div><MdPersonAddAlt1 size={24} className="text-cyan-300" /></div>
            <div className="mt-5 grid grid-cols-3 gap-3"><div><p className="text-2xl font-black">17</p><p className="text-[9px] text-slate-400">invitaciones</p></div><div><p className="text-2xl font-black">11</p><p className="text-[9px] text-slate-400">aceptadas</p></div><div><p className="text-2xl font-black">8</p><p className="text-[9px] text-slate-400">convertidas</p></div></div>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-[2rem] border border-[#bfdbfe] bg-white p-6 text-center shadow-[0_20px_60px_rgba(37,99,235,.07)] sm:p-8">
        <MdHistory size={26} className="mx-auto text-[#2563eb]" />
        <h2 className="mt-4 text-2xl font-black tracking-tight text-[#0f172a]">Esto es Bonoa con datos. El piloto empieza mucho antes.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#64748b]">Un negocio puede empezar con un carnet, una regla y un QR. El dashboard gana valor automáticamente a medida que entran compras, visitas, premios y retornos.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/register?next=/business" className="brand-gradient inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white">Crear mi negocio <MdArrowForward size={17} /></Link><Link href="/" className="inline-flex items-center gap-2 rounded-full border border-[#dbe7f5] bg-white px-5 py-3 text-xs font-black text-[#334155]">Volver a la landing</Link></div>
      </section>
    </main>
  );
}
