"use client";

import { useCallback, useEffect, useState } from "react";
import { MdCheckCircle, MdClose, MdStorefront } from "react-icons/md";
import { friendlyError } from "@/lib/errors";
import { getPendingClubJoins, respondClubJoin, type ClubJoinRequest } from "@/lib/club-join";

type Props = { userId?: string; onApproved?: () => void; dark?: boolean };

export default function ClubJoinRequests({ userId, onApproved, dark = false }: Props) {
  const [requests, setRequests] = useState<ClubJoinRequest[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      const next = await getPendingClubJoins();
      setRequests(next);
      setError(null);
    } catch (cause) {
      setError(friendlyError(cause, "No se pudieron consultar las invitaciones de los comercios."));
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    void reload();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, 6000);
    return () => window.clearInterval(interval);
  }, [reload, userId]);

  const answer = async (request: ClubJoinRequest, accept: boolean) => {
    if (working) return;
    setWorking(request.request_id);
    setError(null);
    setSuccess(null);
    try {
      const result = await respondClubJoin(request.request_id, accept);
      setRequests((current) => current.filter((item) => item.request_id !== request.request_id));
      if (result === "approved") {
        setSuccess(`Ya formas parte de ${request.club_name}. Tu carnet está disponible en la wallet.`);
        onApproved?.();
      } else if (result === "declined") {
        setSuccess(`Has rechazado la solicitud de ${request.business_name}.`);
      } else {
        setSuccess("Esta solicitud ha caducado. Pide al negocio que escanee tu QR de nuevo.");
      }
    } catch (cause) {
      setError(friendlyError(cause, "No se pudo guardar tu decisión."));
    } finally {
      setWorking(null);
    }
  };

  if (!requests.length && !error && !success) return null;

  return (
    <section className={`rounded-[1.6rem] border p-5 sm:p-6 ${dark ? "border-white/10 bg-white/[0.03] text-white" : "border-[#dbe7f5] bg-white text-[#0f172a]"}`} aria-label="Solicitudes para unirte a clubes">
      <div className="flex items-center gap-2">
        <MdStorefront size={20} className={dark ? "text-orange-300" : "text-[#2563eb]"} />
        <h2 className="text-base font-black">Solicitudes de alta en clubes</h2>
      </div>
      {requests.length ? <p className={`mt-2 text-xs leading-5 ${dark ? "text-zinc-400" : "text-[#64748b]"}`}>Un comercio ha escaneado tu QR. Tú decides si quieres unirte a su club: escanearte no implica aceptar automáticamente.</p> : null}
      <div className="mt-4 space-y-3">
        {requests.map((request) => (
          <div key={request.request_id} className={`rounded-2xl border p-4 ${dark ? "border-white/10 bg-black/20" : "border-[#e2e8f0] bg-[#f8fbff]"}`}>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
                {request.business_logo_url ? <img src={request.business_logo_url} alt="" className="h-full w-full object-contain p-1" /> : <MdStorefront size={23} color="#2563eb" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{request.club_name}</p>
                <p className={`mt-1 truncate text-[11px] ${dark ? "text-zinc-400" : "text-[#64748b]"}`}>{request.business_name} · Invitación presencial</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => void answer(request, true)} disabled={Boolean(working)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#2563eb] px-4 py-2.5 text-xs font-black text-white disabled:opacity-40">
                <MdCheckCircle size={16} /> {working === request.request_id ? "Guardando…" : "Unirme al club"}
              </button>
              <button type="button" onClick={() => void answer(request, false)} disabled={Boolean(working)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-xs font-bold disabled:opacity-40 ${dark ? "border-white/15 text-zinc-300" : "border-[#cbd5e1] text-[#475569]"}`}>
                <MdClose size={16} /> Rechazar
              </button>
            </div>
          </div>
        ))}
      </div>
      {error ? <p role="alert" className="mt-3 text-xs text-red-400">{error}</p> : null}
      {success ? <p role="status" className={`mt-3 text-xs ${dark ? "text-emerald-300" : "text-emerald-700"}`}>{success}</p> : null}
    </section>
  );
}
