import path from "node:path";
import { AlignmentType, Document, Packer, Paragraph, Table, TableRow, TextRun, WidthType, BorderStyle, convertMillimetersToTwip } from "docx";
import { db } from "@/lib/db";
import {
  esModuloDePreguntas,
  esPreguntaDeGrupoEspecial,
  respuestaNumericaAplicable,
  textoObservacion,
  valorMaximoPregunta,
  type PreguntaPlantilla,
} from "@/lib/plantillaPreguntas";
import { aplicarConfigModulos, parsearConfig, type ColoresPlantilla } from "@/lib/plantillaConfig";
import { celda, construirEncabezado } from "@/lib/plantillaDocxComun";

function tablaEncabezadoModuloPreguntas(colorEncabezado: string): TableRow {
  return new TableRow({
    tableHeader: true,
    children: [
      celda("N°", { negrita: true, ancho: 7, sombreado: colorEncabezado, alineacion: AlignmentType.CENTER }),
      celda("Variable", { negrita: true, ancho: 51, sombreado: colorEncabezado }),
      celda("Valor (ítem)", { negrita: true, ancho: 10, sombreado: colorEncabezado, alineacion: AlignmentType.CENTER }),
      celda("Calificación", { negrita: true, ancho: 13, sombreado: colorEncabezado, alineacion: AlignmentType.CENTER }),
      celda("Observación", { negrita: true, ancho: 19, sombreado: colorEncabezado }),
    ],
  });
}

type RespuestaMapa = Map<string, { valor: string | null; archivoUrl: string | null }>;

function filaPreguntaCalificada(
  pregunta: PreguntaPlantilla,
  itemNumero: string,
  todasLasPreguntas: PreguntaPlantilla[],
  respuestas: RespuestaMapa
): TableRow {
  const respuesta = respuestas.get(pregunta.id);
  const valorMax = valorMaximoPregunta(pregunta);
  const observacion = textoObservacion(
    pregunta,
    todasLasPreguntas,
    new Map(Array.from(respuestas.entries()).map(([id, r]) => [id, r.valor]))
  );

  return new TableRow({
    children: [
      celda(itemNumero, { ancho: 7, alineacion: AlignmentType.CENTER }),
      celda(pregunta.texto, { ancho: 51 }),
      celda(valorMax !== null ? String(valorMax) : "—", { ancho: 10, alineacion: AlignmentType.CENTER }),
      celda(respuesta?.valor?.trim() || "(Sin responder)", { ancho: 13, alineacion: AlignmentType.CENTER }),
      celda(observacion || "—", { ancho: 19 }),
    ],
  });
}

function filaTotalesModulo(
  indiceModulo: number,
  valorMaxTotal: number,
  sumaCumplida: number,
  porcentaje: number | null,
  colorTotales: string
): TableRow {
  return new TableRow({
    children: [
      celda(`Total módulo (${indiceModulo})`, { negrita: true, columnSpan: 2, ancho: 58, sombreado: colorTotales }),
      celda(String(valorMaxTotal), { negrita: true, ancho: 10, sombreado: colorTotales, alineacion: AlignmentType.CENTER }),
      celda(String(sumaCumplida), { negrita: true, ancho: 13, sombreado: colorTotales, alineacion: AlignmentType.CENTER }),
      celda(porcentaje === null ? "N/A" : `${porcentaje.toFixed(1)}%`, { negrita: true, ancho: 19, sombreado: colorTotales }),
    ],
  });
}

function valorLegibleDatoGeneral(pregunta: PreguntaPlantilla, respuesta: { valor: string | null; archivoUrl: string | null } | undefined): string {
  if (pregunta.tipo === "FOTO" || pregunta.tipo === "FIRMA") {
    return respuesta?.archivoUrl ? "Ver evidencia adjunta" : "(Sin evidencia)";
  }
  if (pregunta.tipo === "ARCHIVO") {
    return respuesta?.archivoUrl ? `Archivo: ${path.basename(respuesta.archivoUrl)}` : "(Sin archivo)";
  }
  return respuesta?.valor?.trim() || "(Sin responder)";
}

