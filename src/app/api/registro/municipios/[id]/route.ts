import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";

const INCLUIR_ZODE = {
  zode: { include: { lote: { include: { departamento: { select: { id: true, nombre: true } } } } } },
} as const;

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/registro/municipios/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const { nombre, zodeId } = await request.json();
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (typeof zodeId !== "string" || !zodeId) {
    return NextResponse.json({ error: "Selecciona el zode." }, { status: 400 });
  }

  try {
    const municipio = await db.municipio.update({
      where: { id },
      data: { nombre: nombre.trim(), zodeId },
      include: INCLUIR_ZODE,
    });
    return NextResponse.json(municipio);
  } catch {
    return NextResponse.json({ error: "Ya existe un municipio con ese nombre en ese zode." }, { status: 409 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/registro/municipios/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  try {
    await db.municipio.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "No se puede eliminar: tiene instituciones asociadas." }, { status: 409 });
  }
}
