// PDF "editable" del Dashboard General: se dibuja con texto real y
// rectángulos vectoriales (jsPDF), no es una captura de pantalla, así que el
// texto queda seleccionable/copiable y las barras son formas editables en
// cualquier editor de PDF — a cambio, no es un calco pixel-por-pixel de la
// pantalla, sino la misma información organizada en secciones equivalentes.
import fs from "node:fs";
import path from "node:path";
import { jsPDF } from "jspdf";
import sizeOf from "image-size";
import { db } from "@/lib/db";
import { obtenerResumenDashboard, type ResumenDepartamento, type ResumenLote } from "@/lib/dashboardResumen";
import { ETIQUETAS_RESULTADO_LABORATORIO, type ResultadoLaboratorio } from "@/lib/laboratorios";
import { colorRgbPorcentaje } from "@/lib/colorFavorabilidad";

const MARGEN = 15;
const ALTO_PAGINA = 297;
const ANCHO_PAGINA = 210;
const ANCHO_UTIL = ANCHO_PAGINA - MARGEN * 2;

const COLOR_TEXTO: [number, number, number] = [30, 41, 59];
const COLOR_SUBTEXTO: [number, number, number] = [100, 116, 139];
const COLOR_RESTO: [number, number, number] = [226, 232, 240];
const COLOR_FAVORABLE: [number, number, number] = [22, 163, 74];
const COLOR_DESFAVORABLE: [number, number, number] = [220, 38, 38];
const PALETA: [number, number, number][] = [
  [29, 78, 216],
  [14, 165, 233],
  [22, 163, 74],
  [217, 119, 6],
  [220, 38, 38],
  [124, 58, 237],
  [8, 145, 178],
  [100, 116, 139],
];

type Contexto = { doc: jsPDF; y: number };
type DatoBarra = { etiqueta: string; valor: number; sufijo?: string; nota?: string; color?: [number, number, number] };

function saltoSiNecesario(ctx: Contexto, alturaNecesaria: number) {
  if (ctx.y + alturaNecesaria > ALTO_PAGINA - MARGEN) {
    ctx.doc.addPage();
    ctx.y = MARGEN;
  }
}

function escribir(
  ctx: Contexto,
  texto: string,
  opciones: { tamano?: number; negrita?: boolean; italica?: boolean; color?: [number, number, number]; x?: number; centrado?: boolean } = {}
) {
  const { tamano = 10, negrita = false, italica = false, color = COLOR_TEXTO, x = MARGEN, centrado = false } = opciones;
  ctx.doc.setFont("helvetica", negrita ? "bold" : italica ? "italic" : "normal");
  ctx.doc.setFontSize(tamano);
  ctx.doc.setTextColor(...color);
  ctx.doc.text(texto, centrado ? ANCHO_PAGINA / 2 : x, ctx.y, centrado ? { align: "center" } : undefined);
}

function encabezadoSeccion(ctx: Contexto, texto: string) {
  saltoSiNecesario(ctx, 14);
  ctx.y += 4;
  escribir(ctx, texto, { tamano: 13, negrita: true, color: PALETA[0] });
  ctx.y += 2;
  ctx.doc.setDrawColor(...PALETA[0]);
  ctx.doc.setLineWidth(0.4);
  ctx.doc.line(MARGEN, ctx.y, ANCHO_PAGINA - MARGEN, ctx.y);
  ctx.y += 6;
}

function subtitulo(ctx: Contexto, texto: string) {
  saltoSiNecesario(ctx, 8);
  escribir(ctx, texto, { tamano: 11.5, negrita: true });
  ctx.y += 5.5;
}

function textoVacio(ctx: Contexto, texto: string) {
  saltoSiNecesario(ctx, 6);
  escribir(ctx, texto, { tamano: 9, italica: true, color: COLOR_SUBTEXTO });
  ctx.y += 7;
}

