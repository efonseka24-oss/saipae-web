// Orden de módulos y preguntas en el panel e informes (botones subir/bajar).
// Es independiente del orden de la encuesta en la app móvil, que sigue siendo
// el campo `orden` de cada pregunta.
import { db } from "@/lib/db";

export type Direccion = "arriba" | "abajo";

// Valor alto para que una pregunta nueva (o recién movida de módulo) quede al
// final de su módulo hasta que se renumere.
export const ORDEN_PANEL_AL_FINAL = 1_000_000;

type PreguntaOrden = { id: string; moduloId: string; padreId: string | null; ordenPanel: number; orden: number };

function porOrdenPanel(a: PreguntaOrden, b: PreguntaOrden) {
  return a.ordenPanel - b.ordenPanel || a.orden - b.orden;
}

// Renumera ordenPanel (0, 1, 2, ...) de todas las preguntas del esquema,
// módulo por módulo: cada principal seguida de sus secundarias. Solo escribe
// las filas cuyo valor cambia.
export async function renumerarOrdenPanel(esquemaId: string) {
  const preguntas: PreguntaOrden[] = await db.pregunta.findMany({
    where: { modulo: { esquemaId } },
    select: { id: true, moduloId: true, padreId: true, ordenPanel: true, orden: true },
  });

  const cambios: { id: string; ordenPanel: number }[] = [];
  const porModulo = new Map<string, PreguntaOrden[]>();
  for (const p of preguntas) porModulo.set(p.moduloId, [...(porModulo.get(p.moduloId) ?? []), p]);

  for (const delModulo of porModulo.values()) {
    const ids = new Set(delModulo.map((p) => p.id));
    const hijas = new Map<string, PreguntaOrden[]>();
    for (const p of delModulo) {
      if (p.padreId && ids.has(p.padreId)) hijas.set(p.padreId, [...(hijas.get(p.padreId) ?? []), p]);
    }
    const raices = delModulo.filter((p) => !p.padreId || !ids.has(p.padreId)).sort(porOrdenPanel);

    let siguiente = 0;
    const visitar = (p: PreguntaOrden) => {
      if (p.ordenPanel !== siguiente) cambios.push({ id: p.id, ordenPanel: siguiente });
      siguiente++;
      (hijas.get(p.id) ?? []).sort(porOrdenPanel).forEach(visitar);
    };
    raices.forEach(visitar);
  }

  if (cambios.length > 0) {
    await db.$transaction(cambios.map((c) => db.pregunta.update({ where: { id: c.id }, data: { ordenPanel: c.ordenPanel } })));
  }
}

// Sube o baja una pregunta entre sus hermanas del mismo módulo: una principal
// entre las principales (arrastra sus secundarias) y una secundaria entre las
// secundarias de su misma principal. Devuelve false si ya estaba en el extremo.
export async function moverPregunta(id: string, direccion: Direccion): Promise<boolean> {
  const pregunta = await db.pregunta.findUnique({ where: { id }, include: { modulo: { select: { esquemaId: true } } } });
  if (!pregunta) return false;

  await renumerarOrdenPanel(pregunta.modulo.esquemaId);
  const hermanas: PreguntaOrden[] = await db.pregunta.findMany({
    where: { moduloId: pregunta.moduloId, padreId: pregunta.padreId },
    select: { id: true, moduloId: true, padreId: true, ordenPanel: true, orden: true },
  });
  hermanas.sort(porOrdenPanel);

  const indice = hermanas.findIndex((h) => h.id === id);
  const vecina = hermanas[direccion === "arriba" ? indice - 1 : indice + 1];
  if (indice < 0 || !vecina) return false;

  // Intercambia los valores y renumera: la renumeración vuelve a pegar las
  // secundarias debajo de su principal.
  const actual = hermanas[indice];
  await db.$transaction([
    db.pregunta.update({ where: { id: actual.id }, data: { ordenPanel: vecina.ordenPanel } }),
    db.pregunta.update({ where: { id: vecina.id }, data: { ordenPanel: actual.ordenPanel } }),
  ]);
  await renumerarOrdenPanel(pregunta.modulo.esquemaId);
  return true;
}

// Sube o baja un módulo dentro de su esquema y deja los órdenes en 0, 1, 2, ...
export async function moverModulo(id: string, direccion: Direccion): Promise<boolean> {
  const modulo = await db.moduloEsquema.findUnique({ where: { id } });
  if (!modulo) return false;

  const modulos = await db.moduloEsquema.findMany({
    where: { esquemaId: modulo.esquemaId },
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const indice = modulos.findIndex((m) => m.id === id);
  const destino = direccion === "arriba" ? indice - 1 : indice + 1;
  if (indice < 0 || destino < 0 || destino >= modulos.length) return false;

  [modulos[indice], modulos[destino]] = [modulos[destino], modulos[indice]];
  await db.$transaction(modulos.map((m, i) => db.moduloEsquema.update({ where: { id: m.id }, data: { orden: i } })));
  return true;
}
