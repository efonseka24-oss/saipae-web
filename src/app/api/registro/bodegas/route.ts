import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";

const INCLUIR = {
  operador: {
    include: { zode: { include: { lote: { include: { departamento: { select: { id: true, nombre: true } } } } } } },
  },
} as const;

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const bodegas = await db.bodega.findMany({ orderBy: { nombre: "asc" }, include: INCLUIR });
  return NextResponse.json(bodegas);
}

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { nombre, operadorId } = await request.json();
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (typeof operadorId !== "string" || !operadorId) {
    return NextResponse.json({ error: "Selecciona el operador." }, { status: 400 });
  }

  const operador = await db.operador.findUnique({ where: { id: operadorId } });
  if (!operador) return NextResponse.json({ error: "El operador no existe." }, { status: 404 });

  try {
    const bodega = await db.bodega.create({
      data: { nombre: nombre.trim(), operadorId },
      include: INCLUIR,
    });
    return NextResponse.json(bodega, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ese operador ya tiene una bodega con ese nombre." }, { status: 409 });
  }
}
