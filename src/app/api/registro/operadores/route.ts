import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";

const INCLUIR = {
  zode: { include: { lote: { include: { departamento: { select: { id: true, nombre: true } } } } } },
} as const;

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const operadores = await db.operador.findMany({
    orderBy: { nombreRazonSocial: "asc" },
    include: { ...INCLUIR, _count: { select: { bodegas: true } } },
  });
  return NextResponse.json(operadores);
}

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { nit, nombreRazonSocial, zodeId } = await request.json();
  if (typeof nit !== "string" || !nit.trim()) {
    return NextResponse.json({ error: "El NIT es obligatorio." }, { status: 400 });
  }
  if (typeof nombreRazonSocial !== "string" || !nombreRazonSocial.trim()) {
    return NextResponse.json({ error: "El nombre o razón social es obligatorio." }, { status: 400 });
  }
  if (typeof zodeId !== "string" || !zodeId) {
    return NextResponse.json({ error: "Selecciona el zode." }, { status: 400 });
  }

  const zode = await db.zode.findUnique({ where: { id: zodeId } });
  if (!zode) return NextResponse.json({ error: "El zode no existe." }, { status: 404 });

  try {
    const operador = await db.operador.create({
      data: { nit: nit.trim(), nombreRazonSocial: nombreRazonSocial.trim(), zodeId },
      include: INCLUIR,
    });
    return NextResponse.json(operador, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe un operador con ese NIT." }, { status: 409 });
  }
}
