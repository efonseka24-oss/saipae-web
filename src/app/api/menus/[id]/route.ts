import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";
import { INCLUIR_MENU, MENSAJE_MENU_REPETIDO, validarMenu } from "@/lib/menusServidor";

async function manejarPATCH(request: NextRequest, ctx: RouteContext<"/api/menus/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  if (!(await db.menuPae.findUnique({ where: { id } }))) {
    return NextResponse.json({ error: "El menú no existe." }, { status: 404 });
  }

  const validacion = await validarMenu(await request.json());
  if ("error" in validacion) return NextResponse.json({ error: validacion.error }, { status: 400 });

  try {
    const menu = await db.menuPae.update({
      where: { id },
      data: { ...validacion.datos, detalles: { deleteMany: {}, create: validacion.detalles } },
      include: INCLUIR_MENU,
    });
    return NextResponse.json(menu);
  } catch {
    return NextResponse.json({ error: MENSAJE_MENU_REPETIDO }, { status: 409 });
  }
}

async function manejarDELETE(_request: NextRequest, ctx: RouteContext<"/api/menus/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  if (!(await db.menuPae.findUnique({ where: { id } }))) {
    return NextResponse.json({ error: "El menú no existe." }, { status: 404 });
  }

  await db.menuPae.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export const PATCH = conAuditoria(manejarPATCH);
export const DELETE = conAuditoria(manejarDELETE);
