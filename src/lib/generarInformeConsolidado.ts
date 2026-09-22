import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TextRun } from "docx";
import { db } from "@/lib/db";
import { imagenComoParrafo } from "@/lib/docxImagenes";
import { generarDatosInforme, type DatosInformeConsolidado, type RangoFechas } from "@/lib/informeConsolidado";
import { graficoBarras, graficoFavorabilidad, type BarraDato, type DatoFavorabilidad } from "@/lib/graficoBarrasDocx";
import { ETIQUETAS_RESULTADO_LABORATORIO, type ResultadoLaboratorio } from "@/lib/laboratorios";
import { ETIQUETAS_TIPO_PETICION_PQRS, type TipoPeticionPqrs } from "@/lib/pqrs";

const ANCHO_MEMBRETE_PX = 550;
const COLOR_FAVORABLE = "16A34A";
const COLOR_DESFAVORABLE = "DC2626";
const COLOR_PENDIENTE = "D97706";

function formatearFechaLarga(fecha: Date): string {
  return fecha.toLocaleDateString("es-CO", { dateStyle: "long", timeZone: "UTC" });
}

function tituloPeriodo(rango: RangoFechas): string {
  if (!rango.desde) return `Desde el inicio del proyecto hasta el ${formatearFechaLarga(rango.hasta)}`;
  return `Del ${formatearFechaLarga(rango.desde)} al ${formatearFechaLarga(rango.hasta)}`;
}

function encabezadoSeccion(texto: string): Paragraph {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 360, after: 160 }, children: [new TextRun({ text: texto })] });
}

function parrafoVacio(texto: string): Paragraph {
  return new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: texto, italics: true, size: 20, color: "64748B" })] });
}

function seccionVisitas(datos: DatosInformeConsolidado): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [encabezadoSeccion(`1. Visitas / Inspecciones (${datos.totalVisitas})`)];
  if (datos.visitas.length === 0) {
    children.push(parrafoVacio("No se registraron visitas en este periodo para el lote seleccionado."));
    return children;
  }
  const barras: DatoFavorabilidad[] = datos.visitas.map((v) => ({ etiqueta: v.esquemaNombre, porcentaje: v.cumplimientoPromedio }));
  children.push(graficoFavorabilidad(barras));
  return children;
}

// Las Encuestas no son visitas de inspección: van en su propia sección,
// agrupadas por institución en vez de por esquema.
function seccionEncuestas(datos: DatosInformeConsolidado): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [encabezadoSeccion(`2. Encuestas realizadas (${datos.totalEncuestas})`)];
  if (datos.encuestas.length === 0) {
    children.push(parrafoVacio("No se registraron encuestas en este periodo para el lote seleccionado."));
    return children;
  }
  const barras: BarraDato[] = datos.encuestas.map((e) => ({
    etiqueta: e.institucion,
    valor: e.cantidad,
    sufijo: " encuesta(s)",
    notaSecundaria: e.favorabilidad !== null ? `Favorabilidad: ${e.favorabilidad}%` : undefined,
  }));
  children.push(graficoBarras(barras));
  return children;
}

function seccionCaes(datos: DatosInformeConsolidado): (Paragraph | Table)[] {
  const { caes } = datos;
  const children: (Paragraph | Table)[] = [
    encabezadoSeccion(`3. Actas CAES (${caes.institucionesConConformacion + caes.totalReunion})`),
  ];

  children.push(
    new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Acta de Conformación (cobertura)", bold: true, size: 20 })] })
  );
  if (caes.totalInstituciones === 0) {
    children.push(parrafoVacio("No hay instituciones registradas para el lote seleccionado."));
  } else {
    children.push(graficoFavorabilidad([{ etiqueta: "Instituciones con acta", porcentaje: caes.porcentajeConformacion }]));
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `${caes.institucionesConConformacion} de ${caes.totalInstituciones} institución(es).`,
            italics: true,
            size: 16,
            color: "64748B",
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: "Actas de Reunión", bold: true, size: 20 })] }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: `${caes.totalReunion} acta(s) registrada(s) en el periodo.`, size: 20 })],
    })
  );

  return children;
}