function dibujarGrupoBarras(ctx: Contexto, datos: DatoBarra[]) {
  const max = Math.max(1, ...datos.map((d) => d.valor));
  const anchoBarra = ANCHO_UTIL;
  const altoBarra = 3.2;

  datos.forEach((d, i) => {
    const alturaFila = d.nota ? 13.5 : 9.5;
    saltoSiNecesario(ctx, alturaFila);

    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(9.5);
    ctx.doc.setTextColor(...COLOR_TEXTO);
    ctx.doc.text(d.etiqueta, MARGEN, ctx.y);
    ctx.doc.setFont("helvetica", "bold");
    ctx.doc.text(`${d.valor}${d.sufijo ?? ""}`, ANCHO_PAGINA - MARGEN, ctx.y, { align: "right" });
    ctx.y += 4.2;

    if (d.nota) {
      escribir(ctx, d.nota, { tamano: 8, italica: true, color: COLOR_SUBTEXTO });
      ctx.y += 4;
    }

    const color = d.color ?? PALETA[i % PALETA.length];
    const pct = Math.max(0, Math.min(100, (d.valor / max) * 100));
    const anchoLleno = pct > 0 ? Math.max(anchoBarra * (pct / 100), 2) : 0;

    ctx.doc.setFillColor(...COLOR_RESTO);
    ctx.doc.roundedRect(MARGEN, ctx.y, anchoBarra, altoBarra, 1, 1, "F");
    if (anchoLleno > 0) {
      ctx.doc.setFillColor(...color);
      ctx.doc.roundedRect(MARGEN, ctx.y, anchoLleno, altoBarra, 1, 1, "F");
    }
    ctx.y += altoBarra + 4.5;
  });
}

type DatoFavorabilidad = { etiqueta: string; porcentaje: number | null };

// Barra de favorabilidad/cumplimiento: se escala siempre contra 100% (no
// contra el máximo del grupo) y se colorea por umbral en vez de con la
// paleta cíclica, para que el color siempre indique qué tan buena es esa
// cifra puntual (ver web/src/lib/colorFavorabilidad.ts).
function dibujarGrupoFavorabilidad(ctx: Contexto, datos: DatoFavorabilidad[]) {
  const anchoBarra = ANCHO_UTIL;
  const altoBarra = 3.2;

  datos.forEach((d) => {
    saltoSiNecesario(ctx, 9.5);

    if (d.porcentaje === null) {
      ctx.doc.setFont("helvetica", "normal");
      ctx.doc.setFontSize(9.5);
      ctx.doc.setTextColor(...COLOR_TEXTO);
      ctx.doc.text(d.etiqueta, MARGEN, ctx.y);
      ctx.doc.setFont("helvetica", "italic");
      ctx.doc.setFontSize(8.5);
      ctx.doc.setTextColor(...COLOR_SUBTEXTO);
      ctx.doc.text("Sin datos de cumplimiento", ANCHO_PAGINA - MARGEN, ctx.y, { align: "right" });
      ctx.y += 9.5;
      return;
    }

    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(9.5);
    ctx.doc.setTextColor(...COLOR_TEXTO);
    ctx.doc.text(d.etiqueta, MARGEN, ctx.y);
    ctx.doc.setFont("helvetica", "bold");
    ctx.doc.text(`${d.porcentaje}%`, ANCHO_PAGINA - MARGEN, ctx.y, { align: "right" });
    ctx.y += 4.2;

    const color = colorRgbPorcentaje(d.porcentaje);
    const pct = Math.max(0, Math.min(100, d.porcentaje));
    const anchoLleno = pct > 0 ? Math.max(anchoBarra * (pct / 100), 2) : 0;

    ctx.doc.setFillColor(...COLOR_RESTO);
    ctx.doc.roundedRect(MARGEN, ctx.y, anchoBarra, altoBarra, 1, 1, "F");
    if (anchoLleno > 0) {
      ctx.doc.setFillColor(...color);
      ctx.doc.roundedRect(MARGEN, ctx.y, anchoLleno, altoBarra, 1, 1, "F");
    }
    ctx.y += altoBarra + 4.5;
  });
}

function dibujarStats(ctx: Contexto, stats: { etiqueta: string; valor: number }[]) {
  saltoSiNecesario(ctx, 10);
  const anchoColumna = ANCHO_UTIL / stats.length;
  stats.forEach((s, i) => {
    const x = MARGEN + i * anchoColumna;
    ctx.doc.setFont("helvetica", "bold");
    ctx.doc.setFontSize(14);
    ctx.doc.setTextColor(...COLOR_TEXTO);
    ctx.doc.text(String(s.valor), x, ctx.y);
    ctx.doc.setFont("helvetica", "normal");
    ctx.doc.setFontSize(8);
    ctx.doc.setTextColor(...COLOR_SUBTEXTO);
    ctx.doc.text(s.etiqueta.toUpperCase(), x, ctx.y + 4.5);
  });
  ctx.y += 12;
}

