import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  TabStopType,
  TabStopPosition,
  TextRun,
} from "docx";
import { db } from "@/lib/db";
import { imagenComoParrafo } from "@/lib/docxImagenes";

const ANCHO_MEMBRETE_PX = 550;
const ANCHO_FIRMA_PX = 200;

// timeZone: "UTC" evita que un campo de solo-fecha (guardado como
// medianoche UTC) se corra un día al mostrarse en la zona horaria del
// servidor (ej. America/Bogota, UTC-5).
function formatearFechaLarga(fecha: Date): string {
  return fecha.toLocaleDateString("es-CO", { dateStyle: "long", timeZone: "UTC" });
}

function parrafosDeTexto(texto: string): Paragraph[] {
  const lineas = texto.split("\n");
  return lineas.map(
    (linea) =>
      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        children: [new TextRun({ text: linea, size: 22 })],
      })
  );
}

export async function generarRespuestaPqrs(peticionId: string): Promise<{ nombreArchivo: string; buffer: Buffer } | null> {
  const peticion = await db.peticionPqrs.findUnique({
    where: { id: peticionId },
    include: { responsable: true, respuesta: true },
  });
  if (!peticion || !peticion.respuesta) return null;

  const respuesta = peticion.respuesta;
  const datosEmpresa = await db.datosEmpresa.findUnique({ where: { id: "empresa" } });

  const children: Paragraph[] = [];

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

  // Radicado de salida + fecha a la izquierda; "Re/" + radicado de entrada +
  // fecha a la derecha.
  children.push(
    new Paragraph({
      spacing: { before: 260, after: 260 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "CBD5E1", space: 4 } },
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      children: [
        new TextRun({
          text: `${respuesta.radicadoSalida} — ${formatearFechaLarga(respuesta.fechaRadicado)}`,
          bold: true,
          size: 20,
        }),
        new TextRun({
          text: `\tRe/ ${peticion.radicadoEntrada} — ${formatearFechaLarga(peticion.fechaRadicado)}`,
          size: 20,
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: "Señor(a):", bold: true, size: 22 })],
    }),
    new Paragraph({
      spacing: { after: 260 },
      children: [new TextRun({ text: peticion.peticionario, size: 22 })],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 260 },
      children: [
        new TextRun({ text: "Asunto: ", bold: true, size: 22 }),
        new TextRun({ text: `Re/ ${peticion.asunto}`, size: 22 }),
      ],
    })
  );

  children.push(
    new Paragraph({
      spacing: { after: 260 },
      children: [new TextRun({ text: "Cordial saludo,", size: 22 })],
    })
  );

  children.push(...parrafosDeTexto(respuesta.texto));

  children.push(
    new Paragraph({
      spacing: { before: 200, after: 600 },
      children: [new TextRun({ text: "Cordialmente,", size: 22 })],
    })
  );

  if (peticion.responsable.firmaUrl) {
    const parrafoFirma = imagenComoParrafo(peticion.responsable.firmaUrl, ANCHO_FIRMA_PX, 100, AlignmentType.LEFT);
    if (parrafoFirma) children.push(parrafoFirma);
  }

  const cargo = peticion.responsable.cargo || datosEmpresa?.representanteLegalCargo || "";

  children.push(
    new Paragraph({
      spacing: { before: peticion.responsable.firmaUrl ? 0 : 400 },
      children: [new TextRun({ text: peticion.responsable.nombre, bold: true, size: 22 })],
    })
  );
  if (cargo) {
    children.push(new Paragraph({ children: [new TextRun({ text: cargo, size: 22 })] }));
  }

  const documento = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(documento);

  const nombreArchivo = `Respuesta_${respuesta.radicadoSalida.replace(/[^A-Za-z0-9-]/g, "")}.docx`;

  return { nombreArchivo, buffer };
}
