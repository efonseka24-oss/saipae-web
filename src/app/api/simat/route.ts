import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";
import { INCLUIR_ESTUDIANTE_SIMAT, validarEstudianteSimat } from "@/lib/simat";

async function manejarPOST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const validacion = await validarEstudianteSimat(await request.json());
  if ("error" in validacion) return NextResponse.json({ error: validacion.error }, { status: 400 });

  try {
    const estudiante = await db.estudianteSimat.create({ data: validacion.datos, include: INCLUIR_ESTUDIANTE_SIMAT });
    return NextResponse.json(estudiante, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe un estudiante con ese ID SIMAT." }, { status: 409 });
  }
}

export const POST = conAuditoria(manejarPOST);