function tablaDatosGenerales(preguntas: PreguntaPlantilla[], respuestas: RespuestaMapa, colorEtiqueta: string): Table {
  const principales = preguntas
    .filter((p) => p.clase === "PRINCIPAL")
    .sort((a, b) => (a.ordenPanel ?? a.orden) - (b.ordenPanel ?? b.orden));
  const filas = principales.map(
    (p) =>
      new TableRow({
        children: [
          celda(p.texto.replace(/:$/, ""), { negrita: true, ancho: 32, sombreado: colorEtiqueta }),
          celda(valorLegibleDatoGeneral(p, respuestas.get(p.id)), { ancho: 68 }),
        ],
      })
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filas });
}

export async function generarReportePlantilla(
  visitaId: string
): Promise<{ nombreArchivo: string; buffer: Buffer } | null> {
  const visita = await db.visita.findUnique({
    where: { id: visitaId },
    include: { esquema: { select: { id: true, nombre: true } } },
  });
  if (!visita) return null;
  const plantilla = await db.plantilla.findFirst({
    where: { tipo: "VISITA", esquemas: { some: { id: visita.esquemaId } } },
  });
  if (!plantilla) return null;

  const modulosDb = await db.moduloEsquema.findMany({
    where: { esquemaId: visita.esquemaId },
    orderBy: { orden: "asc" },
    include: { preguntas: { orderBy: [{ ordenPanel: "asc" }, { orden: "asc" }] } },
  });

  // Materia prima y organoléptico siempre van en su propia plantilla
  // dedicada (Plantilla Materia Prima / Organolépticas), nunca aquí.
  const modulos = modulosDb.map((m) => {
    const idsExcluidos = new Set(
      m.preguntas.filter((p) => esPreguntaDeGrupoEspecial(p as PreguntaPlantilla)).map((p) => p.id)
    );
    return {
      ...m,
      preguntas: m.preguntas.filter((p) => !idsExcluidos.has(p.id) && !(p.padreId && idsExcluidos.has(p.padreId))),
    };
  });

  const respuestasDb = await db.respuesta.findMany({ where: { visitaId } });
  const respuestas: RespuestaMapa = new Map(
    respuestasDb.map((r) => [r.preguntaId, { valor: r.valor, archivoUrl: r.archivoUrl }])
  );

  const children: (Paragraph | Table)[] = await construirEncabezado(plantilla);

  const config = parsearConfig(plantilla.configJson);
  const colores: ColoresPlantilla = config.colores;
  const modulosOrdenados = aplicarConfigModulos(
    modulos as unknown as { id: string; nombre: string; preguntas: PreguntaPlantilla[] }[],
    config,
    visita.esquemaId,
    (p) => p.id
  );

  let indiceModuloCalificado = 0;

  for (const modulo of modulosOrdenados) {
    const preguntas = modulo.preguntas;
    if (preguntas.length === 0) continue;

    children.push(
      new Paragraph({
        spacing: { before: 260, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: colores.encabezadoModulo, space: 2 } },
        children: [new TextRun({ text: modulo.nombre, bold: true, size: 22, color: colores.encabezadoModulo })],
      })
    );

    if (esModuloDePreguntas(preguntas)) {
      indiceModuloCalificado += 1;
      const principales = preguntas.filter((p) => p.clase === "PRINCIPAL");

      let valorMaxTotal = 0;
      let sumaCumplida = 0;
      let denominadorAplicable = 0;
      const filas: TableRow[] = [tablaEncabezadoModuloPreguntas(colores.encabezadoTabla)];

      principales.forEach((pregunta, idx) => {
        const itemNumero = `${indiceModuloCalificado}.${idx + 1}`;
        filas.push(filaPreguntaCalificada(pregunta, itemNumero, preguntas, respuestas));

        const max = valorMaximoPregunta(pregunta);
        if (max !== null) {
          valorMaxTotal += max;
          const aplicable = respuestaNumericaAplicable(respuestas.get(pregunta.id)?.valor);
          if (aplicable !== null) {
            denominadorAplicable += max;
            sumaCumplida += aplicable;
          }
        }
      });

      const porcentaje = denominadorAplicable > 0 ? (sumaCumplida / denominadorAplicable) * 100 : null;
      filas.push(filaTotalesModulo(indiceModuloCalificado, valorMaxTotal, sumaCumplida, porcentaje, colores.filaTotales));

      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: filas }));
    } else {
      children.push(tablaDatosGenerales(preguntas, respuestas, colores.etiquetaDatosGenerales));
    }
  }

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

  const nombreArchivo = `Informe_${visita.esquema.nombre.replace(/\s+/g, "_")}_${visita.fecha.toISOString().slice(0, 10)}.docx`;

  return { nombreArchivo, buffer };
}
