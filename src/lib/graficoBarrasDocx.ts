// Gráfica de barras horizontal dibujada con tablas de "docx": cada barra es
// una celda coloreada cuyo ancho (en % de la fila) es proporcional a su
// valor frente al máximo del grupo. No depende de ninguna librería de
// gráficos ni de renderizar imágenes — son celdas de tabla reales, así que
// se ve bien tanto en Word como al imprimir/convertir a PDF.
import { BorderStyle, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { colorHexPorcentaje } from "@/lib/colorFavorabilidad";

export type BarraDato = { etiqueta: string; valor: number; sufijo?: string; color?: string; notaSecundaria?: string };
export type DatoFavorabilidad = { etiqueta: string; porcentaje: number | null };

const SIN_BORDE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const BORDES_TABLA = { top: SIN_BORDE, bottom: SIN_BORDE, left: SIN_BORDE, right: SIN_BORDE, insideHorizontal: SIN_BORDE, insideVertical: SIN_BORDE };

const COLOR_RESTO = "E2E8F0";
export const PALETA_CATEGORICA = ["1D4ED8", "0EA5E9", "16A34A", "D97706", "DC2626", "7C3AED", "0891B2", "64748B"];

function celdaVacia(ancho: number, color: string): TableCell {
  return new TableCell({
    width: { size: ancho, type: WidthType.PERCENTAGE },
    shading: { fill: color },
    margins: { top: 40, bottom: 40, left: 0, right: 0 },
    children: [new Paragraph({ children: [] })],
  });
}

function celdaBarra(porcentaje: number, color: string): TableCell {
  const pct = Math.max(0, Math.min(100, Math.round(porcentaje)));
  const celdas = [celdaVacia(Math.max(pct, 1), color)];
  if (pct < 100) celdas.push(celdaVacia(100 - pct, COLOR_RESTO));

  return new TableCell({
    width: { size: 100, type: WidthType.PERCENTAGE },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    children: [new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDES_TABLA, rows: [new TableRow({ children: celdas })] })],
  });
}

// Una fila por dato: etiqueta + valor a la izquierda (30% del ancho), barra
// coloreada proporcional al máximo del grupo a la derecha (70%).
export function graficoBarras(datos: BarraDato[], colorPorDefecto = PALETA_CATEGORICA[0]): Table {
  const max = Math.max(1, ...datos.map((d) => d.valor));

  const filas = datos.map(
    (d, i) =>
      new TableRow({
        children: [
          new TableCell({
            width: { size: 32, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 0, right: 100 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: d.etiqueta, size: 18 }),
                  new TextRun({ text: `  ${d.valor}${d.sufijo ?? ""}`, size: 18, bold: true }),
                ],
              }),
              ...(d.notaSecundaria
                ? [new Paragraph({ children: [new TextRun({ text: d.notaSecundaria, size: 15, italics: true, color: "64748B" })] })]
                : []),
            ],
          }),
          celdaBarra((d.valor / max) * 100, d.color ?? PALETA_CATEGORICA[i % PALETA_CATEGORICA.length] ?? colorPorDefecto),
        ],
      })
  );

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDES_TABLA, rows: filas });
}

// Barra de favorabilidad/cumplimiento: cada fila se escala siempre contra
// 100% (no contra el máximo del grupo) y se colorea por umbral
// (verde/azul/naranja/rojo, ver web/src/lib/colorFavorabilidad.ts) en vez de
// con la paleta cíclica, para que el color siempre indique qué tan buena es
// esa cifra puntual.
export function graficoFavorabilidad(datos: DatoFavorabilidad[]): Table {
  const filas = datos.map((d) => {
    const etiquetaCelda = new TableCell({
      width: { size: 32, type: WidthType.PERCENTAGE },
      margins: { top: 40, bottom: 40, left: 0, right: 100 },
      children: [new Paragraph({ children: [new TextRun({ text: d.etiqueta, size: 18 })] })],
    });

    if (d.porcentaje === null) {
      return new TableRow({
        children: [
          etiquetaCelda,
          new TableCell({
            width: { size: 68, type: WidthType.PERCENTAGE },
            margins: { top: 40, bottom: 40, left: 0, right: 0 },
            children: [new Paragraph({ children: [new TextRun({ text: "Sin datos de cumplimiento", size: 16, italics: true, color: "64748B" })] })],
          }),
        ],
      });
    }

    return new TableRow({
      children: [
        new TableCell({
          width: { size: 32, type: WidthType.PERCENTAGE },
          margins: { top: 40, bottom: 40, left: 0, right: 100 },
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: d.etiqueta, size: 18 }),
                new TextRun({ text: `  ${d.porcentaje}%`, size: 18, bold: true }),
              ],
            }),
          ],
        }),
        celdaBarra(d.porcentaje, colorHexPorcentaje(d.porcentaje)),
      ],
    });
  });

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: BORDES_TABLA, rows: filas });
}
