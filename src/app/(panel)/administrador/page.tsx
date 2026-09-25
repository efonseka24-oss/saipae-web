import Link from "next/link";
import { DatabaseBackup, ScrollText } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { obtenerSesion } from "@/lib/auth";
import { NuevoUsuarioForm } from "@/components/usuarios/NuevoUsuarioForm";
import { FilaUsuario } from "@/components/usuarios/FilaUsuario";

export default async function AdministradorPage() {
  const sesion = await obtenerSesion();
  const usuarios = await db.usuario.findMany({
    orderBy: { usuario: "asc" },
    select: { id: true, usuario: true, nombre: true, cedula: true, activo: true, cargo: true, correo: true, firmaUrl: true, modulosPermitidos: true },
  });

  return (
    <div>
      <PageHeader
        titulo="Administrador"
        descripcion="Crea y edita los usuarios del panel. Cédula, nombre, cargo, correo y firma son obligatorios: el correo une las visitas de la app con su interventor y la cédula sirve para reiniciar la clave."
        acciones={
          <div className="flex shrink-0 items-start gap-2">
            <Link
              href="/administrador/auditoria"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ScrollText className="h-4 w-4" />
              Auditoría
            </Link>
            <Link
              href="/administrador/respaldo"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <DatabaseBackup className="h-4 w-4" />
              Copia de seguridad
            </Link>
            <NuevoUsuarioForm />
          </div>
        }
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Usuario</th>
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Cédula</th>
                <th className="py-2 pr-4">Cargo</th>
                <th className="py-2 pr-4">Correo</th>
                <th className="py-2 pr-4">Firma</th>
                <th className="py-2 pr-4">Módulos</th>
                <th className="py-2 pr-4">Acceso</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <FilaUsuario key={usuario.id} usuario={usuario} esUsuarioActual={usuario.id === sesion?.id} />
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-slate-400">
                    No hay usuarios todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
