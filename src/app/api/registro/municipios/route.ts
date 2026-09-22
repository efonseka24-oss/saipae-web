import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";

const INCLUIR_ZODE = {
  zode: { include: { lote: { include: { departamento: { select: { id: true, nombre: true } } } } } },
} as const;

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const municipios = await db.municipio.findMany({
    orderBy: { nombre: "asc" },
    include: { ...INCLUIR_ZODE, _count: { select: { instituciones: true } } },
  });
  return NextResponse.json(municipios);
}

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { nombre, zodeId } = await request.json();
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (typeof zodeId !== "string" || !zodeId) {
    return NextResponse.json({ error: "Selecciona el zode." }, { status: 400 });
  }

  const zode = await db.zode.findUnique({ where: { id: zodeId } });
  if (!zode) return NextResponse.json({ error: "El zode no existe." }, { status: 404 });

  try {
    const municipio = await db.municipio.create({
      data: { nombre: nombre.trim(), zodeId },
      include: INCLUIR_ZODE,
    });
    return NextResponse.json(municipio, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe un municipio con ese nombre en ese zode." }, { status: 409 });
  }
}