function dibujarBloqueModulos(ctx: Contexto, resumen: { totalVisitas: number; visitas: ResumenLote["visitas"]; totalEncuestas: number; encuestas: ResumenLote["encuestas"]; caes: ResumenLote["caes"]; totalLaboratorios: number; laboratorios: ResumenLote["laboratorios"] }) {
  dibujarStats(ctx, [
    { etiqueta: "Visitas", valor: resumen.totalVisitas },
    { etiqueta: "Encuestas", valor: resumen.totalEncuestas },
    { etiqueta: "Actas CAES", valor: resumen.caes.institucionesConConformacion + resumen.caes.totalReunion },
    { etiqueta: "Laboratorios", valor: resumen.totalLaboratorios },
  ]);

  saltoSiNecesario(ctx, 6);
  escribir(ctx, "Favorabilidad por esquema (visitas)", { tamano: 8.5, negrita: true, color: COLOR_SUBTEXTO });
  ctx.y += 5;
  if (resumen.visitas.length === 0) {
    textoVacio(ctx, "No hay visitas registradas.");
  } else {
    dibujarGrupoFavorabilidad(
      ctx,
      resumen.visitas.map((v) => ({ etiqueta: v.esquemaNombre, porcentaje: v.cumplimientoPromedio }))
    );
  }

  saltoSiNecesario(ctx, 6);
  escribir(ctx, "Encuestas por institución", { tamano: 8.5, negrita: true, color: COLOR_SUBTEXTO });
  ctx.y += 5;
  if (resumen.encuestas.length === 0) {
    textoVacio(ctx, "No hay encuestas registradas.");
  } else {
    dibujarGrupoBarras(
      ctx,
      resumen.encuestas.map((e) => ({
        etiqueta: e.institucion,
        valor: e.cantidad,
        sufijo: " encuesta(s)",
        nota: e.favorabilidad !== null ? `Favorabilidad: ${e.favorabilidad}%` : undefined,
      }))
    );
  }

  saltoSiNecesario(ctx, 6);
  escribir(ctx, "Acta de Conformación (cobertura)", { tamano: 8.5, negrita: true, color: COLOR_SUBTEXTO });
  ctx.y += 5;
  if (resumen.caes.totalInstituciones === 0) {
    textoVacio(ctx, "No hay instituciones registradas.");
  } else {
    dibujarGrupoFavorabilidad(ctx, [{ etiqueta: "Instituciones con acta", porcentaje: resumen.caes.porcentajeConformacion }]);
    escribir(ctx, `${resumen.caes.institucionesConConformacion} de ${resumen.caes.totalInstituciones} institución(es).`, {
      tamano: 8,
      italica: true,
      color: COLOR_SUBTEXTO,
    });
    ctx.y += 7;
  }

  saltoSiNecesario(ctx, 6);
  escribir(ctx, "Actas de Reunión", { tamano: 8.5, negrita: true, color: COLOR_SUBTEXTO });
  ctx.y += 5;
  escribir(ctx, `${resumen.caes.totalReunion} acta(s) registrada(s).`, { tamano: 9.5 });
  ctx.y += 7;

  saltoSiNecesario(ctx, 6);
  escribir(ctx, "Laboratorios por resultado", { tamano: 8.5, negrita: true, color: COLOR_SUBTEXTO });
  ctx.y += 5;
  if (resumen.laboratorios.length === 0) {
    textoVacio(ctx, "No hay muestras de laboratorio registradas.");
  } else {
    dibujarGrupoBarras(
      ctx,
      resumen.laboratorios.map((l) => ({
        etiqueta: ETIQUETAS_RESULTADO_LABORATORIO[l.resultado as ResultadoLaboratorio] ?? l.resultado,
        valor: l.cantidad,
        sufijo: " muestra(s)",
        color: l.resultado === "FAVORABLE" ? COLOR_FAVORABLE : COLOR_DESFAVORABLE,
      }))
    );
  }

  ctx.y += 2;
}

