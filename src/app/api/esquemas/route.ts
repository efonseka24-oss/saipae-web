import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const esquemas = await db.esquema.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { modulos: true } } },
  });
  return NextResponse.json(esquemas);
}

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { nombre, descripcion } = await request.json();
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre del esquema es obligatorio." }, { status: 400 });
  }

  try {
    const esquema = await db.esquema.create({
      data: { nombre: nombre.trim(), descripcion: descripcion?.trim() || null },
    });
    return NextResponse.json(esquema, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe un esquema con ese nombre." }, { status: 409 });
  }
}
