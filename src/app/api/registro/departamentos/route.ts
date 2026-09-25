import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const departamentos = await db.departamento.findMany({
    orderBy: { nombre: "asc" },
    include: { _count: { select: { lotes: true } } },
  });
  return NextResponse.json(departamentos);
}

async function manejarPOST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { nombre } = await request.json();
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  try {
    const departamento = await db.departamento.create({ data: { nombre: nombre.trim() } });
    return NextResponse.json(departamento, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe un departamento con ese nombre." }, { status: 409 });
  }
}

export const POST = conAuditoria(manejarPOST);
