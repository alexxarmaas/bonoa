"use client";

import { useEffect, useState } from "react";
import { MdAddToHomeScreen } from "react-icons/md";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallBonoa() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const update = () => setInstalled(media.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    const capture = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const installedEvent = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("beforeinstallprompt", capture);
    window.addEventListener("appinstalled", installedEvent);
    media.addEventListener("change", update);
    const initial = window.setTimeout(update, 0);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("beforeinstallprompt", capture);
      window.removeEventListener("appinstalled", installedEvent);
      media.removeEventListener("change", update);
    };
  }, []);

  const install = async () => {
    if (!prompt) { setOpen(value => !value); return; }
    setBusy(true);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      else setOpen(true);
    } catch { setOpen(true); }
    finally { setPrompt(null); setBusy(false); }
  };

  if (installed) return null;
  return <div className="mt-4">
    <button type="button" onClick={() => void install()} disabled={busy} aria-expanded={open} className="inline-flex items-center gap-2 rounded-full border border-[#cbdcf2] bg-white px-4 py-2.5 text-xs font-bold text-[#334155] disabled:opacity-40"><MdAddToHomeScreen size={18} /> Añadir Bonōa a inicio</button>
    {open ? <div className="mt-3 rounded-2xl border border-[#dbe7f5] bg-white p-4 text-xs leading-6 text-[#475569]">
      <p className="font-bold text-[#0f172a]">Accede a tu QR sin buscar la web</p>
      <p>iPhone: abre Bonōa en Safari, pulsa Compartir y elige Añadir a pantalla de inicio.</p>
      <p>Android: abre el menú de Chrome y selecciona Instalar aplicación o Añadir a pantalla de inicio.</p>
      <p>Si no ves esa opción, abre el enlace en tu navegador habitual. No necesitas Apple Wallet ni Google Wallet. Necesitarás conexión para registrar y consultar operaciones.</p>
    </div> : null}
  </div>;
}
