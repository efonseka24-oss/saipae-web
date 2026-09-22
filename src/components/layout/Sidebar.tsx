"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutGrid,
  ClipboardList,
  FileText,
  LayoutTemplate,
  BarChart3,
  MessageSquareWarning,
  ShieldCheck,
  ListTree,
  LogOut,
  Landmark,
  MapPinned,
  Users2,
  FlaskConical,
} from "lucide-react";
import { MODULOS, type Modulo, type ModuloId } from "@/lib/modulos";
import clsx from "clsx";

const ICONOS: Record<Modulo["icono"], React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutGrid,
  tabulacion: ClipboardList,
  formatos: FileText,
  plantillas: LayoutTemplate,
  informes: BarChart3,
  pqrs: MessageSquareWarning,
  administrador: ShieldCheck,
  esquemas: ListTree,
  empresa: Landmark,
  registro: MapPinned,
  caes: Users2,
  laboratorios: FlaskConical,
};

export function Sidebar({ nombreUsuario, modulosPermitidos }: { nombreUsuario: string; modulosPermitidos: ModuloId[] }) {
  const pathname = usePathname();
  const modulosVisibles = MODULOS.filter((m) => modulosPermitidos.includes(m.id));

  return (
    <aside className="flex h-full w-72 flex-col bg-[#0b1220] text-slate-300">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-base font-bold leading-tight text-white">SAIPAE</p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Panel Administrativo
          </p>
        </div>
      </div>

      <div className="mx-5 mb-2 border-t border-white/10" />

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {modulosVisibles.map((modulo) => {
          const Icono = ICONOS[modulo.icono];
          const activo = pathname === modulo.href || pathname.startsWith(`${modulo.href}/`);

          return (
            <Link
              key={modulo.id}
              href={modulo.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                activo
                  ? "bg-blue-600/15 text-white ring-1 ring-inset ring-blue-500/30"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icono className="h-4 w-4 shrink-0" />
              <span className="truncate">{modulo.etiqueta}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mx-5 border-t border-white/10" />

      <div className="px-5 py-4">
        <p className="truncate text-sm font-medium text-white">{nombreUsuario}</p>
        <form action="/api/auth/logout" method="POST">
          <button
            type="submit"
            className="mt-2 flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
