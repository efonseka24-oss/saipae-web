import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";
import { borrarSoporteCompra, guardarSoporteCompra, INCLUIR_COMPRA_LOCAL, validarCompraLocal } from "@/lib/comprasLocalesServidor";

async function manejarPATCH(request: NextRequest, ctx: RouteContext<"/api/compras-locales/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const actual = await db.compraLocal.findUnique({ where: { id } });
  if (!actual) return NextResponse.json({ error: "La compra no existe." }, { status: 404 });

  const formData = await request.formData();
  const validacion = await validarCompraLocal(formData);
  if ("error" in validacion) return NextResponse.json({ error: validacion.error }, { status: 400 });

  const soporte = await guardarSoporteCompra(formData);
  if (soporte && "error" in soporte) return NextResponse.json({ error: soporte.error }, { status: 400 });
  const quitarSoporte = formData.get("quitarSoporte") === "1";

  const compra = await db.compraLocal.update({
    where: { id },
    data: {
      ...validacion.datos,
      ...(soporte ?? (quitarSoporte ? { archivoUrl: null, archivoNombre: null } : {})),
      detalles: { deleteMany: {}, create: validacion.detalles },
    },
    include: INCLUIR_COMPRA_LOCAL,
  });
  if (soporte || quitarSoporte) borrarSoporteCompra(actual.archivoUrl);

  return NextResponse.json(compra);
}

async function manejarDELETE(_request: NextRequest, ctx: RouteContext<"/api/compras-locales/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const compra = await db.compraLocal.findUnique({ where: { id } });
  if (!compra) return NextResponse.json({ error: "La compra no existe." }, { status: 404 });

  await db.compraLocal.delete({ where: { id } });
  borrarSoporteCompra(compra.archivoUrl);
  return NextResponse.json({ ok: true });
}

export const PATCH = conAuditoria(manejarPATCH);
export const DELETE = conAuditoria(manejarDELETE);
