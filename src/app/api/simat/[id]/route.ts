import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";
import { INCLUIR_ESTUDIANTE_SIMAT, validarEstudianteSimat } from "@/lib/simat";

async function manejarPATCH(request: NextRequest, ctx: RouteContext<"/api/simat/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const actual = await db.estudianteSimat.findUnique({ where: { id } });
  if (!actual) return NextResponse.json({ error: "El estudiante no existe." }, { status: 404 });

  const validacion = await validarEstudianteSimat(await request.json());
  if ("error" in validacion) return NextResponse.json({ error: validacion.error }, { status: 400 });

  try {
    const estudiante = await db.estudianteSimat.update({ where: { id }, data: validacion.datos, include: INCLUIR_ESTUDIANTE_SIMAT });
    return NextResponse.json(estudiante);
  } catch {
    return NextResponse.json({ error: "Ya existe un estudiante con ese ID SIMAT." }, { status: 409 });
  }
}

async function manejarDELETE(_request: NextRequest, ctx: RouteContext<"/api/simat/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const actual = await db.estudianteSimat.findUnique({ where: { id } });
  if (!actual) return NextResponse.json({ error: "El estudiante no existe." }, { status: 404 });

  await db.estudianteSimat.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const PATCH = conAuditoria(manejarPATCH);
export const DELETE = conAuditoria(manejarDELETE);
