import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";

async function manejarPATCH(request: NextRequest, ctx: RouteContext<"/api/registro/lotes/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const { nombre, departamentoId } = await request.json();
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (typeof departamentoId !== "string" || !departamentoId) {
    return NextResponse.json({ error: "Selecciona el departamento." }, { status: 400 });
  }

  try {
    const lote = await db.lote.update({
      where: { id },
      data: { nombre: nombre.trim(), departamentoId },
      include: { departamento: { select: { id: true, nombre: true } } },
    });
    return NextResponse.json(lote);
  } catch {
    return NextResponse.json({ error: "Ya existe un lote con ese nombre en ese departamento." }, { status: 409 });
  }
}

async function manejarDELETE(_request: NextRequest, ctx: RouteContext<"/api/registro/lotes/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  try {
    await db.lote.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se puede eliminar: tiene zodes asociados." }, { status: 409 });
  }
}

export const PATCH = conAuditoria(manejarPATCH);
export const DELETE = conAuditoria(manejarDELETE);
