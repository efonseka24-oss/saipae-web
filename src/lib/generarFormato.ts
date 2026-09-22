import fs from "node:fs";
import path from "node:path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";
import sizeOf from "image-size";
import type { FilaVisita } from "@/lib/buscarVisitas";
import { mapaParaCategoria, nombrePlantilla, type CategoriaFormato } from "@/lib/mapasPlantillas";

const ANCHO_IMAGEN_PX = 227; // ~6cm a 96dpi
const ALTO_MAXIMO_IMAGEN_PX = 453; // ~12cm a 96dpi

// PNG transparente de 1x1: se usa cuando un token de imagen está mapeado pero
// esa foto en particular no vino en la respuesta (evita que el render falle).
const IMAGEN_VACIA_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

function esTokenDeImagen(token: string): boolean {
  return token.startsWith("FOTO") || token.startsWith("FIRMA");
}

// Marca en el XML crudo del docx los tokens de imagen ({{FOTO8}}, {{FIRMAX}}, ...)
// como tags de módulo para docxtemplater-image-module-free, que reconoce
// {{%TOKEN}} (un '%' justo después del delimitador de apertura).
function marcarTokensDeImagen(xml: string, tokensImagen: string[]): string {
  let resultado = xml;
  for (const token of tokensImagen) {
    const literal = `{{${token}}}`;
    resultado = resultado.split(literal).join(`{{%${token}}}`);
  }
  return resultado;
}

function calcularTamano(bytes: Buffer): [number, number] {
  try {
    const dimensiones = sizeOf(bytes);
    if (!dimensiones.width || !dimensiones.height) return [ANCHO_IMAGEN_PX, Math.round(ANCHO_IMAGEN_PX * 0.75)];

    let ancho = ANCHO_IMAGEN_PX;
    let alto = Math.round(ANCHO_IMAGEN_PX * (dimensiones.height / dimensiones.width));

    if (alto > ALTO_MAXIMO_IMAGEN_PX) {
      const factor = ALTO_MAXIMO_IMAGEN_PX / alto;
      ancho = Math.round(ancho * factor);
      alto = ALTO_MAXIMO_IMAGEN_PX;
    }

    return [ancho, alto];
  } catch {
    return [ANCHO_IMAGEN_PX, Math.round(ANCHO_IMAGEN_PX * 0.75)];
  }
}

// Genera el .docx ya rellenado para una fila de visita. Devuelve null si la
// categoría todavía no tiene mapa de columnas (ej. Bodega Administrativa).
export function generarFormatoDocx(categoria: CategoriaFormato, fila: FilaVisita): Buffer | null {
  const mapa = mapaParaCategoria(categoria);
  if (!mapa) return null;

  const rutaPlantilla = path.join(process.cwd(), "templates", nombrePlantilla(categoria));
  const contenido = fs.readFileSync(rutaPlantilla);
  const zip = new PizZip(contenido);

  const tokensImagen = Object.keys(mapa).filter(esTokenDeImagen);
  const rutaDocumento = "word/document.xml";
  const xmlOriginal = zip.file(rutaDocumento)?.asText() ?? "";
  zip.file(rutaDocumento, marcarTokensDeImagen(xmlOriginal, tokensImagen));

  const imageModule = new ImageModule({
    centered: true,
    getImage(tagValue: string) {
      return Buffer.from(tagValue || IMAGEN_VACIA_BASE64, "base64");
    },
    getSize(img) {
      return calcularTamano(Buffer.isBuffer(img) ? img : Buffer.from(img as ArrayBuffer));
    },
  });

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{{", end: "}}" },
    modules: [imageModule],
    nullGetter: () => "",
  });

  const datos: Record<string, string> = {};
  for (const [token, indice] of Object.entries(mapa)) {
    if (esTokenDeImagen(token)) {
      const foto = fila.fotos[String(indice)];
      datos[token] = foto?.base64 ?? "";
    } else {
      datos[token] = fila.valores[indice] ?? "";
    }
  }

  doc.render(datos);

  return doc.getZip().generate({ type: "nodebuffer" }) as Buffer;
}
