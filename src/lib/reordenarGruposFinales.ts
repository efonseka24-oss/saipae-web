import { db } from "@/lib/db";

const ESPACIADO_ORDEN = 20;
const GRUPOS_AL_FINAL = ["MATERIA_PRIMA", "ORGANOLEPTICO"] as const;

type PreguntaPlana = {
  id: string;
  orden: number;
  clase: string;
  padreId: string | null;
  generarSubPreguntasAuto: string;
  moduloId: string;
  createdAt: Date;
};

// Garantiza que las preguntas de "materia prima" y "organoléptico" (en ese
// orden) queden siempre al final del resto de la encuesta: las reubica en el
// último módulo del esquema (por orden) y las renumera después de todo lo
// demás que ya esté allí, sin tocar el resto de módulos/preguntas.
export async function reordenarGruposFinales(esquemaId: string): Promise<void> {
  const modulos = await db.moduloEsquema.findMany({
    where: { esquemaId },
    orderBy: { orden: "desc" },
    select: { id: true },
  });
  if (modulos.length === 0) return;
  const moduloDestino = modulos[0].id;

  const preguntas: PreguntaPlana[] = await db.pregunta.findMany({
    where: { modulo: { esquemaId } },
    orderBy: { orden: "asc" },
    select: {
      id: true,
      orden: true,
      clase: true,
      padreId: true,
      generarSubPreguntasAuto: true,
      moduloId: true,
      createdAt: true,
    },
  });

  const porId = new Map(preguntas.map((p) => [p.id, p]));

  function grupoDe(p: PreguntaPlana): "MATERIA_PRIMA" | "ORGANOLEPTICO" | null {
    let actual = p;
    while (actual.padreId) {
      const padre = porId.get(actual.padreId);
      if (!padre) break;
      actual = padre;
    }
    return (GRUPOS_AL_FINAL as readonly string[]).includes(actual.generarSubPreguntasAuto)
      ? (actual.generarSubPreguntasAuto as "MATERIA_PRIMA" | "ORGANOLEPTICO")
      : null;
  }

  const materiaPrima = preguntas.filter((p) => grupoDe(p) === "MATERIA_PRIMA");
  const organoleptico = preguntas.filter((p) => grupoDe(p) === "ORGANOLEPTICO");
  if (materiaPrima.length === 0 && organoleptico.length === 0) return;

  const regularesEnDestino = preguntas
    .filter((p) => p.moduloId === moduloDestino && grupoDe(p) === null)
    .sort((a, b) => a.orden - b.orden);
  const maxOrdenRegularDestino =
    regularesEnDestino.length > 0 ? regularesEnDestino[regularesEnDestino.length - 1].orden : 0;

  let siguiente = maxOrdenRegularDestino + ESPACIADO_ORDEN;
  const actualizaciones: { id: string; orden: number }[] = [];

  for (const grupo of [materiaPrima, organoleptico]) {
    // Se ordena por fecha de creación (no por `orden`, que puede venir con
    // cualquier valor arbitrario desde el formulario): así, las preguntas ya
    // existentes del grupo mantienen su secuencia histórica y las nuevas
    // siempre quedan al final de su propio grupo.
    const principales = grupo
      .filter((p) => p.clase === "PRINCIPAL")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    for (const principal of principales) {
      const ordenPrincipal = siguiente;
      actualizaciones.push({ id: principal.id, orden: ordenPrincipal });

      const hijos = grupo.filter((p) => p.padreId === principal.id).sort((a, b) => a.orden - b.orden);
      hijos.forEach((hijo, indice) => {
        actualizaciones.push({ id: hijo.id, orden: ordenPrincipal + indice + 1 });
      });

      siguiente += ESPACIADO_ORDEN;
    }
  }

  await db.$transaction(
    actualizaciones.map((a) => db.pregunta.update({ where: { id: a.id }, data: { moduloId: moduloDestino, orden: a.orden } }))
  );
}
