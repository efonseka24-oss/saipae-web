import { Document, Packer, Paragraph, Table, TableRow, TextRun, WidthType, convertMillimetersToTwip } from "docx";
import { db } from "@/lib/db";
import { parsearConfig } from "@/lib/plantillaConfig";
import { celda, construirEncabezado } from "@/lib/plantillaDocxComun";
import type { TipoGrupoEspecial } from "@/lib/plantillaPreguntas";

const NOMBRE_GRUPO: Record<TipoGrupoEspecial, { titulo: string; archivo: string }> = {
  MATERIA_PRIMA: { titulo: "Materia prima", archivo: "MateriaPrima" },
  ORGANOLEPTICO: { titulo: "Organoléptico", archivo: "Organolepticos" },
};

// Genera el reporte dedicado de una plantilla tipo MATERIA_PRIMA u
// ORGANOLEPTICO: junta las preguntas con ese `generarSubPreguntasAuto`
// venga del módulo del esquema que venga (no solo de un módulo puntual como
// "MATERIA PRIMA"), una por cada ítem registrado en la visita (MP1, MP2,
// Org1, Org2, ...), con sus subpreguntas fijas como tabla compacta.
export async function generarReporteGrupoEspecial(
  visitaId: string,
  tipoGrupo: TipoGrupoEspecial
): Promise<{ nombreArchivo: string; buffer: Buffer } | null> {
  const visita = await db.visita.findUnique({
    where: { id: visitaId },
    include: { esquema: { select: { id: true, nombre: true } } },
  });
  if (!visita) return null;

  const plantilla = await db.plantilla.findFirst({
    where: { tipo: tipoGrupo, esquemas: { some: { id: visita.esquemaId } } },
  });
  if (!plantilla) return null;

  const todasLasPreguntas = await db.pregunta.findMany({
    where: { modulo: { esquemaId: visita.esquemaId } },
    orderBy: { orden: "asc" },
  });

  const respuestasDb = await db.respuesta.findMany({ where: { visitaId } });
  const valorPorPregunta = new Map(respuestasDb.map((r) => [r.preguntaId, r.valor]));

  const items = todasLasPreguntas.filter(
    (p) => p.clase === "PRINCIPAL" && p.generarSubPreguntasAuto === tipoGrupo && valorPorPregunta.get(p.id)?.trim()
  );

  const config = parsearConfig(plantilla.configJson);
  const children: (Paragraph | Table)[] = await construirEncabezado(plantilla);

  if (items.length === 0) {
    children.push(
      new Paragraph({
        spacing: { before: 200 },
        children: [
          new TextRun({
            text: `No se registró información de ${NOMBRE_GRUPO[tipoGrupo].titulo.toLowerCase()} en esta visita.`,
            italics: true,
          }),
        ],
      })
    );
  }

  items.forEach((item, idx) => {
    const nombre = valorPorPregunta.get(item.id)?.trim() || item.texto;
    children.push(
      new Paragraph({
        spacing: { before: 260, after: 120 },
        children: [new TextRun({ text: `${idx + 1}. ${nombre}`, bold: true, size: 22, color: config.colores.encabezadoModulo })],
      })
    );

    const subpreguntas = todasLasPreguntas
      .filter((p) => p.padreId === item.id && p.clase === "SECUNDARIA")
      .sort((a, b) => a.orden - b.orden);

    const filas = subpreguntas.map(
      (p) =>
        new TableRow({
          children: [
            celda(p.texto.replace(/:$/, ""), { negrita: true, ancho: 32, sombreado: config.colores.etiquetaDatosGenerales }),
            celda(valorPorPregunta.get(p.id)?.trim() || "(Sin responder)", { ancho: 68 }),
          ],
        })
    );
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filas }));
  });

  const documento = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(config.margenes.superior * 10),
              bottom: convertMillimetersToTwip(config.margenes.inferior * 10),
              left: convertMillimetersToTwip(config.margenes.izquierdo * 10),
              right: convertMillimetersToTwip(config.margenes.derecho * 10),
            },
          },
        },
        children,
      },
    ],
  });
  const buffer = await Packer.toBuffer(documento);

  const nombreArchivo = `${NOMBRE_GRUPO[tipoGrupo].archivo}_${visita.esquema.nombre.replace(/\s+/g, "_")}_${visita.fecha
    .toISOString()
    .slice(0, 10)}.docx`;

  return { nombreArchivo, buffer };
}
