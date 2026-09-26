import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { anotarAuditoria, conAuditoria } from "@/lib/auditoria";
import { INCLUIR_CRONOGRAMA, describirCronograma, sesionCronograma, validarCronograma } from "@/lib/guardarCronograma";

async function manejarPOST(request: NextRequest) {
  if (!(await sesionCronograma())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const resultado = await validarCronograma(await request.json());
  if ("error" in resultado) return NextResponse.json({ error: resultado.error }, { status: 400 });

  const visita = await db.cronogramaVisita.create({ data: resultado.datos, include: INCLUIR_CRONOGRAMA });
  anotarAuditoria(request, { accion: "Programó", descripcion: `Programó ${await describirCronograma(resultado.datos)}` });
  return NextResponse.json(visita, { status: 201 });
}

export const POST = conAuditoria(manejarPOST);
