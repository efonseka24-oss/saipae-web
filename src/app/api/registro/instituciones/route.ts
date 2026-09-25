import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { serializarTiposRacion } from "@/lib/racionesPae";
import { conAuditoria } from "@/lib/auditoria";

const INCLUIR = {
  municipio: {
    include: { zode: { include: { lote: { include: { departamento: { select: { id: true, nombre: true } } } } } } },
  },
} as const;

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const instituciones = await db.institucion.findMany({
    orderBy: { nombre: "asc" },
    include: { ...INCLUIR, _count: { select: { sedes: true } } },
  });
  return NextResponse.json(instituciones);
}

async function manejarPOST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { numeroDane, nombre, municipioId, habilitadaPae, tiposRacion } = await request.json();
  if (typeof numeroDane !== "string" || !numeroDane.trim()) {
    return NextResponse.json({ error: "El número DANE es obligatorio." }, { status: 400 });
  }
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (typeof municipioId !== "string" || !municipioId) {
    return NextResponse.json({ error: "Selecciona el municipio." }, { status: 400 });
  }

  const municipio = await db.municipio.findUnique({ where: { id: municipioId } });
  if (!municipio) return NextResponse.json({ error: "El municipio no existe." }, { status: 404 });

  try {
    const institucion = await db.institucion.create({
      data: {
        numeroDane: numeroDane.trim(),
        nombre: nombre.trim(),
        municipioId,
        habilitadaPae: typeof habilitadaPae === "boolean" ? habilitadaPae : true,
        tiposRacion: serializarTiposRacion(Array.isArray(tiposRacion) ? tiposRacion : []),
      },
      include: INCLUIR,
    });
    return NextResponse.json(institucion, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe una institución con ese número DANE." }, { status: 409 });
  }
}

export const POST = conAuditoria(manejarPOST);
