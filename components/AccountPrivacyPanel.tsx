"use client";

import { useEffect, useState } from "react";
import {
  MdCancel,
  MdDeleteOutline,
  MdDownload,
  MdEmail,
  MdInfoOutline,
  MdNotificationsNone,
  MdSave,
} from "react-icons/md";
import { friendlyError } from "@/lib/errors";
import {
  cancelAccountDeletion,
  downloadJsonFile,
  exportMyBonoaData,
  getAccountDeletionRequest,
  getPrivacyPreferences,
  requestAccountDeletion,
  savePrivacyPreferences,
  type AccountDeletionRequest,
} from "@/lib/privacy-controls";

export default function AccountPrivacyPanel() {
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [productUpdates, setProductUpdates] = useState(false);
  const [deletionRequest, setDeletionRequest] = useState<AccountDeletionRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [changingDeletion, setChangingDeletion] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getPrivacyPreferences(), getAccountDeletionRequest()])
      .then(([preferences, deletion]) => {
        if (!active) return;
        setMarketingEmails(preferences.marketing_emails);
        setProductUpdates(preferences.product_updates);
        setDeletionRequest(deletion);
      })
      .catch((cause) => {
        if (active) setError(friendlyError(cause, "No hemos podido cargar tus controles de privacidad."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const preferences = await savePrivacyPreferences({ marketingEmails, productUpdates });
      setMarketingEmails(preferences.marketing_emails);
      setProductUpdates(preferences.product_updates);
      setMessage("Preferencias guardadas.");
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido guardar tus preferencias."));
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    setError(null);
    setMessage(null);
    try {
      const data = await exportMyBonoaData();
      const stamp = new Date().toISOString().slice(0, 10);
      downloadJsonFile(data, `bonoa-mis-datos-${stamp}.json`);
      setMessage("Exportación preparada y descargada.");
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido exportar tus datos."));
    } finally {
      setExporting(false);
    }
  };

  const requestDeletion = async () => {
    if (!window.confirm("¿Quieres solicitar la eliminación de tu cuenta Bonoa? La solicitud se podrá cancelar mientras siga pendiente.")) return;
    setChangingDeletion(true);
    setError(null);
    setMessage(null);
    try {
      const request = await requestAccountDeletion();
      setDeletionRequest(request);
      setMessage("Solicitud registrada. La revisaremos antes de ejecutar una eliminación irreversible.");
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido registrar la solicitud."));
    } finally {
      setChangingDeletion(false);
    }
  };

  const cancelDeletion = async () => {
    setChangingDeletion(true);
    setError(null);
    setMessage(null);
    try {
      const request = await cancelAccountDeletion();
      setDeletionRequest(request);
      setMessage("Solicitud de eliminación cancelada.");
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido cancelar la solicitud."));
    } finally {
      setChangingDeletion(false);
    }
  };

  return (
    <section className="bonoa-card mt-6 rounded-[2rem] p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eff6ff] text-[#2563eb]"><MdInfoOutline size={22} /></div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#2563eb]">Privacidad y datos</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-[#0f172a]">Tú decides qué comunicaciones recibes.</h2>
          <p className="mt-2 text-xs leading-5 text-[#64748b]">Las comunicaciones opcionales están desactivadas por defecto. Los avisos necesarios para seguridad y funcionamiento de la wallet no dependen de estas preferencias.</p>
        </div>
      </div>

      {loading ? <div className="mt-6 h-32 animate-pulse rounded-2xl bg-[#f1f5f9]" /> : (
        <>
          <div className="mt-6 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#dbe7f5] bg-white p-4">
              <input type="checkbox" checked={marketingEmails} onChange={(event) => setMarketingEmails(event.target.checked)} className="mt-1 h-4 w-4 accent-[#2563eb]" />
              <span><span className="flex items-center gap-2 text-sm font-black text-[#0f172a]"><MdEmail size={18} className="text-[#2563eb]" /> Ofertas y ventajas</span><span className="mt-1 block text-xs leading-5 text-[#64748b]">Permitir correos promocionales relacionados con ventajas, campañas o negocios de Bonoa.</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#dbe7f5] bg-white p-4">
              <input type="checkbox" checked={productUpdates} onChange={(event) => setProductUpdates(event.target.checked)} className="mt-1 h-4 w-4 accent-[#2563eb]" />
              <span><span className="flex items-center gap-2 text-sm font-black text-[#0f172a]"><MdNotificationsNone size={18} className="text-[#06b6d4]" /> Novedades de Bonoa</span><span className="mt-1 block text-xs leading-5 text-[#64748b]">Recibir novedades puntuales sobre funciones, mejoras y cambios relevantes del producto.</span></span>
            </label>
          </div>

          <button type="button" onClick={() => void save()} disabled={saving} className="brand-gradient mt-4 inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-60"><MdSave size={17} /> {saving ? "Guardando…" : "Guardar preferencias"}</button>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => void exportData()} disabled={exporting} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#dbe7f5] bg-white px-4 py-3.5 text-xs font-black text-[#334155] transition hover:bg-[#f8fbff] disabled:opacity-60"><MdDownload size={18} className="text-[#2563eb]" /> {exporting ? "Preparando…" : "Descargar mis datos"}</button>
            {deletionRequest?.status === "pending" ? (
              <button type="button" onClick={() => void cancelDeletion()} disabled={changingDeletion} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-xs font-black text-amber-800 disabled:opacity-60"><MdCancel size={18} /> {changingDeletion ? "Actualizando…" : "Cancelar eliminación"}</button>
            ) : (
              <button type="button" onClick={() => void requestDeletion()} disabled={changingDeletion} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-xs font-black text-red-700 disabled:opacity-60"><MdDeleteOutline size={18} /> {changingDeletion ? "Registrando…" : "Solicitar eliminación"}</button>
            )}
          </div>

          {deletionRequest?.status === "pending" ? <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">Tienes una solicitud de eliminación pendiente desde {new Date(deletionRequest.requested_at).toLocaleDateString("es-ES")}. No eliminaremos tu cuenta de forma automática sin una revisión previa.</p> : null}
          {message ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p> : null}

          <p className="mt-5 text-[11px] leading-5 text-[#94a3b8]">Más información en <a href="/privacidad" className="font-bold text-[#2563eb]">Privacidad</a> y <a href="/terminos" className="font-bold text-[#2563eb]">Condiciones de uso</a>. Para otras solicitudes: <a href="mailto:partnerships@tramassso.com" className="font-bold text-[#2563eb]">partnerships@tramassso.com</a>.</p>
        </>
      )}
    </section>
  );
}
