import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { resolverCadenasDeEncuestas, calcularEstadisticasVisitas, type StatsEsquema } from "@/lib/estadisticasPreguntas";
import { ETIQUETAS_AGRUPACION, type AgrupacionEstadistica, type CadenaResuelta } from "@/lib/estadisticasEncuestas";

const NIVELES_A_HEADING = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
];

const ANCHO_BARRA = 20;

function barraTexto(porcentaje: number): string {
  const llenos = Math.max(0, Math.min(ANCHO_BARRA, Math.round((porcentaje / 100) * ANCHO_BARRA)));
  return "█".repeat(llenos) + "░".repeat(ANCHO_BARRA - llenos);
}

function parrafosStats(esquemas: StatsEsquema[]): Paragraph[] {
  const parrafos: Paragraph[] = [];

  for (const e of esquemas) {
    parrafos.push(
      new Paragraph({
        spacing: { before: 150, after: 80 },
        children: [
          new TextRun({ text: `${e.esquemaNombre} — `, bold: true }),
          new TextRun({ text: `${e.totalEncuestas} encuesta(s)` }),
          ...(e.favorabilidadTotal !== null
            ? [new TextRun({ text: `, favorabilidad total: ${e.favorabilidadTotal}%` })]
            : []),
        ],
      })
    );

    for (const p of e.preguntas) {
      parrafos.push(
        new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: p.texto, bold: true })] })
      );

      if (p.opciones.length > 0) {
        for (const op of p.opciones) {
          parrafos.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `  ${op.opcion.padEnd(14)} ${barraTexto(op.porcentaje)} ${op.porcentaje}% (${op.cantidad})`,
                  font: "Courier New",
                  size: 18,
                }),
              ],
            })
          );
        }
        if (p.favorabilidad !== null) {
          parrafos.push(
            new Paragraph({
              children: [new TextRun({ text: `  Favorabilidad: ${p.favorabilidad}%`, italics: true, size: 18 })],
            })
          );
        }
      } else {
        parrafos.push(
          new Paragraph({
            children: [new TextRun({ text: `  ${p.totalRespuestas} respuesta(s) registradas.`, italics: true, size: 18 })],
          })
        );
      }
    }

    if (e.preguntas.length === 0) {
      parrafos.push(new Paragraph({ children: [new TextRun({ text: "  Este esquema no tiene preguntas.", italics: true })] }));
    }
  }

  return parrafos;
}

// Genera un .docx con las estadísticas de encuestas desglosadas en cascada
// según los niveles dados (ej. ["departamento","lote"] o los 5 niveles
// completos). En el nivel más profundo se listan las estadísticas por
// esquema/pregunta (porcentajes + favorabilidad).
export async function generarReporteEstadisticas(niveles: AgrupacionEstadistica[]): Promise<Buffer> {
  const filas = await resolverCadenasDeEncuestas();

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: "Informe estadístico de encuestas", bold: true, size: 32 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: `Desglosado por: ${niveles.map((n) => ETIQUETAS_AGRUPACION[n]).join(" → ")}`,
          italics: true,
        }),
      ],
    }),
  ];

  async function recorrer(filasActuales: { id: string; estado: string; cadena: CadenaResuelta }[], nivelIndice: number) {
    if (nivelIndice >= niveles.length) {
      const esquemas = await calcularEstadisticasVisitas(filasActuales.map((f) => f.id));
      children.push(...parrafosStats(esquemas));
      return;
    }

    const nivel = niveles[nivelIndice];
    const grupos = new Map<string, { id: string; estado: string; cadena: CadenaResuelta }[]>();
    for (const f of filasActuales) {
      const clave = f.cadena[nivel];
      const lista = grupos.get(clave) ?? [];
      lista.push(f);
      grupos.set(clave, lista);
    }

    const nombresOrdenados = [...grupos.keys()].sort((a, b) => a.localeCompare(b));
    for (const nombre of nombresOrdenados) {
      children.push(
        new Paragraph({
          heading: NIVELES_A_HEADING[nivelIndice] ?? HeadingLevel.HEADING_6,
          spacing: { before: 300, after: 100 },
          children: [new TextRun({ text: `${ETIQUETAS_AGRUPACION[nivel]}: ${nombre}` })],
        })
      );
      await recorrer(grupos.get(nombre) ?? [], nivelIndice + 1);
    }
  }

  await recorrer(filas, 0);

  const documento = new Document({ sections: [{ children }] });
  return Packer.toBuffer(documento);
}
