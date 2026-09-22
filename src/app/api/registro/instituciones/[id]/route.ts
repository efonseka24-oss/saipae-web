import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { serializarTiposRacion } from "@/lib/racionesPae";

const INCLUIR = {
  municipio: {
    include: { zode: { include: { lote: { include: { departamento: { select: { id: true, nombre: true } } } } } } },
  },
} as const;

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/registro/instituciones/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const { numeroDane, nombre, municipioId, habilitadaPae, tiposRacion } = await request.json();
  if (typeof numeroDane !== "string" || !numeroDane.trim()) {
    return NextResponse.json({ error: "El número DANE es obligatorio." }, { status: 400 });
  }
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (typeof municipioId !== "string" || !municipioId) {
    return NextResponse.json({ error: "Selecciona el municipio." }, { status: 400 });
  }

  try {
    const institucion = await db.institucion.update({
      where: { id },
      data: {
        numeroDane: numeroDane.trim(),
        nombre: nombre.trim(),
        municipioId,
        habilitadaPae: typeof habilitadaPae === "boolean" ? habilitadaPae : true,
        tiposRacion: serializarTiposRacion(Array.isArray(tiposRacion) ? tiposRacion : []),
      },
      include: INCLUIR,
    });
    return NextResponse.json(institucion);
  } catch {
    return NextResponse.json({ error: "Ya existe una institución con ese número DANE." }, { status: 409 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/registro/instituciones/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  try {
    await db.institucion.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se puede eliminar: tiene sedes asociadas." }, { status: 409 });
  }
}