function dibujarDepartamento(ctx: Contexto, d: ResumenDepartamento) {
  subtitulo(ctx, d.nombre);
  dibujarBloqueModulos(ctx, d);
  ctx.y += 4;
}

function dibujarLote(ctx: Contexto, l: ResumenLote) {
  saltoSiNecesario(ctx, 10);
  escribir(ctx, l.lote.nombre, { tamano: 11.5, negrita: true });
  ctx.y += 4.5;
  escribir(ctx, l.lote.departamento, { tamano: 8.5, italica: true, color: COLOR_SUBTEXTO });
  ctx.y += 5.5;
  dibujarBloqueModulos(ctx, l);
  ctx.y += 4;
}

function embebirMembrete(ctx: Contexto, membreteUrl: string): boolean {
  try {
    const extension = path.extname(membreteUrl).toLowerCase();
    const formato = extension === ".jpg" || extension === ".jpeg" ? "JPEG" : extension === ".png" ? "PNG" : null;
    if (!formato) return false;

    const ruta = path.join(process.cwd(), "public", membreteUrl.replace(/^\//, ""));
    if (!fs.existsSync(ruta)) return false;
    const datos = fs.readFileSync(ruta);
    const dimensiones = sizeOf(datos);
    if (!dimensiones.width || !dimensiones.height) return false;

    const anchoMax = ANCHO_UTIL;
    const altoMax = 30;
    let ancho = anchoMax;
    let alto = (anchoMax * dimensiones.height) / dimensiones.width;
    if (alto > altoMax) {
      alto = altoMax;
      ancho = (altoMax * dimensiones.width) / dimensiones.height;
    }

    ctx.doc.addImage(datos, formato, MARGEN + (anchoMax - ancho) / 2, ctx.y, ancho, alto);
    ctx.y += alto + 6;
    return true;
  } catch {
    return false;
  }
}

export async function generarDashboardPdf(): Promise<Buffer> {
  const [resumen, datosEmpresa] = await Promise.all([
    obtenerResumenDashboard(),
    db.datosEmpresa.findUnique({ where: { id: "empresa" } }),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const ctx: Contexto = { doc, y: MARGEN };

  let huboMembrete = false;
  if (datosEmpresa?.membreteUrl) huboMembrete = embebirMembrete(ctx, datosEmpresa.membreteUrl);
  if (!huboMembrete && datosEmpresa?.razonSocial) {
    escribir(ctx, datosEmpresa.razonSocial, { tamano: 14, negrita: true, centrado: true });
    ctx.y += 8;
  }

  escribir(ctx, "Informe de Estado General", { tamano: 18, negrita: true, centrado: true });
  ctx.y += 6;
  escribir(ctx, `Generado el ${new Date().toLocaleDateString("es-CO", { dateStyle: "long" })}`, {
    tamano: 9.5,
    italica: true,
    color: COLOR_SUBTEXTO,
    centrado: true,
  });
  ctx.y += 10;

  encabezadoSeccion(ctx, "Panorama general por Departamento");
  dibujarStats(ctx, [
    { etiqueta: "PQRS recibidas", valor: resumen.pqrs.total },
    { etiqueta: "PQRS respondidas", valor: resumen.pqrs.respondidas },
    { etiqueta: "PQRS pendientes", valor: resumen.pqrs.pendientes },
  ]);
  escribir(ctx, "PQRS es un dato del sistema completo (no se filtra por departamento ni lote).", {
    tamano: 8,
    italica: true,
    color: COLOR_SUBTEXTO,
  });
  ctx.y += 8;

  if (resumen.departamentos.length === 0) {
    textoVacio(ctx, "Todavía no hay departamentos registrados en Registro.");
  } else {
    resumen.departamentos.forEach((d) => dibujarDepartamento(ctx, d));
  }

  encabezadoSeccion(ctx, "Información por Lote");
  if (resumen.lotes.length === 0) {
    textoVacio(ctx, "Todavía no hay lotes registrados en Registro.");
  } else {
    resumen.lotes.forEach((l) => dibujarLote(ctx, l));
  }

  return Buffer.from(doc.output("arraybuffer"));
}
