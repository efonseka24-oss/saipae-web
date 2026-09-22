import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { generarReporteVisita } from "@/lib/generarReporteDinamico";
import { generarReportePlantilla } from "@/lib/generarReportePlantilla";
import { generarReporteGrupoEspecial } from "@/lib/generarReporteGrupoEspecial";
import { esTipoGrupoEspecial } from "@/lib/plantillaPreguntas";
import { convertirDocxAPdf } from "@/lib/convertirPdf";

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { visitaId } = await request.json();
  if (typeof visitaId !== "string" || !visitaId) {
    return NextResponse.json({ error: "Selecciona una visita." }, { status: 400 });
  }

  const visita = await db.visita.findUnique({ where: { id: visitaId }, select: { esquemaId: true } });
  if (!visita) {
    return NextResponse.json({ error: "La visita no existe." }, { status: 404 });
  }

  // Genera un documento por cada plantilla vinculada al esquema (la de
  // visita por módulos, más cualquier plantilla dedicada de materia prima u
  // organoléptico); si el esquema no tiene ninguna plantilla configurada
  // todavía, cae al generador genérico dinámico de siempre.
  const plantillas = await db.plantilla.findMany({ where: { esquemas: { some: { id: visita.esquemaId } } } });

  const candidatos = plantillas.length > 0
    ? await Promise.all(
        plantillas.map(async (p) => ({
          nombre: p.nombre,
          resultado: esTipoGrupoEspecial(p.tipo)
            ? await generarReporteGrupoEspecial(visitaId, p.tipo)
            : await generarReportePlantilla(visitaId),
        }))
      )
    : [{ nombre: "Informe", resultado: await generarReporteVisita(visitaId) }];

  const generados = candidatos.filter(
    (c): c is { nombre: string; resultado: { nombreArchivo: string; buffer: Buffer } } => c.resultado !== null
  );
  if (generados.length === 0) {
    return NextResponse.json({ error: "La visita no existe." }, { status: 404 });
  }

  const carpetaSalida = path.join(process.cwd(), "public", "generados", visitaId);
  fs.mkdirSync(carpetaSalida, { recursive: true });

  const documentos = await Promise.all(
    generados.map(async ({ nombre, resultado }) => {
      const { nombreArchivo, buffer } = resultado;
      const nombreBase = nombreArchivo.replace(/\.docx$/, "");

      fs.writeFileSync(path.join(carpetaSalida, nombreArchivo), buffer);
      const docxUrl = `/generados/${visitaId}/${nombreArchivo}`;

      let pdfUrl: string | null = null;
      const pdf = await convertirDocxAPdf(buffer, nombreBase);
      if (pdf) {
        fs.writeFileSync(path.join(carpetaSalida, `${nombreBase}.pdf`), pdf);
        pdfUrl = `/generados/${visitaId}/${nombreBase}.pdf`;
      }

      return { nombre, nombreBase, docxUrl, pdfUrl };
    })
  );

  await db.visita.update({ where: { id: visitaId }, data: { informeGeneradoEn: new Date() } });

  return NextResponse.json({ documentos });
}
