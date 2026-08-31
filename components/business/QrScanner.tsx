"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { MdCameraswitch, MdPauseCircleOutline, MdQrCodeScanner } from "react-icons/md";

type QrScannerProps = {
  onResult: (value: string) => void;
  active?: boolean;
  restartToken?: number;
};

type CameraError = {
  scanKey: string;
  message: string;
};

export default function QrScanner({ onResult, active = true, restartToken = 0 }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [manualRestart, setManualRestart] = useState(0);
  const [cameraError, setCameraError] = useState<CameraError | null>(null);
  const scanKey = `${restartToken}:${manualRestart}`;

  useEffect(() => {
    if (!active || !videoRef.current) return;

    let cancelled = false;
    let handled = false;
    const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 180 });

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (!result || cancelled || handled) return;
        handled = true;
        controlsRef.current?.stop();
        controlsRef.current = null;
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(35);
        onResult(result.getText());
      })
      .then((controls) => {
        if (cancelled || !active || handled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
      })
      .catch(() => {
        if (!cancelled) {
          setCameraError({ scanKey, message: "No pudimos abrir la cámara. Revisa el permiso o pega el código manualmente." });
        }
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [active, onResult, scanKey]);

  const restart = () => {
    if (!active) return;
    controlsRef.current?.stop();
    controlsRef.current = null;
    setManualRestart((value) => value + 1);
  };

  const visibleError = cameraError?.scanKey === scanKey ? cameraError.message : null;

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-[#dbe7f5] bg-white shadow-[0_18px_50px_rgba(15,23,42,.07)]">
      <div className="relative aspect-[4/3]" style={{ backgroundColor: "#020617" }}>
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-[58%] w-[58%] rounded-[1.5rem] border-2 border-[#38bdf8] shadow-[0_0_0_999px_rgba(2,6,23,.38)]" />
        </div>
        {!active ? (
          <div className="absolute inset-0 grid place-items-center p-6 text-center" style={{ backgroundColor: "rgba(2,6,23,.88)" }}>
            <div>
              <MdPauseCircleOutline size={42} className="mx-auto text-[#5eead4]" />
              <p className="mt-3 text-xs font-black" style={{ color: "#ffffff" }}>Cliente activo</p>
              <p className="mt-1 text-[10px] leading-5" style={{ color: "#94a3b8" }}>La cámara se reactivará al terminar con este cliente.</p>
            </div>
          </div>
        ) : visibleError ? (
          <div className="absolute inset-0 grid place-items-center" style={{ backgroundColor: "rgba(2,6,23,.78)" }}><MdQrCodeScanner size={42} className="text-[#67e8f9]" /></div>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-bold text-[#0f172a]">Escáner Bonoa</p>
          <p className="mt-1 text-[10px] text-[#64748b]">{active ? "Apunta al QR de la wallet del cliente." : "En pausa para evitar cambiar de cliente por accidente."}</p>
        </div>
        <button type="button" onClick={restart} disabled={!active} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#dbe7f5] bg-[#f8fbff] text-[#2563eb] transition hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-30" aria-label="Reiniciar cámara">
          <MdCameraswitch size={20} />
        </button>
      </div>
      {visibleError ? <p className="border-t border-[#dbe7f5] bg-[#ecfeff] px-4 py-3 text-xs text-[#0e7490]">{visibleError}</p> : null}
    </div>
  );
}
