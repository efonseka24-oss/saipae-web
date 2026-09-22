import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/registro/departamentos/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const { nombre } = await request.json();
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  try {
    const departamento = await db.departamento.update({ where: { id }, data: { nombre: nombre.trim() } });
    return NextResponse.json(departamento);
  } catch {
    return NextResponse.json({ error: "Ya existe un departamento con ese nombre." }, { status: 409 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/registro/departamentos/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  try {
    await db.departamento.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No se puede eliminar: tiene lotes asociados. Elimínalos primero." },
      { status: 409 }
    );
  }
}
