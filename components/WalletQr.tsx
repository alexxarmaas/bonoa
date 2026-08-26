"use client";

import { QRCodeSVG } from "qrcode.react";

export default function WalletQr({ value }: { value: string }) {
  return (
    <div className="rounded-[1.7rem] bg-white p-5 shadow-[0_24px_80px_rgba(255,255,255,.08)] sm:p-7">
      <QRCodeSVG
        value={value}
        size={260}
        level="H"
        bgColor="#ffffff"
        fgColor="#050505"
        marginSize={2}
        className="h-auto w-full max-w-[260px]"
      />
    </div>
  );
}
