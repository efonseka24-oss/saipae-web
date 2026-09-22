import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { serializarTiposRacion } from "@/lib/racionesPae";

const INCLUIR = {
  institucion: {
    include: {
      municipio: {
        include: { zode: { include: { lote: { include: { departamento: { select: { id: true, nombre: true } } } } } } },
      },
    },
  },
} as const;

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const sedes = await db.sede.findMany({ orderBy: { numeroDane: "asc" }, include: INCLUIR });
  return NextResponse.json(sedes);
}

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { numeroDane, nombre, institucionId, habilitadaPae, tiposRacion } = await request.json();
  if (typeof numeroDane !== "string" || !numeroDane.trim()) {
    return NextResponse.json({ error: "El número DANE es obligatorio." }, { status: 400 });
  }
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre de la sede es obligatorio." }, { status: 400 });
  }
  if (typeof institucionId !== "string" || !institucionId) {
    return NextResponse.json({ error: "Selecciona la institución." }, { status: 400 });
  }

  const institucion = await db.institucion.findUnique({ where: { id: institucionId } });
  if (!institucion) return NextResponse.json({ error: "La institución no existe." }, { status: 404 });

  try {
    const sede = await db.sede.create({
      data: {
        numeroDane: numeroDane.trim(),
        nombre: nombre.trim(),
        institucionId,
        habilitadaPae: typeof habilitadaPae === "boolean" ? habilitadaPae : true,
        tiposRacion: serializarTiposRacion(Array.isArray(tiposRacion) ? tiposRacion : []),
      },
      include: INCLUIR,
    });
    return NextResponse.json(sede, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe una sede con ese número DANE." }, { status: 409 });
  }
}
