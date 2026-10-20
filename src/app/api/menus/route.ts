import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";
import { INCLUIR_MENU, MENSAJE_MENU_REPETIDO, validarMenu } from "@/lib/menusServidor";

async function manejarPOST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const validacion = await validarMenu(await request.json());
  if ("error" in validacion) return NextResponse.json({ error: validacion.error }, { status: 400 });

  try {
    const menu = await db.menuPae.create({
      data: { ...validacion.datos, detalles: { create: validacion.detalles } },
      include: INCLUIR_MENU,
    });
    return NextResponse.json(menu, { status: 201 });
  } catch {
    return NextResponse.json({ error: MENSAJE_MENU_REPETIDO }, { status: 409 });
  }
}

export const POST = conAuditoria(manejarPOST);
