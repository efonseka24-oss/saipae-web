import { NextRequest, NextResponse } from "next/server";
import { cerrarSesion, obtenerSesion } from "@/lib/auth";
import { anotarAuditoria, conAuditoria } from "@/lib/auditoria";

async function manejarPOST(request: NextRequest) {
  // La sesión se lee antes de borrar la cookie, para que la auditoría sepa quién salió.
  const sesion = await obtenerSesion();
  if (sesion) {
    anotarAuditoria(request, { usuarioId: sesion.id, usuario: sesion.usuario, nombre: sesion.nombre, descripcion: "Cerró sesión" });
  }
  await cerrarSesion();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const POST = conAuditoria(manejarPOST);
