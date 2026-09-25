import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { serializarTiposRacion, racionesNoPermitidas } from "@/lib/racionesPae";
import { conAuditoria } from "@/lib/auditoria";

const INCLUIR = {
  institucion: {
    include: {
      municipio: {
        include: { zode: { include: { lote: { include: { departamento: { select: { id: true, nombre: true } } } } } } },
      },
    },
  },
} as const;

async function manejarPATCH(request: NextRequest, ctx: RouteContext<"/api/registro/sedes/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const { numeroDane, nombre, institucionId, habilitadaPae, tiposRacion } = await request.json();
  if (typeof numeroDane !== "string" || !numeroDane.trim()) {
    return NextResponse.json({ error: "El número DANE es obligatorio." }, { status: 400 });
  }
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre de la sede es obligatorio." }, { status: 400 });
  }
  if (typeof institucionId !== "string" || !institucionId) {
    return NextResponse.json({ error: "Selecciona la institución." }, { status: 400 });
  }

  const institucionMadre = await db.institucion.findUnique({ where: { id: institucionId } });
  if (!institucionMadre) return NextResponse.json({ error: "La institución no existe." }, { status: 404 });
  const tiposPedidos: string[] = Array.isArray(tiposRacion) ? tiposRacion : [];
  const noPermitidas = racionesNoPermitidas(tiposPedidos, institucionMadre.tiposRacion);
  if (noPermitidas.length > 0) {
    return NextResponse.json(
      { error: `La institución no tiene marcada(s) la(s) ración(es) ${noPermitidas.join(", ")}: la sede solo puede tener las de su institución.` },
      { status: 400 }
    );
  }

  try {
    const sede = await db.sede.update({
      where: { id },
      data: {
        numeroDane: numeroDane.trim(),
        nombre: nombre.trim(),
        institucionId,
        habilitadaPae: typeof habilitadaPae === "boolean" ? habilitadaPae : true,
        tiposRacion: serializarTiposRacion(tiposPedidos),
      },
      include: INCLUIR,
    });
    return NextResponse.json(sede);
  } catch {
    return NextResponse.json({ error: "Ya existe una sede con ese número DANE." }, { status: 409 });
  }
}

async function manejarDELETE(_request: NextRequest, ctx: RouteContext<"/api/registro/sedes/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  await db.sede.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const PATCH = conAuditoria(manejarPATCH);
export const DELETE = conAuditoria(manejarDELETE);
