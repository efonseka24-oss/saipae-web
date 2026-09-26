import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { anotarAuditoria, conAuditoria } from "@/lib/auditoria";
import { INCLUIR_CRONOGRAMA, describirCronograma, sesionCronograma, validarCronograma } from "@/lib/guardarCronograma";
import { formatearDia } from "@/lib/cronograma";

async function manejarPATCH(request: NextRequest, ctx: RouteContext<"/api/cronograma/[id]">) {
  if (!(await sesionCronograma())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const actual = await db.cronogramaVisita.findUnique({ where: { id }, select: { id: true } });
  if (!actual) return NextResponse.json({ error: "La visita programada no existe." }, { status: 404 });

  const resultado = await validarCronograma(await request.json());
  if ("error" in resultado) return NextResponse.json({ error: resultado.error }, { status: 400 });

  const visita = await db.cronogramaVisita.update({ where: { id }, data: resultado.datos, include: INCLUIR_CRONOGRAMA });
  anotarAuditoria(request, { descripcion: `Editó la ${await describirCronograma(resultado.datos)}` });
  return NextResponse.json(visita);
}

async function manejarDELETE(request: NextRequest, ctx: RouteContext<"/api/cronograma/[id]">) {
  if (!(await sesionCronograma())) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const visita = await db.cronogramaVisita.findUnique({
    where: { id },
    select: { fechaProgramada: true, municipio: { select: { nombre: true } }, sede: { select: { nombre: true } } },
  });
  if (!visita) return NextResponse.json({ error: "La visita programada no existe." }, { status: 404 });

  await db.cronogramaVisita.delete({ where: { id } });
  const lugar = [visita.municipio.nombre, visita.sede?.nombre].filter(Boolean).join(" - ");
  anotarAuditoria(request, { descripcion: `Eliminó del cronograma la visita a ${lugar} del ${formatearDia(visita.fechaProgramada)}` });
  return NextResponse.json({ ok: true });
}

export const PATCH = conAuditoria(manejarPATCH);
export const DELETE = conAuditoria(manejarDELETE);
