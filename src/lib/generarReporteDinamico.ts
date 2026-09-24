import path from "node:path";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { db } from "@/lib/db";
import { imagenComoParrafo } from "@/lib/docxImagenes";

const ANCHO_MEMBRETE_PX = 550;
const ANCHO_IMAGEN_PX = 260;
const ALTO_MAXIMO_IMAGEN_PX = 350;

function formatearFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
}

const CAMPOS_METADATA: { clave: "operador" | "nit" | "municipio" | "institucion" | "sede" | "zodes" | "lote"; etiqueta: string }[] = [
  { clave: "operador", etiqueta: "Operador" },
  { clave: "nit", etiqueta: "NIT" },
  { clave: "municipio", etiqueta: "Municipio" },
  { clave: "institucion", etiqueta: "Institución" },
  { clave: "sede", etiqueta: "Sede" },
  { clave: "zodes", etiqueta: "ZODES" },
  { clave: "lote", etiqueta: "Lote" },
];

export async function generarReporteVisita(
  visitaId: string
): Promise<{ nombreArchivo: string; buffer: Buffer } | null> {
  const visita = await db.visita.findUnique({
    where: { id: visitaId },
    include: { esquema: { select: { nombre: true } } },
  });
  if (!visita) return null;

  const modulos = await db.moduloEsquema.findMany({
    where: { esquemaId: visita.esquemaId },
    orderBy: { orden: "asc" },
    include: { preguntas: { orderBy: [{ ordenPanel: "asc" }, { orden: "asc" }] } },
  });

  const respuestas = await db.respuesta.findMany({ where: { visitaId } });
  const respuestaPorPregunta = new Map(respuestas.map((r) => [r.preguntaId, r]));

  const datosEmpresa = await db.datosEmpresa.findUnique({ where: { id: "empresa" } });

  const children: (Paragraph)[] = [];

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
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: `Informe de Visita — ${visita.esquema.nombre}` })],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: `Fecha: ${formatearFecha(visita.fecha)}`, italics: true })],
    })
  );

  for (const { clave, etiqueta } of CAMPOS_METADATA) {
    const valor = visita[clave];
    if (!valor) continue;
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${etiqueta}: `, bold: true }), new TextRun({ text: valor })],
      })
    );
  }

  for (const modulo of modulos) {
    if (modulo.preguntas.length === 0) continue;

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 },
        children: [new TextRun({ text: modulo.nombre })],
      })
    );

    for (const pregunta of modulo.preguntas) {
      const esSub = pregunta.clase === "SECUNDARIA";
      const respuesta = respuestaPorPregunta.get(pregunta.id);

      if (pregunta.tipo === "FOTO" || pregunta.tipo === "FIRMA") {
        children.push(
          new Paragraph({
            indent: esSub ? { left: 400 } : undefined,
            spacing: { before: 100 },
            children: [new TextRun({ text: pregunta.texto, bold: !esSub })],
          })
        );
        const parrafoImagen = respuesta?.archivoUrl
          ? imagenComoParrafo(respuesta.archivoUrl, ANCHO_IMAGEN_PX, ALTO_MAXIMO_IMAGEN_PX)
          : null;
        children.push(
          parrafoImagen ??
            new Paragraph({
              indent: esSub ? { left: 400 } : undefined,
              children: [new TextRun({ text: "(Sin imagen)", italics: true })],
            })
        );
        continue;
      }

      if (pregunta.tipo === "ARCHIVO") {
        const nombreArchivo = respuesta?.archivoUrl ? path.basename(respuesta.archivoUrl) : null;
        children.push(
          new Paragraph({
            indent: esSub ? { left: 400 } : undefined,
            spacing: { before: 100 },
            children: [
              new TextRun({ text: `${pregunta.texto} `, bold: !esSub }),
              new TextRun({
                text: nombreArchivo ? `Archivo adjunto: ${nombreArchivo}` : "(Sin archivo)",
                italics: true,
              }),
            ],
          })
        );
        continue;
      }

      const valorTexto = respuesta?.valor?.trim();
      children.push(
        new Paragraph({
          indent: esSub ? { left: 400 } : undefined,
          spacing: { before: 100 },
          children: [
            new TextRun({ text: `${pregunta.texto} `, bold: !esSub }),
            new TextRun({ text: valorTexto || "(Sin respuesta)", italics: !valorTexto }),
          ],
        })
      );
    }
  }

  const documento = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(documento);

  const nombreArchivo = `Informe_${visita.esquema.nombre.replace(/\s+/g, "_")}_${visita.fecha.toISOString().slice(0, 10)}.docx`;

  return { nombreArchivo, buffer };
}
