"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { MdCameraswitch, MdPauseCircleOutline, MdQrCodeScanner } from "react-icons/md";

type QrScannerProps = {
  onResult: (value: string) => void;
  active?: boolean;
  restartToken?: number;
};

export default function QrScanner({ onResult, active = true, restartToken = 0 }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(active);

  useEffect(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraError(null);
    setEnabled(active);
  }, [active, restartToken]);

  useEffect(() => {
    if (!active || !enabled || !videoRef.current) return;

    let cancelled = false;
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 180 });

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (!result || cancelled) return;
        controlsRef.current?.stop();
        controlsRef.current = null;
        setEnabled(false);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(35);
        }
        onResult(result.getText());
      })
      .then((controls) => {
        if (cancelled || !active) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch(() => {
        if (!cancelled) {
          setEnabled(false);
          setCameraError("No pudimos abrir la cámara. Revisa el permiso o pega el código manualmente.");
        }
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [active, enabled, onResult]);

  const restart = () => {
    if (!active) return;
    controlsRef.current?.stop();
    controlsRef.current = null;
    setCameraError(null);
    setEnabled(false);
    window.setTimeout(() => setEnabled(true), 0);
  };

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-black">
      <div className="relative aspect-[4/3] bg-zinc-950">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-[58%] w-[58%] rounded-[1.5rem] border-2 border-orange-400/70 shadow-[0_0_0_999px_rgba(0,0,0,.36)]" />
        </div>
        {!active ? (
          <div className="absolute inset-0 grid place-items-center bg-black/85 p-6 text-center">
            <div>
              <MdPauseCircleOutline size={42} className="mx-auto text-emerald-300/70" />
              <p className="mt-3 text-xs font-black text-white">Cliente activo</p>
              <p className="mt-1 text-[10px] leading-5 text-zinc-500">La cámara se reactivará al terminar con este cliente.</p>
            </div>
          </div>
        ) : !enabled ? (
          <div className="absolute inset-0 grid place-items-center bg-black/75"><MdQrCodeScanner size={42} className="text-orange-300" /></div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-bold text-white">Escáner Bonoa</p>
          <p className="mt-1 text-[10px] text-zinc-600">{active ? "Apunta al QR de la wallet del cliente." : "En pausa para evitar cambiar de cliente por accidente."}</p>
        </div>
        <button
          type="button"
          onClick={restart}
          disabled={!active}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Reiniciar cámara"
        >
          <MdCameraswitch size={20} />
        </button>
      </div>
      {cameraError ? <p className="border-t border-white/8 px-4 py-3 text-xs text-amber-200/80">{cameraError}</p> : null}
    </div>
  );
}
