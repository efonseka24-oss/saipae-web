import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { esTipoPlantilla } from "@/lib/plantillaPreguntas";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/plantillas/[plantillaId]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { plantillaId } = await ctx.params;
  const plantilla = await db.plantilla.findUnique({
    where: { id: plantillaId },
    include: { esquemas: { select: { id: true, nombre: true } } },
  });
  if (!plantilla) return NextResponse.json({ error: "La plantilla no existe." }, { status: 404 });
  return NextResponse.json(plantilla);
}

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/plantillas/[plantillaId]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { plantillaId } = await ctx.params;
  const existente = await db.plantilla.findUnique({ where: { id: plantillaId } });
  if (!existente) return NextResponse.json({ error: "La plantilla no existe." }, { status: 404 });

  const datos = await request.json();
  const nombre = typeof datos.nombre === "string" ? datos.nombre.trim() : "";
  const tipo = typeof datos.tipo === "string" && esTipoPlantilla(datos.tipo) ? datos.tipo : existente.tipo;
  const versionFormato = typeof datos.versionFormato === "string" ? datos.versionFormato.trim() : "";
  const descripcionVisitaJson = typeof datos.descripcionVisitaJson === "string" ? datos.descripcionVisitaJson : "[]";
  const configJson = typeof datos.configJson === "string" ? datos.configJson : "{}";
  const esquemaIds = Array.isArray(datos.esquemaIds) ? datos.esquemaIds.filter((id: unknown) => typeof id === "string") : undefined;

  if (!nombre) {
    return NextResponse.json({ error: "El nombre de la plantilla es obligatorio." }, { status: 400 });
  }

  const plantilla = await db.plantilla.update({
    where: { id: plantillaId },
    data: {
      nombre,
      tipo,
      versionFormato,
      descripcionVisitaJson,
      configJson,
      ...(esquemaIds ? { esquemas: { set: esquemaIds.map((id: string) => ({ id })) } } : {}),
    },
    include: { esquemas: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json(plantilla);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/plantillas/[plantillaId]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { plantillaId } = await ctx.params;
  await db.plantilla.delete({ where: { id: plantillaId } });
  return NextResponse.json({ ok: true });
}
