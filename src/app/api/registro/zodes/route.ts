import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";

const INCLUIR = {
  lote: { include: { departamento: { select: { id: true, nombre: true } } } },
} as const;

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const zodes = await db.zode.findMany({
    orderBy: { nombre: "asc" },
    include: { ...INCLUIR, _count: { select: { municipios: true } } },
  });
  return NextResponse.json(zodes);
}

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { nombre, loteId } = await request.json();
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (typeof loteId !== "string" || !loteId) {
    return NextResponse.json({ error: "Selecciona el lote." }, { status: 400 });
  }

  const lote = await db.lote.findUnique({ where: { id: loteId } });
  if (!lote) return NextResponse.json({ error: "El lote no existe." }, { status: 404 });

  try {
    const zode = await db.zode.create({
      data: { nombre: nombre.trim(), loteId },
      include: INCLUIR,
    });
    return NextResponse.json(zode, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe un zode con ese nombre en ese lote." }, { status: 409 });
  }
}
