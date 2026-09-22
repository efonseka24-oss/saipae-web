import PizZip from "pizzip";

// Extrae los marcadores {{TOKEN}} que aparecen en un .docx, recorriendo todo
// el texto de word/document.xml (uniendo el texto de cada párrafo antes de
// buscar, igual que hace el motor de fusión, para no perder marcadores
// partidos entre varios <w:t>).
export function extraerMarcadores(bufferDocx: Buffer): string[] {
  const zip = new PizZip(bufferDocx);
  const archivo = zip.file("word/document.xml");
  if (!archivo) return [];

  const xml = archivo.asText();
  // Quita las etiquetas XML para unir el texto real (incluye el de <w:t> que
  // haya quedado partido en varios "runs" consecutivos).
  const textoPlano = xml.replace(/<[^>]+>/g, "");
  const coincidencias = textoPlano.match(/\{\{[^{}]*\}\}/g) ?? [];

  const vistos = new Set<string>();
  const unicos: string[] = [];
  for (const token of coincidencias) {
    const limpio = token.replace(/[{}]/g, "").trim();
    if (limpio && !vistos.has(limpio)) {
      vistos.add(limpio);
      unicos.push(limpio);
    }
  }
  return unicos;
}
