// Exporta a CSV (Excel) los registros de auditoría con los filtros de la pantalla.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sesionAdministrador } from "@/lib/sesionAdministrador";
import { formatearFechaColombia, leerFiltrosAuditoria, whereAuditoria } from "@/lib/consultaAuditoria";
import { ETIQUETAS_TIPO_AUDITORIA, type TipoAuditoria } from "@/lib/auditoria";

export async function GET(request: NextRequest) {
  const sesion = await sesionAdministrador();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const registros = await db.auditoria.findMany({
    where: whereAuditoria(leerFiltrosAuditoria(request.nextUrl.searchParams)),
    orderBy: { fecha: "desc" },
    take: 100_000,
  });

  const celda = (v: string | number | null | undefined) => {
    const texto = v == null ? "" : String(v);
    return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const filas = [
    ["Fecha (Colombia)", "Usuario", "Nombre", "Tipo", "Módulo", "Acción", "Descripción", "Resultado", "Código", "Ruta", "IP", "Navegador"],
    ...registros.map((r) => [
      formatearFechaColombia(r.fecha),
      r.usuario,
      r.nombre,
      ETIQUETAS_TIPO_AUDITORIA[r.tipo as TipoAuditoria] ?? r.tipo,
      r.modulo,
      r.accion,
      r.descripcion,
      r.exito ? "Correcto" : "Error",
      r.estado,
      r.ruta,
      r.ip,
      r.agente,
    ]),
  ];
  const contenido = "﻿" + filas.map((f) => f.map(celda).join(";")).join("\r\n");
  return new Response(contenido, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auditoria-saipae.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
