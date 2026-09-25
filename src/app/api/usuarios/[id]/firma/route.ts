import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { guardarFirma, validarFirma } from "@/lib/firmaUsuario";
import { conAuditoria } from "@/lib/auditoria";

async function manejarPOST(request: NextRequest, ctx: RouteContext<"/api/usuarios/[id]/firma">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const usuario = await db.usuario.findUnique({ where: { id } });
  if (!usuario) return NextResponse.json({ error: "El usuario no existe." }, { status: 404 });

  const formData = await request.formData();
  const archivo = formData.get("firma");
  const error = validarFirma(archivo);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const firmaUrl = await guardarFirma(id, archivo as File, usuario.firmaUrl);
  const actualizado = await db.usuario.update({
    where: { id },
    data: { firmaUrl },
    select: { id: true, usuario: true, nombre: true, cedula: true, activo: true, cargo: true, correo: true, firmaUrl: true },
  });

  return NextResponse.json(actualizado);
}

export const POST = conAuditoria(manejarPOST);
