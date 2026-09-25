import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";

const INCLUIR = {
  lote: { include: { departamento: { select: { id: true, nombre: true } } } },
} as const;

async function manejarPATCH(request: NextRequest, ctx: RouteContext<"/api/registro/zodes/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const { nombre, loteId } = await request.json();
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (typeof loteId !== "string" || !loteId) {
    return NextResponse.json({ error: "Selecciona el lote." }, { status: 400 });
  }

  try {
    const zode = await db.zode.update({
      where: { id },
      data: { nombre: nombre.trim(), loteId },
      include: INCLUIR,
    });
    return NextResponse.json(zode);
  } catch {
    return NextResponse.json({ error: "Ya existe un zode con ese nombre en ese lote." }, { status: 409 });
  }
}

async function manejarDELETE(_request: NextRequest, ctx: RouteContext<"/api/registro/zodes/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  try {
    await db.zode.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se puede eliminar: tiene municipios u operadores asociados." },
      { status: 409 }
    );
  }
}

export const PATCH = conAuditoria(manejarPATCH);
export const DELETE = conAuditoria(manejarDELETE);
