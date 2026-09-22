// Piezas compartidas entre los generadores de Word de Plantillas
// (generarReportePlantilla.ts para plantillas tipo VISITA y
// generarReporteGrupoEspecial.ts para MATERIA_PRIMA/ORGANOLEPTICO): el
// membrete + línea de NIT/correo/versión + descripción, y el helper de celda
// de tabla, para que ambos documentos luzcan consistentes.
import {
  AlignmentType,
  Paragraph,
  Table,
  TableCell,
  TabStopType,
  TabStopPosition,
  TextRun,
  WidthType,
  BorderStyle,
  VerticalAlign,
} from "docx";
import { db } from "@/lib/db";
import { imagenComoParrafo } from "@/lib/docxImagenes";
import { parsearContenido, type Parrafo, type RunTexto } from "@/lib/contenidoEnriquecido";

const ANCHO_MEMBRETE_PX = 550;

function runsADocx(runs: RunTexto[]): TextRun[] {
  if (runs.length === 0) return [new TextRun({ text: "" })];
  return runs.map((r) => new TextRun({ text: r.t, bold: r.b, italics: r.i, underline: r.u ? {} : undefined }));
}

export function contenidoADocx(parrafos: Parrafo[]): Paragraph[] {
  return parrafos.map((p) => {
    const prefijo = p.lista === "bullet" ? "•  " : undefined;
    const children = prefijo ? [new TextRun({ text: prefijo }), ...runsADocx(p.runs)] : runsADocx(p.runs);
    return new Paragraph({
      alignment: p.centrado ? AlignmentType.CENTER : undefined,
      indent: p.lista ? { left: 400 } : undefined,
      spacing: { after: 80 },
      children,
    });
  });
}

export function celda(
  texto: string,
  opciones: {
    negrita?: boolean;
    ancho?: number;
    sombreado?: string;
    columnSpan?: number;
    alineacion?: (typeof AlignmentType)[keyof typeof AlignmentType];
  } = {}
): TableCell {
  return new TableCell({
    width: opciones.ancho ? { size: opciones.ancho, type: WidthType.PERCENTAGE } : undefined,
    shading: opciones.sombreado ? { fill: opciones.sombreado } : undefined,
    columnSpan: opciones.columnSpan,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opciones.alineacion,
        children: [new TextRun({ text: texto, bold: opciones.negrita, size: 18 })],
      }),
    ],
  });
}

export async function construirEncabezado(plantilla: {
  versionFormato: string;
  descripcionVisitaJson: string;
}): Promise<(Paragraph | Table)[]> {
  const datosEmpresa = await db.datosEmpresa.findUnique({ where: { id: "empresa" } });
  const children: (Paragraph | Table)[] = [];

  if (datosEmpresa?.membreteUrl) {
    const parrafoMembrete = imagenComoParrafo(datosEmpresa.membreteUrl, ANCHO_MEMBRETE_PX, 200);
    if (parrafoMembrete) children.push(parrafoMembrete);
  } else if (datosEmpresa?.razonSocial) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: datosEmpresa.razonSocial, bold: true, size: 24 })],
      })
    );
  }

  children.push(
    new Paragraph({
      spacing: { before: 150, after: 200 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1", space: 4 } },
      tabStops: [
        { type: TabStopType.CENTER, position: TabStopPosition.MAX / 2 },
        { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
      ],
      children: [
        new TextRun({ text: `NIT: ${datosEmpresa?.nit || "—"}`, size: 18, bold: true }),
        new TextRun({ text: `\tCorreo electrónico: ${datosEmpresa?.correo || "—"}`, size: 18 }),
        new TextRun({ text: `\t${plantilla.versionFormato || ""}`, size: 18, bold: true }),
      ],
    })
  );

  children.push(...contenidoADocx(parsearContenido(plantilla.descripcionVisitaJson)));

  return children;
}
