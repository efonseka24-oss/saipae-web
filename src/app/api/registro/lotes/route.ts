import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const lotes = await db.lote.findMany({
    orderBy: { nombre: "asc" },
    include: { departamento: { select: { id: true, nombre: true } }, _count: { select: { zodes: true } } },
  });
  return NextResponse.json(lotes);
}

async function manejarPOST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { nombre, departamentoId } = await request.json();
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (typeof departamentoId !== "string" || !departamentoId) {
    return NextResponse.json({ error: "Selecciona el departamento." }, { status: 400 });
  }

  const departamento = await db.departamento.findUnique({ where: { id: departamentoId } });
  if (!departamento) return NextResponse.json({ error: "El departamento no existe." }, { status: 404 });

  try {
    const lote = await db.lote.create({
      data: { nombre: nombre.trim(), departamentoId },
      include: { departamento: { select: { id: true, nombre: true } } },
    });
    return NextResponse.json(lote, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe un lote con ese nombre en ese departamento." }, { status: 409 });
  }
}

export const POST = conAuditoria(manejarPOST);
