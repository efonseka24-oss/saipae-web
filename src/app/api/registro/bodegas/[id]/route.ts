import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";

const INCLUIR = {
  operador: {
    include: { zode: { include: { lote: { include: { departamento: { select: { id: true, nombre: true } } } } } } },
  },
} as const;

async function manejarPATCH(request: NextRequest, ctx: RouteContext<"/api/registro/bodegas/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const { nombre, operadorId } = await request.json();
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (typeof operadorId !== "string" || !operadorId) {
    return NextResponse.json({ error: "Selecciona el operador." }, { status: 400 });
  }

  try {
    const bodega = await db.bodega.update({
      where: { id },
      data: { nombre: nombre.trim(), operadorId },
      include: INCLUIR,
    });
    return NextResponse.json(bodega);
  } catch {
    return NextResponse.json({ error: "Ese operador ya tiene una bodega con ese nombre." }, { status: 409 });
  }
}

async function manejarDELETE(_request: NextRequest, ctx: RouteContext<"/api/registro/bodegas/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  await db.bodega.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const PATCH = conAuditoria(manejarPATCH);
export const DELETE = conAuditoria(manejarDELETE);
