// Las preguntas secundarias no tienen orden propio en la encuesta: van justo
// después de su pregunta principal. Su campo `orden` se calcula como el de la
// principal + 1, + 2, ... (conservando el orden relativo que ya tenían entre
// ellas), así el orden global sigue sirviendo para los saltos y la cascada de
// Registro del formulario web, y el panel solo pide el orden de las principales.
import { db } from "@/lib/db";

// Orden provisional de una secundaria nueva (o que cambia de principal): la deja
// de última entre sus hermanas hasta que ordenarSecundarias la renumera.
export const ORDEN_SECUNDARIA_AL_FINAL = 2_000_000_000;

export async function ordenarSecundarias(esquemaId: string): Promise<void> {
  const preguntas = await db.pregunta.findMany({
    where: { modulo: { esquemaId } },
    select: { id: true, padreId: true, orden: true, createdAt: true },
  });
  const porId = new Map(preguntas.map((p) => [p.id, p]));
  const hijasPorPadre = new Map<string, typeof preguntas>();
  for (const p of preguntas) {
    if (!p.padreId || !porId.has(p.padreId)) continue;
    hijasPorPadre.set(p.padreId, [...(hijasPorPadre.get(p.padreId) ?? []), p]);
  }

  const cambios: { id: string; orden: number }[] = [];
  for (const [padreId, hijas] of hijasPorPadre) {
    const ordenPadre = porId.get(padreId)!.orden;
    hijas
      .sort((a, b) => a.orden - b.orden || a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
      .forEach((hija, indice) => {
        const orden = ordenPadre + indice + 1;
        if (hija.orden !== orden) cambios.push({ id: hija.id, orden });
      });
  }
  if (cambios.length > 0) {
    await db.$transaction(cambios.map((c) => db.pregunta.update({ where: { id: c.id }, data: { orden: c.orden } })));
  }
}
