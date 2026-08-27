"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdArrowBack, MdBadge, MdEdit, MdEmail, MdLockReset, MdLogout, MdOpenInNew, MdSave, MdSecurity, MdStorefront } from "react-icons/md";
import AccountPrivacyPanel from "@/components/AccountPrivacyPanel";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import { friendlyError } from "@/lib/errors";
import { supabase } from "@/lib/supabase/client";

function ProfileContent() {
  const router = useRouter();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const displayName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "Usuario Bonoa";
  const initial = displayName.slice(0, 1).toUpperCase();
  const publicId = user ? `USR-${user.id.slice(0, 4).toUpperCase()}-${user.id.slice(-4).toUpperCase()}` : "";
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const logout = async () => {
    await signOut();
    router.replace("/login");
  };

  const startEditing = () => {
    setName(displayName);
    setEditing(true);
    setError(null);
    setSuccess(null);
  };

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const nextName = name.trim();
    if (nextName.length < 2) {
      setError("El nombre debe tener al menos 2 caracteres.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    const { error: updateError } = await supabase.from("profiles").update({ display_name: nextName }).eq("id", user.id);
    if (updateError) {
      setError(friendlyError(updateError, "No hemos podido actualizar tu perfil."));
      setSaving(false);
      return;
    }

    await refreshProfile();
    setSaving(false);
    setEditing(false);
    setSuccess("Perfil actualizado.");
  };

  return (
    <main className="bonoa-shell pb-24">
      <header className="flex items-center gap-4">
        <Link href="/wallet" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver a la wallet"><MdArrowBack size={20} /></Link>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Cuenta</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">Perfil</h1></div>
      </header>

      <section className="bonoa-card mt-8 rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="brand-gradient grid h-16 w-16 place-items-center rounded-2xl text-xl font-black text-white">{initial}</div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-black text-white">{displayName}</h2>
            <p className="mt-1 text-xs font-semibold tracking-[0.16em] text-zinc-500">{publicId}</p>
          </div>
          <button type="button" onClick={editing ? () => setEditing(false) : startEditing} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Editar perfil"><MdEdit size={18} /></button>
        </div>

        {editing ? (
          <form onSubmit={saveProfile} className="mt-6 rounded-[1.5rem] border border-white/8 bg-black/20 p-4">
            <label className="text-xs font-bold text-zinc-400">Nombre visible<input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
            <div className="mt-3 flex gap-2"><button disabled={saving} className="brand-gradient inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"><MdSave size={17} /> {saving ? "Guardando…" : "Guardar"}</button><button type="button" onClick={() => setEditing(false)} className="rounded-full border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-400">Cancelar</button></div>
          </form>
        ) : null}

        {error ? <p className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/5 px-4 py-3 text-xs text-red-200">{error}</p> : null}
        {success ? <p className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs text-emerald-200">{success}</p> : null}

        <div className="mt-8 divide-y divide-white/8 border-y border-white/8">
          <div className="flex items-center gap-3 py-4 text-sm text-zinc-300"><MdBadge className="text-orange-300" size={20} /> Identidad Bonoa activa</div>
          <div className="flex min-w-0 items-center gap-3 py-4 text-sm text-zinc-300"><MdEmail className="shrink-0 text-orange-300" size={20} /><span className="truncate">{profile?.email || user?.email}</span></div>
          <div className="flex items-center gap-3 py-4 text-sm text-zinc-300"><MdSecurity className="text-orange-300" size={20} /> Sesión protegida por Supabase Auth</div>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/business" className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-4 py-2.5 text-xs font-bold text-orange-200 transition hover:bg-orange-400/15"><MdStorefront size={18} /> Bonoa Business</Link>
          <Link href="/tramassso" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300 transition hover:bg-white/10"><MdOpenInNew size={17} /> Volver a Tramassso</Link>
          <Link href="/reset-password" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-bold text-zinc-300 transition hover:bg-white/10"><MdLockReset size={18} /> Cambiar contraseña</Link>
          <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-full border border-red-400/15 bg-red-400/5 px-4 py-2.5 text-xs font-bold text-red-200 transition hover:bg-red-400/10"><MdLogout size={17} /> Cerrar sesión</button>
        </div>
      </section>

      <AccountPrivacyPanel />
    </main>
  );
}

export default function ProfilePage() {
  return <AuthGuard><ProfileContent /></AuthGuard>;
}
