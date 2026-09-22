import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { esEstadoVisita } from "@/lib/visitas";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/visitas/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const visita = await db.visita.findUnique({
    where: { id },
    include: { esquema: { select: { id: true, nombre: true } } },
  });
  if (!visita) return NextResponse.json({ error: "La visita no existe." }, { status: 404 });
  return NextResponse.json(visita);
}

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/visitas/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const { fecha, operador, municipio, institucion, sede, zodes, lote, nit, estado } = await request.json();

  if (estado !== undefined && !esEstadoVisita(estado)) {
    return NextResponse.json({ error: "Estado de visita inválido." }, { status: 400 });
  }

  try {
    const visita = await db.visita.update({
      where: { id },
      data: {
        ...(fecha !== undefined ? { fecha: new Date(fecha) } : {}),
        ...(operador !== undefined ? { operador: operador?.trim() || null } : {}),
        ...(municipio !== undefined ? { municipio: municipio?.trim() || null } : {}),
        ...(institucion !== undefined ? { institucion: institucion?.trim() || null } : {}),
        ...(sede !== undefined ? { sede: sede?.trim() || null } : {}),
        ...(zodes !== undefined ? { zodes: zodes?.trim() || null } : {}),
        ...(lote !== undefined ? { lote: lote?.trim() || null } : {}),
        ...(nit !== undefined ? { nit: nit?.trim() || null } : {}),
        ...(estado !== undefined ? { estado } : {}),
      },
    });
    return NextResponse.json(visita);
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar la visita." }, { status: 409 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/visitas/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  await db.visita.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
