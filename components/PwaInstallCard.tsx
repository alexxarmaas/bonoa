"use client";

import { useEffect, useState } from "react";
import { MdAddToHomeScreen, MdClose, MdIosShare, MdInstallMobile } from "react-icons/md";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

const DISMISS_KEY = "bonoa:pwa-install-dismissed-until";
const DISMISS_DAYS = 14;

function isIosDevice() {
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as NavigatorWithStandalone).standalone);
}

export default function PwaInstallCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;

    const dismissedUntil = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedUntil > Date.now()) return;

    const iosDevice = isIosDevice();
    setIos(iosDevice);
    if (iosDevice) setVisible(true);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleInstalled = () => {
      setVisible(false);
      setInstallPrompt(null);
      window.localStorage.removeItem(DISMISS_KEY);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const dismiss = () => {
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(DISMISS_KEY, String(until));
    setVisible(false);
  };

  const install = async () => {
    if (!installPrompt) return;
    setInstalling(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setVisible(false);
      setInstallPrompt(null);
    } finally {
      setInstalling(false);
    }
  };

  if (!visible) return null;

  return (
    <section className="fixed bottom-24 left-4 right-4 z-40 overflow-hidden rounded-[1.8rem] border border-[#bfdbfe] bg-gradient-to-br from-white via-[#f4f8ff] to-[#ecfeff] p-5 shadow-[0_24px_70px_rgba(15,23,42,.18)] sm:bottom-6 sm:left-auto sm:right-6 sm:w-[28rem] sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-[#2563eb]/10 blur-3xl" />
      <button type="button" onClick={dismiss} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-[#94a3b8] transition hover:bg-white hover:text-[#334155]" aria-label="Ocultar instalación">
        <MdClose size={18} />
      </button>

      <div className="flex items-start gap-4 pr-8">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#06b6d4] text-white shadow-[0_10px_28px_rgba(37,99,235,.2)]">
          <MdInstallMobile size={25} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#2563eb]">Bonoa en tu móvil</p>
          <h2 className="mt-1 text-lg font-black tracking-tight text-[#0f172a]">Abre tu wallet como una app.</h2>
          <p className="mt-2 text-xs leading-5 text-[#64748b]">Tu QR, carnets y premios desde la pantalla de inicio, sin buscar Bonoa en el navegador.</p>
        </div>
      </div>

      {installPrompt ? (
        <button type="button" onClick={() => void install()} disabled={installing} className="brand-gradient mt-5 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-60">
          <MdAddToHomeScreen size={19} /> {installing ? "Abriendo instalación…" : "Instalar Bonoa"}
        </button>
      ) : ios ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#dbeafe] bg-white/85 px-4 py-3 text-xs text-[#475569]">
          <span className="inline-flex items-center gap-1.5 font-black text-[#0f172a]"><MdIosShare size={18} className="text-[#2563eb]" /> En Safari:</span>
          <span>Compartir</span><span className="text-[#94a3b8]">→</span><span className="font-bold">Añadir a pantalla de inicio</span>
        </div>
      ) : null}
    </section>
  );
}
