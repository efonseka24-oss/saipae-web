// Lector mínimo de Excel (.xlsx): devuelve las filas de la primera hoja como
// objetos { encabezado: valor }, igual que csv-parse con `columns: true`.
//
// Se escribe a mano (con fflate para descomprimir) en vez de usar el paquete
// "xlsx" de SheetJS, que tiene vulnerabilidades altas sin parche (ver
// cargaMasivaRegistro.ts). Solo lee texto y números de las celdas; ignora
// formatos, fórmulas (toma el valor calculado guardado) y las demás hojas.
import { unzipSync, strFromU8 } from "fflate";

function decodificarXml(texto: string): string {
  return texto
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

// Texto de un <si> o <is>: puede venir partido en varios <t> (texto con formato).
function textoRico(xml: string): string {
  return [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decodificarXml(m[1])).join("");
}

// "AB12" -> 27 (índice de columna base 0).
function indiceColumna(referencia: string): number {
  const letras = referencia.replace(/\d+/g, "");
  let indice = 0;
  for (const letra of letras) indice = indice * 26 + (letra.charCodeAt(0) - 64);
  return indice - 1;
}

// Ruta (dentro del zip) de la primera hoja del libro.
function rutaPrimeraHoja(archivos: Record<string, Uint8Array>): string | null {
  const libro = archivos["xl/workbook.xml"];
  const relaciones = archivos["xl/_rels/workbook.xml.rels"];
  if (libro && relaciones) {
    const primera = strFromU8(libro).match(/<sheet\b[^>]*\br:id="([^"]+)"/);
    if (primera) {
      const relacion = [...strFromU8(relaciones).matchAll(/<Relationship\b[^>]*>/g)]
        .map((m) => m[0])
        .find((r) => r.includes(`Id="${primera[1]}"`));
      const destino = relacion?.match(/Target="([^"]+)"/)?.[1];
      if (destino) {
        const ruta = destino.startsWith("/") ? destino.slice(1) : `xl/${destino}`;
        if (archivos[ruta]) return ruta;
      }
    }
  }
  return Object.keys(archivos).find((r) => /^xl\/worksheets\/sheet\d+\.xml$/.test(r)) ?? null;
}

export function leerFilasXlsx(bytes: Uint8Array): { error: string } | { filas: Record<string, string>[] } {
  let archivos: Record<string, Uint8Array>;
  try {
    archivos = unzipSync(bytes);
  } catch {
    return { error: "No se pudo leer el archivo. Debe ser un Excel (.xlsx) válido." };
  }

  const ruta = rutaPrimeraHoja(archivos);
  if (!ruta) return { error: "El archivo de Excel no tiene hojas." };

  const compartidos = archivos["xl/sharedStrings.xml"]
    ? [...strFromU8(archivos["xl/sharedStrings.xml"]).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textoRico(m[1]))
    : [];

  const tabla: string[][] = [];
  for (const fila of strFromU8(archivos[ruta]).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const valores: string[] = [];
    for (const celda of fila[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const atributos = celda[1];
      const contenido = celda[2] ?? "";
      const referencia = atributos.match(/\br="([A-Z]+\d+)"/)?.[1];
      const tipo = atributos.match(/\bt="([^"]+)"/)?.[1];
      const valorCrudo = contenido.match(/<v>([\s\S]*?)<\/v>/)?.[1];

      let valor = "";
      if (tipo === "s" && valorCrudo !== undefined) valor = compartidos[Number(valorCrudo)] ?? "";
      else if (tipo === "inlineStr") valor = textoRico(contenido);
      else if (valorCrudo !== undefined) valor = decodificarXml(valorCrudo);

      const indice = referencia ? indiceColumna(referencia) : valores.length;
      valores[indice] = valor.trim();
    }
    tabla.push(Array.from(valores, (v) => v ?? ""));
  }

  const conDatos = tabla.filter((f) => f.some((v) => v !== ""));
  if (conDatos.length === 0) return { filas: [] };

  const [encabezados, ...resto] = conDatos;
  const filas = resto.map((f) => Object.fromEntries(encabezados.map((e, i) => [e, f[i] ?? ""]).filter(([e]) => e !== "")));
  return { filas };
}
