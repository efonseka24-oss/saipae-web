import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";
import { guardarSoporteCompra, INCLUIR_COMPRA_LOCAL, validarCompraLocal } from "@/lib/comprasLocalesServidor";

async function manejarPOST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const formData = await request.formData();
  const validacion = await validarCompraLocal(formData);
  if ("error" in validacion) return NextResponse.json({ error: validacion.error }, { status: 400 });

  const soporte = await guardarSoporteCompra(formData);
  if (soporte && "error" in soporte) return NextResponse.json({ error: soporte.error }, { status: 400 });

  const compra = await db.compraLocal.create({
    data: { ...validacion.datos, ...(soporte ?? {}), detalles: { create: validacion.detalles } },
    include: INCLUIR_COMPRA_LOCAL,
  });
  return NextResponse.json(compra, { status: 201 });
}

export const POST = conAuditoria(manejarPOST);
