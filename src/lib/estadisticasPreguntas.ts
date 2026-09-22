import { db } from "@/lib/db";
import { esEsquemaDeEncuesta } from "@/lib/tabulacion";
import { resolverCadenaVisita, type AgrupacionEstadistica, type CadenaResuelta } from "@/lib/estadisticasEncuestas";

const CADENA_ZODE = { lote: { include: { departamento: { select: { nombre: true } } } } } as const;

// Trae todas las visitas de esquemas "Encuesta..." y resuelve su cadena
// Departamento→Lote→Zode→Municipio→Institución contra el catálogo de
// Registro. Se usa tanto para agrupar por nivel (id de cada visita + cadena)
// como para filtrar cuáles entran en un grupo específico.
export async function resolverCadenasDeEncuestas(): Promise<{ id: string; estado: string; cadena: CadenaResuelta }[]> {
  const [todasLasVisitas, instituciones, municipios, zodes, lotes] = await Promise.all([
    db.visita.findMany({ select: { id: true, estado: true, operador: true, municipio: true, institucion: true, zodes: true, lote: true, esquema: { select: { nombre: true } } } }),
    db.institucion.findMany({ select: { nombre: true, municipio: { include: { zode: { include: CADENA_ZODE } } } } }),
    db.municipio.findMany({ select: { nombre: true, zode: { include: CADENA_ZODE } } }),
    db.zode.findMany({ select: { nombre: true, ...CADENA_ZODE } }),
    db.lote.findMany({ select: { nombre: true, departamento: { select: { nombre: true } } } }),
  ]);

  return todasLasVisitas
    .filter((v) => esEsquemaDeEncuesta(v.esquema.nombre))
    .map((v) => ({
      id: v.id,
      estado: v.estado,
      cadena: resolverCadenaVisita(v, instituciones, municipios, zodes, lotes),
    }));
}

// Ids de las visitas cuyo grupo (a un nivel dado) coincide con `valor`.
export async function idsVisitasDelGrupo(agrupacion: AgrupacionEstadistica, valor: string): Promise<string[]> {
  const filas = await resolverCadenasDeEncuestas();
  return filas.filter((f) => f.cadena[agrupacion] === valor).map((f) => f.id);
}

export type StatsOpcion = { opcion: string; cantidad: number; porcentaje: number };

export type StatsPregunta = {
  preguntaId: string;
  texto: string;
  tipo: string;
  totalRespuestas: number;
  opciones: StatsOpcion[]; // solo se llena para SELECCION_MULTIPLE
  favorabilidad: number | null; // % de respuestas "SI", null si la pregunta no tiene esa opción
};

export type StatsEsquema = {
  esquemaId: string;
  esquemaNombre: string;
  totalEncuestas: number;
  favorabilidadTotal: number | null; // promedio de favorabilidad entre las preguntas que la tienen
  preguntas: StatsPregunta[];
};

const RESPUESTA_FAVORABLE = "SI";

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10;
}

// Calcula, para un conjunto de visitas (ya filtradas por el grupo que se
// quiera analizar), las estadísticas por esquema y por pregunta: porcentaje
// de cada respuesta (solo aplica a SELECCION_MULTIPLE) y favorabilidad
// (% de respuestas "SI"). Agrupa por esquema porque distintas "Encuesta X"
// pueden tener preguntas distintas.
export async function calcularEstadisticasVisitas(visitaIds: string[]): Promise<StatsEsquema[]> {
  if (visitaIds.length === 0) return [];

  const visitas = await db.visita.findMany({
    where: { id: { in: visitaIds } },
    select: { id: true, esquemaId: true, esquema: { select: { nombre: true } } },
  });

  const grupoPorEsquema = new Map<string, { nombre: string; visitaIds: string[] }>();
  for (const v of visitas) {
    const actual = grupoPorEsquema.get(v.esquemaId) ?? { nombre: v.esquema.nombre, visitaIds: [] };
    actual.visitaIds.push(v.id);
    grupoPorEsquema.set(v.esquemaId, actual);
  }

  const resultado: StatsEsquema[] = [];

  for (const [esquemaId, info] of grupoPorEsquema) {
    const preguntas = await db.pregunta.findMany({
      where: { modulo: { esquemaId } },
      orderBy: [{ modulo: { orden: "asc" } }, { orden: "asc" }],
      select: { id: true, texto: true, tipo: true, opciones: true },
    });

    const respuestas = await db.respuesta.findMany({
      where: { visitaId: { in: info.visitaIds }, preguntaId: { in: preguntas.map((p) => p.id) } },
      select: { preguntaId: true, valor: true },
    });

    const respuestasPorPregunta = new Map<string, string[]>();
    for (const r of respuestas) {
      if (!r.valor) continue;
      const lista = respuestasPorPregunta.get(r.preguntaId) ?? [];
      lista.push(r.valor);
      respuestasPorPregunta.set(r.preguntaId, lista);
    }

    const statsPreguntas: StatsPregunta[] = [];
    let sumaFavorabilidad = 0;
    let cuentaFavorabilidad = 0;

    for (const p of preguntas) {
      const valores = respuestasPorPregunta.get(p.id) ?? [];
      const total = valores.length;

      let opcionesDeclaradas: string[] = [];
      try {
        const parseado = JSON.parse(p.opciones);
        if (Array.isArray(parseado)) opcionesDeclaradas = parseado;
      } catch {
        opcionesDeclaradas = [];
      }

      let opciones: StatsOpcion[] = [];
      let favorabilidad: number | null = null;

      if (p.tipo === "SELECCION_MULTIPLE" && opcionesDeclaradas.length > 0) {
        opciones = opcionesDeclaradas.map((op) => {
          const cantidad = valores.filter((v) => v === op).length;
          return { opcion: op, cantidad, porcentaje: total > 0 ? redondear((cantidad / total) * 100) : 0 };
        });

        const tieneSi = opcionesDeclaradas.some((op) => op.trim().toUpperCase() === RESPUESTA_FAVORABLE);
        if (tieneSi && total > 0) {
          const cantidadSi = valores.filter((v) => v.trim().toUpperCase() === RESPUESTA_FAVORABLE).length;
          favorabilidad = redondear((cantidadSi / total) * 100);
          sumaFavorabilidad += favorabilidad;
          cuentaFavorabilidad += 1;
        }
      }

      statsPreguntas.push({
        preguntaId: p.id,
        texto: p.texto,
        tipo: p.tipo,
        totalRespuestas: total,
        opciones,
        favorabilidad,
      });
    }

    resultado.push({
      esquemaId,
      esquemaNombre: info.nombre,
      totalEncuestas: info.visitaIds.length,
      favorabilidadTotal: cuentaFavorabilidad > 0 ? redondear(sumaFavorabilidad / cuentaFavorabilidad) : null,
      preguntas: statsPreguntas,
    });
  }

  return resultado;
}
