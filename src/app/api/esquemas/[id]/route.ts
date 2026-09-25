import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";

async function manejarPATCH(request: NextRequest, ctx: RouteContext<"/api/esquemas/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const { nombre, descripcion } = await request.json();
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre del esquema es obligatorio." }, { status: 400 });
  }

  try {
    const esquema = await db.esquema.update({
      where: { id },
      data: { nombre: nombre.trim(), descripcion: descripcion?.trim() || null },
    });
    return NextResponse.json(esquema);
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el esquema." }, { status: 409 });
  }
}

async function manejarDELETE(_request: NextRequest, ctx: RouteContext<"/api/esquemas/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  await db.esquema.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const PATCH = conAuditoria(manejarPATCH);
export const DELETE = conAuditoria(manejarDELETE);
