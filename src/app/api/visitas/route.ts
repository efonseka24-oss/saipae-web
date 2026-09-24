import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const esquemaId = request.nextUrl.searchParams.get("esquemaId");

  const visitas = await db.visita.findMany({
    where: esquemaId ? { esquemaId } : undefined,
    include: { esquema: { select: { nombre: true } }, usuario: { select: { nombre: true } } },
    orderBy: { fecha: "desc" },
  });
  return NextResponse.json(visitas);
}

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { esquemaId, fecha, operador, municipio, institucion, sede, zodes, lote, nit } = await request.json();

  if (typeof esquemaId !== "string" || !esquemaId) {
    return NextResponse.json({ error: "Selecciona un esquema." }, { status: 400 });
  }
  if (typeof fecha !== "string" || !fecha) {
    return NextResponse.json({ error: "La fecha de la visita es obligatoria." }, { status: 400 });
  }

  const esquema = await db.esquema.findUnique({ where: { id: esquemaId } });
  if (!esquema) return NextResponse.json({ error: "El esquema no existe." }, { status: 404 });

  const visita = await db.visita.create({
    data: {
      esquemaId,
      fecha: new Date(fecha),
      operador: operador?.trim() || null,
      municipio: municipio?.trim() || null,
      institucion: institucion?.trim() || null,
      sede: sede?.trim() || null,
      zodes: zodes?.trim() || null,
      lote: lote?.trim() || null,
      nit: nit?.trim() || null,
    },
  });

  return NextResponse.json(visita, { status: 201 });
}
