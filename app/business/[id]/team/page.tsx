"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MdAdminPanelSettings, MdArrowBack, MdDeleteOutline, MdGroups, MdPersonAdd } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  addBusinessMember,
  getBusinessAccess,
  getBusinessTeam,
  removeBusinessMember,
  setBusinessMemberRole,
  type BusinessTeamMember,
} from "@/lib/business-data";
import { friendlyError } from "@/lib/errors";
import type { Database } from "@/lib/supabase/database.types";

type BusinessRole = Database["public"]["Enums"]["business_role"];
type Access = Awaited<ReturnType<typeof getBusinessAccess>>;

const roleLabel: Record<BusinessRole, string> = {
  owner: "Propietario",
  manager: "Manager",
  staff: "Staff",
};

function TeamContent() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const businessId = params.id;
  const [access, setAccess] = useState<Access>(null);
  const [members, setMembers] = useState<BusinessTeamMember[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<BusinessRole>("staff");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reloadTeam = async () => {
    setMembers(await getBusinessTeam(businessId));
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    getBusinessAccess(businessId, user.id)
      .then(async (currentAccess) => {
        if (!active) return;
        setAccess(currentAccess);
        if (currentAccess?.role === "owner" || currentAccess?.role === "manager") {
          const currentMembers = await getBusinessTeam(businessId);
          if (active) setMembers(currentMembers);
        }
      })
      .catch((cause) => {
        if (active) setError(friendlyError(cause, "No hemos podido cargar el equipo."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [businessId, user]);

  const canManage = access?.role === "owner" || access?.role === "manager";
  const ownerCount = useMemo(() => members.filter((member) => member.role === "owner").length, [members]);

  const addMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setAdding(true);
    setError(null);
    setSuccess(null);
    try {
      await addBusinessMember(businessId, email, access?.role === "manager" ? "staff" : role);
      setEmail("");
      setRole("staff");
      await reloadTeam();
      setSuccess("Miembro añadido al equipo.");
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido añadir a este usuario."));
    } finally {
      setAdding(false);
    }
  };

  const changeRole = async (member: BusinessTeamMember, nextRole: BusinessRole) => {
    if (member.role === nextRole) return;
    setBusyId(member.user_id);
    setError(null);
    setSuccess(null);
    try {
      await setBusinessMemberRole(businessId, member.user_id, nextRole);
      await reloadTeam();
      setSuccess(`Rol actualizado para ${member.display_name}.`);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido cambiar el rol."));
    } finally {
      setBusyId(null);
    }
  };

  const removeMember = async (member: BusinessTeamMember) => {
    const confirmed = window.confirm(`¿Retirar a ${member.display_name} del equipo?`);
    if (!confirmed) return;
    setBusyId(member.user_id);
    setError(null);
    setSuccess(null);
    try {
      await removeBusinessMember(businessId, member.user_id);
      await reloadTeam();
      setSuccess(`${member.display_name} ya no pertenece al negocio.`);
    } catch (cause) {
      setError(friendlyError(cause, "No hemos podido retirar al miembro."));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <main className="bonoa-shell"><div className="h-80 animate-pulse rounded-[2rem] border border-white/8 bg-white/[0.03]" /></main>;

  if (!access || !canManage) {
    return <main className="bonoa-shell"><Link href={`/business/${businessId}`} className="text-xs font-bold text-orange-300">← Volver</Link><div className="mt-8 rounded-[2rem] border border-red-400/15 bg-red-400/5 p-8 text-center text-sm text-red-200">Solo propietarios y managers pueden gestionar el equipo.</div></main>;
  }

  return (
    <main className="bonoa-shell min-h-screen">
      <header className="flex items-center gap-4">
        <Link href={`/business/${businessId}`} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver"><MdArrowBack size={20} /></Link>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">{access.business.name}</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">Equipo</h1></div>
      </header>

      <section className="mt-8 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <div className="bonoa-card h-fit rounded-[2rem] p-6">
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-400/15 bg-orange-400/[0.07] text-orange-300"><MdPersonAdd size={22} /></div><div><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-orange-300">Acceso</p><h2 className="mt-1 text-lg font-black text-white">Añadir miembro</h2></div></div>
          <p className="mt-4 text-xs leading-5 text-zinc-500">El usuario debe tener ya una cuenta Bonoa. Introduce el mismo email con el que se registró.</p>
          <form onSubmit={addMember} className="mt-5 space-y-3">
            <label className="block text-xs font-bold text-zinc-400">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="empleado@email.com" className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40" /></label>
            {access.role === "owner" ? <label className="block text-xs font-bold text-zinc-400">Rol<select value={role} onChange={(event) => setRole(event.target.value as BusinessRole)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black px-4 py-3 text-sm text-white outline-none focus:border-orange-400/40"><option value="staff">Staff · escanear y consumir</option><option value="manager">Manager · equipo y catálogo</option><option value="owner">Propietario · control total</option></select></label> : <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3 text-xs text-zinc-500">Como manager puedes añadir miembros con rol <span className="font-bold text-zinc-300">staff</span>.</div>}
            <button disabled={adding} className="brand-gradient w-full rounded-full px-5 py-3 text-xs font-black text-white disabled:opacity-50">{adding ? "Añadiendo…" : "Añadir al equipo"}</button>
          </form>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between gap-4"><div className="flex items-center gap-2"><MdGroups className="text-orange-300" size={21} /><h2 className="text-xl font-black text-white">Miembros</h2></div><span className="rounded-full border border-white/10 px-3 py-1.5 text-[10px] font-bold text-zinc-500">{members.length} miembro{members.length === 1 ? "" : "s"}</span></div>
          {error ? <div className="mb-4 rounded-2xl border border-red-400/15 bg-red-400/5 p-4 text-xs text-red-200">{error}</div> : null}
          {success ? <div className="mb-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-4 text-xs text-emerald-200">{success}</div> : null}
          <div className="space-y-3">
            {members.map((member) => {
              const isSelf = member.user_id === user?.id;
              const lastOwner = member.role === "owner" && ownerCount <= 1;
              const managerCanRemove = access.role === "manager" && member.role === "staff";
              const canRemove = access.role === "owner" ? !lastOwner : managerCanRemove;
              return (
                <article key={member.user_id} className="bonoa-card rounded-[1.5rem] p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="brand-gradient grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-black text-white">{member.display_name.slice(0, 1).toUpperCase()}</div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-black text-white">{member.display_name}</p>{isSelf ? <span className="rounded-full border border-orange-400/15 bg-orange-400/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-orange-300">Tú</span> : null}</div><p className="mt-1 truncate text-xs text-zinc-500">{member.email}</p><p className="mt-1 text-[10px] text-zinc-700">Desde {new Date(member.joined_at).toLocaleDateString("es-ES")}</p></div>
                    <div className="flex flex-wrap items-center gap-2">
                      {access.role === "owner" ? <label className="relative"><span className="sr-only">Rol</span><select disabled={busyId !== null || lastOwner} value={member.role} onChange={(event) => void changeRole(member, event.target.value as BusinessRole)} className="rounded-full border border-white/10 bg-black px-3 py-2 text-[11px] font-bold text-zinc-300 outline-none disabled:opacity-50"><option value="staff">Staff</option><option value="manager">Manager</option><option value="owner">Propietario</option></select></label> : <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-400"><MdAdminPanelSettings size={15} /> {roleLabel[member.role]}</span>}
                      {canRemove ? <button type="button" disabled={busyId !== null} onClick={() => void removeMember(member)} className="grid h-9 w-9 place-items-center rounded-full border border-red-400/15 bg-red-400/5 text-red-300 disabled:opacity-40" aria-label={`Retirar a ${member.display_name}`}><MdDeleteOutline size={18} /></button> : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default function BusinessTeamPage() {
  return <AuthGuard><TeamContent /></AuthGuard>;
}
