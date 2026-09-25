import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/esquemas/[id]/modulos">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const modulos = await db.moduloEsquema.findMany({
    where: { esquemaId: id },
    orderBy: { orden: "asc" },
    include: { _count: { select: { preguntas: true } } },
  });
  return NextResponse.json(modulos);
}

async function manejarPOST(request: NextRequest, ctx: RouteContext<"/api/esquemas/[id]/modulos">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id: esquemaId } = await ctx.params;
  const { nombre, descripcion, orden } = await request.json();

  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre del módulo es obligatorio." }, { status: 400 });
  }

  const esquema = await db.esquema.findUnique({ where: { id: esquemaId } });
  if (!esquema) return NextResponse.json({ error: "El esquema no existe." }, { status: 404 });

  let ordenAsignado = orden;
  if (typeof ordenAsignado !== "number") {
    const ultimo = await db.moduloEsquema.findFirst({
      where: { esquemaId },
      orderBy: { orden: "desc" },
      select: { orden: true },
    });
    ordenAsignado = (ultimo?.orden ?? -1) + 1;
  }

  try {
    const modulo = await db.moduloEsquema.create({
      data: {
        esquemaId,
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        orden: ordenAsignado,
      },
    });
    return NextResponse.json(modulo, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe un módulo con ese nombre en este esquema." }, { status: 409 });
  }
}

export const POST = conAuditoria(manejarPOST);
