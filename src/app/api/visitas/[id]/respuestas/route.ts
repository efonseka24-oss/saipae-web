import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/visitas/[id]/respuestas">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const respuestas = await db.respuesta.findMany({ where: { visitaId: id } });
  return NextResponse.json(respuestas);
}

export async function PUT(request: NextRequest, ctx: RouteContext<"/api/visitas/[id]/respuestas">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id: visitaId } = await ctx.params;
  const { preguntaId, valor } = await request.json();

  if (typeof preguntaId !== "string" || !preguntaId) {
    return NextResponse.json({ error: "Falta la pregunta." }, { status: 400 });
  }

  const valorLimpio = typeof valor === "string" ? valor.trim() : null;

  const respuesta = await db.respuesta.upsert({
    where: { visitaId_preguntaId: { visitaId, preguntaId } },
    update: { valor: valorLimpio || null },
    create: { visitaId, preguntaId, valor: valorLimpio || null },
  });

  return NextResponse.json(respuesta);
}
