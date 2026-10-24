// Exporta a CSV (Excel) los estudiantes SIMAT con los filtros de la pantalla.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { INCLUIR_ESTUDIANTE_SIMAT, leerFiltrosSimat, whereSimat } from "@/lib/simat";

export async function GET(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const estudiantes = await db.estudianteSimat.findMany({
    where: whereSimat(leerFiltrosSimat(request.nextUrl.searchParams)),
    orderBy: [{ nombre: "asc" }],
    include: INCLUIR_ESTUDIANTE_SIMAT,
  });

  const celda = (v: string | number | null | undefined) => {
    const texto = v == null ? "" : String(v);
    return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  const filas = [
    ["ID", "DOCUMENTO", "NOMBRE", "LOTE", "ZODE", "MUNICIPIO", "INSTITUCION", "DANE IE", "SEDE", "DANE SEDE", "BENEFICIARIO PAE", "ENTREGAS"],
    ...estudiantes.map((e) => [
      e.idSimat,
      e.numeroDocumento,
      e.nombre,
      e.municipio.zode.lote.nombre,
      e.municipio.zode.nombre,
      e.municipio.nombre,
      e.institucion.nombre,
      e.institucion.numeroDane,
      e.sede.nombre,
      e.sede.numeroDane,
      e.beneficiarioPae ? "SI" : "NO",
      e._count.entregas,
    ]),
  ];
  const contenido = "﻿" + filas.map((f) => f.map(celda).join(";")).join("\r\n");
  return new Response(contenido, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="simat-sivae.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
