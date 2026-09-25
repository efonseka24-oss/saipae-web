import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";

const INCLUIR = {
  zode: { include: { lote: { include: { departamento: { select: { id: true, nombre: true } } } } } },
} as const;

async function manejarPATCH(request: NextRequest, ctx: RouteContext<"/api/registro/operadores/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const { nit, nombreRazonSocial, zodeId } = await request.json();
  if (typeof nit !== "string" || !nit.trim()) {
    return NextResponse.json({ error: "El NIT es obligatorio." }, { status: 400 });
  }
  if (typeof nombreRazonSocial !== "string" || !nombreRazonSocial.trim()) {
    return NextResponse.json({ error: "El nombre o razón social es obligatorio." }, { status: 400 });
  }
  if (typeof zodeId !== "string" || !zodeId) {
    return NextResponse.json({ error: "Selecciona el zode." }, { status: 400 });
  }

  try {
    const operador = await db.operador.update({
      where: { id },
      data: { nit: nit.trim(), nombreRazonSocial: nombreRazonSocial.trim(), zodeId },
      include: INCLUIR,
    });
    return NextResponse.json(operador);
  } catch {
    return NextResponse.json({ error: "Ya existe un operador con ese NIT." }, { status: 409 });
  }
}

async function manejarDELETE(_request: NextRequest, ctx: RouteContext<"/api/registro/operadores/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  try {
    await db.operador.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se puede eliminar: tiene bodegas asociadas." }, { status: 409 });
  }
}

export const PATCH = conAuditoria(manejarPATCH);
export const DELETE = conAuditoria(manejarDELETE);
