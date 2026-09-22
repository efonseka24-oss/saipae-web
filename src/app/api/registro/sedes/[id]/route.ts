import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { serializarTiposRacion } from "@/lib/racionesPae";

const INCLUIR = {
  institucion: {
    include: {
      municipio: {
        include: { zode: { include: { lote: { include: { departamento: { select: { id: true, nombre: true } } } } } } },
      },
    },
  },
} as const;

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/registro/sedes/[id]">) {
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

  try {
    const sede = await db.sede.update({
      where: { id },
      data: {
        numeroDane: numeroDane.trim(),
        nombre: nombre.trim(),
        institucionId,
        habilitadaPae: typeof habilitadaPae === "boolean" ? habilitadaPae : true,
        tiposRacion: serializarTiposRacion(Array.isArray(tiposRacion) ? tiposRacion : []),
      },
      include: INCLUIR,
    });
    return NextResponse.json(sede);
  } catch {
    return NextResponse.json({ error: "Ya existe una sede con ese número DANE." }, { status: 409 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/registro/sedes/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  await db.sede.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
