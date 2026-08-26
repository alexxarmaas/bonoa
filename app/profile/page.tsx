"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdArrowBack, MdBadge, MdEmail, MdLogout, MdSecurity } from "react-icons/md";
import AuthGuard from "@/components/auth/AuthGuard";
import { useAuth } from "@/components/auth/AuthProvider";

function ProfileContent() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const displayName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "Usuario Bonoa";
  const initial = displayName.slice(0, 1).toUpperCase();
  const publicId = user ? `USR-${user.id.slice(0, 4).toUpperCase()}-${user.id.slice(-4).toUpperCase()}` : "";

  const logout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <main className="bonoa-shell">
      <header className="flex items-center gap-4">
        <Link href="/" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 hover:text-white" aria-label="Volver"><MdArrowBack size={20} /></Link>
        <div><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-300">Cuenta</p><h1 className="mt-1 text-2xl font-black tracking-tight text-white">Perfil</h1></div>
      </header>

      <section className="bonoa-card mt-8 rounded-[2rem] p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="brand-gradient grid h-16 w-16 place-items-center rounded-2xl text-xl font-black text-white">{initial}</div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black text-white">{displayName}</h2>
            <p className="mt-1 text-xs font-semibold tracking-[0.16em] text-zinc-500">{publicId}</p>
          </div>
        </div>

        <div className="mt-8 divide-y divide-white/8 border-y border-white/8">
          <div className="flex items-center gap-3 py-4 text-sm text-zinc-300"><MdBadge className="text-orange-300" size={20} /> Identidad Bonoa activa</div>
          <div className="flex min-w-0 items-center gap-3 py-4 text-sm text-zinc-300"><MdEmail className="shrink-0 text-orange-300" size={20} /><span className="truncate">{profile?.email || user?.email}</span></div>
          <div className="flex items-center gap-3 py-4 text-sm text-zinc-300"><MdSecurity className="text-orange-300" size={20} /> Sesión protegida por Supabase Auth</div>
        </div>

        <button type="button" onClick={logout} className="mt-7 inline-flex items-center gap-2 rounded-full border border-red-400/15 bg-red-400/5 px-4 py-2.5 text-xs font-bold text-red-200 transition hover:bg-red-400/10"><MdLogout size={17} /> Cerrar sesión</button>
      </section>
    </main>
  );
}

export default function ProfilePage() {
  return <AuthGuard><ProfileContent /></AuthGuard>;
}
