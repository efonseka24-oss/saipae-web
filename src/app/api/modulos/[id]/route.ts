import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/modulos/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const { nombre, descripcion, orden } = await request.json();

  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre del módulo es obligatorio." }, { status: 400 });
  }

  try {
    const modulo = await db.moduloEsquema.update({
      where: { id },
      data: {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        orden: typeof orden === "number" ? orden : undefined,
      },
    });
    return NextResponse.json(modulo);
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el módulo." }, { status: 409 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/modulos/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  await db.moduloEsquema.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
