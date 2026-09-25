import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { esTipoPlantilla } from "@/lib/plantillaPreguntas";
import { conAuditoria } from "@/lib/auditoria";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const plantillas = await db.plantilla.findMany({
    orderBy: { nombre: "asc" },
    include: { esquemas: { select: { id: true, nombre: true } } },
  });
  return NextResponse.json(plantillas);
}

async function manejarPOST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const datos = await request.json();
  const nombre = typeof datos.nombre === "string" ? datos.nombre.trim() : "";
  const tipo = typeof datos.tipo === "string" && esTipoPlantilla(datos.tipo) ? datos.tipo : "VISITA";
  const esquemaIds = Array.isArray(datos.esquemaIds) ? datos.esquemaIds.filter((id: unknown) => typeof id === "string") : [];

  if (!nombre) {
    return NextResponse.json({ error: "El nombre de la plantilla es obligatorio." }, { status: 400 });
  }

  const plantilla = await db.plantilla.create({
    data: {
      nombre,
      tipo,
      configJson: "{}",
      ...(esquemaIds.length > 0 ? { esquemas: { connect: esquemaIds.map((id: string) => ({ id })) } } : {}),
    },
    include: { esquemas: { select: { id: true, nombre: true } } },
  });

  return NextResponse.json(plantilla, { status: 201 });
}

export const POST = conAuditoria(manejarPOST);
