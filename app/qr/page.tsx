import Link from "next/link";
import { MdArrowBack, MdLockOutline, MdQrCode2 } from "react-icons/md";
import WalletQr from "@/components/WalletQr";
import { demoUser } from "@/lib/mock-data";

export default function QrPage() {
  return (
    <main className="bonoa-shell flex min-h-screen flex-col">
      <header className="flex items-center justify-between">
        <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver">
          <MdArrowBack size={20} />
        </Link>
        <span className="text-sm font-black tracking-tight text-white">Mi QR</span>
        <span className="h-10 w-10" />
      </header>

      <section className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center py-10 text-center">
        <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-orange-400/20 bg-orange-400/10 text-orange-300">
          <MdQrCode2 size={28} />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-orange-300">Bonoa ID</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] text-white">Tu wallet, en un gesto.</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">Muéstralo al establecimiento para identificar tu wallet y aplicar el bono correspondiente.</p>

        <div className="mt-8">
          <WalletQr value={demoUser.qrToken} />
        </div>

        <p className="mt-5 text-xs font-bold tracking-[0.18em] text-zinc-400">{demoUser.publicId}</p>
        <div className="mt-7 flex max-w-sm items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-4 text-left">
          <MdLockOutline className="mt-0.5 shrink-0 text-zinc-500" size={18} />
          <p className="text-xs leading-5 text-zinc-500">El QR no contiene tu saldo ni datos personales. En producción usará un token seguro y rotatorio.</p>
        </div>
      </section>
    </main>
  );
}