function seccionLaboratorios(datos: DatosInformeConsolidado): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [encabezadoSeccion(`4. Laboratorios (${datos.totalLaboratorios})`)];
  if (datos.laboratorios.length === 0) {
    children.push(parrafoVacio("No se registraron muestras de laboratorio en este periodo para el lote seleccionado."));
    return children;
  }
  const barras: BarraDato[] = datos.laboratorios.map((l) => ({
    etiqueta: ETIQUETAS_RESULTADO_LABORATORIO[l.resultado as ResultadoLaboratorio] ?? l.resultado,
    valor: l.cantidad,
    sufijo: " muestra(s)",
    color: l.resultado === "FAVORABLE" ? COLOR_FAVORABLE : COLOR_DESFAVORABLE,
  }));
  children.push(graficoBarras(barras));
  return children;
}

function seccionPqrs(datos: DatosInformeConsolidado): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [
    encabezadoSeccion(`5. PQRS (${datos.totalPqrs})`),
    parrafoVacio("PQRS es un dato global del sistema (no se filtra por lote, solo por el periodo del informe)."),
  ];
  if (datos.totalPqrs === 0) {
    children.push(parrafoVacio("No se registraron peticiones en este periodo."));
    return children;
  }

  if (datos.pqrs.length > 0) {
    const barrasTipo: BarraDato[] = datos.pqrs.map((p) => ({
      etiqueta: ETIQUETAS_TIPO_PETICION_PQRS[p.tipo as TipoPeticionPqrs] ?? p.tipo,
      valor: p.cantidad,
      sufijo: " petición(es)",
    }));
    children.push(graficoBarras(barrasTipo));
  }

  children.push(
    new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "Estado de las respuestas", bold: true, size: 20 })] }),
    graficoBarras([
      { etiqueta: "Respondidas", valor: datos.pqrsRespondidas, color: COLOR_FAVORABLE },
      { etiqueta: "Pendientes", valor: datos.pqrsPendientes, color: COLOR_PENDIENTE },
    ])
  );
  return children;
}

export async function generarInformeConsolidado(
  loteId: string,
  rango: RangoFechas,
  tipoInforme: "MENSUAL" | "GENERAL"
): Promise<{ nombreArchivo: string; buffer: Buffer } | null> {
  const datos = await generarDatosInforme(loteId, rango);
  if (!datos) return null;

  const datosEmpresa = await db.datosEmpresa.findUnique({ where: { id: "empresa" } });
  const children: (Paragraph | Table)[] = [];

  if (datosEmpresa?.membreteUrl) {
    const parrafoMembrete = imagenComoParrafo(datosEmpresa.membreteUrl, ANCHO_MEMBRETE_PX, 200);
    if (parrafoMembrete) children.push(parrafoMembrete);
  } else if (datosEmpresa?.razonSocial) {
    children.push(
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: datosEmpresa.razonSocial, bold: true, size: 24 })] })
    );
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 60 },
      children: [new TextRun({ text: tipoInforme === "MENSUAL" ? "Informe Mensual de Gestión" : "Informe General de Gestión", bold: true, size: 30 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: `Lote: ${datos.lote.nombre} — ${datos.lote.departamento}`, bold: true, size: 22 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: tituloPeriodo(rango), italics: true, size: 20 })],
    })
  );

  children.push(
    ...seccionVisitas(datos),
    ...seccionEncuestas(datos),
    ...seccionCaes(datos),
    ...seccionLaboratorios(datos),
    ...seccionPqrs(datos)
  );

  const documento = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(documento);

  const sufijoNombre = tipoInforme === "MENSUAL" ? `Mensual_${rango.desde!.toISOString().slice(0, 7)}` : "General";
  const nombreArchivo = `Informe_${sufijoNombre}_${datos.lote.nombre.replace(/\s+/g, "_")}.docx`;

  return { nombreArchivo, buffer };
}
