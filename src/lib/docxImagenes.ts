// Helpers compartidos para insertar imágenes (membrete, fotos de evidencia)
// en documentos .docx generados con la librería "docx".
import fs from "node:fs";
import path from "node:path";
import sizeOf from "image-size";
import { AlignmentType, ImageRun, Paragraph } from "docx";

type TipoImagenDocx = "jpg" | "png" | "gif" | "bmp";

const EXTENSION_A_TIPO: Record<string, TipoImagenDocx> = {
  ".jpg": "jpg",
  ".jpeg": "jpg",
  ".png": "png",
  ".gif": "gif",
  ".bmp": "bmp",
};

function rutaPublica(url: string): string {
  return path.join(process.cwd(), "public", url.replace(/^\//, ""));
}

function leerImagen(url: string): { data: Buffer; tipo: TipoImagenDocx } | null {
  const tipo = EXTENSION_A_TIPO[path.extname(url).toLowerCase()];
  if (!tipo) return null;
  const ruta = rutaPublica(url);
  if (!fs.existsSync(ruta)) return null;
  return { data: fs.readFileSync(ruta), tipo };
}

function calcularTamano(data: Buffer, anchoMax: number, altoMax: number): { width: number; height: number } {
  try {
    const dimensiones = sizeOf(data);
    if (!dimensiones.width || !dimensiones.height) return { width: anchoMax, height: Math.round(anchoMax * 0.75) };

    let width = anchoMax;
    let height = Math.round(anchoMax * (dimensiones.height / dimensiones.width));
    if (height > altoMax) {
      const factor = altoMax / height;
      width = Math.round(width * factor);
      height = altoMax;
    }
    return { width, height };
  } catch {
    return { width: anchoMax, height: Math.round(anchoMax * 0.75) };
  }
}

export function imagenComoParrafo(
  url: string,
  anchoMax: number,
  altoMax: number,
  alineacion: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER
): Paragraph | null {
  const imagen = leerImagen(url);
  if (!imagen) return null;
  const tamano = calcularTamano(imagen.data, anchoMax, altoMax);
  return new Paragraph({
    alignment: alineacion,
    children: [
      new ImageRun({
        type: imagen.tipo,
        data: imagen.data,
        transformation: tamano,
      }),
    ],
  });
}
