// Agrega, para un Lote y un rango de fechas dados, la actividad de los 4
// módulos que generan datos en el sistema: Visitas/inspecciones (con su %
// de cumplimiento), actas CAES, muestras de Laboratorio y peticiones PQRS.
// Usado por "Generar Informes" (mensual y general) — ver
// web/src/lib/generarInformeConsolidado.ts para el documento Word.
//
// PQRS no tiene ubicación (zode/lote) en su modelo de datos — una petición
// es del sistema completo, no de un lote puntual — así que su bloque en el
// informe es siempre global, filtrado solo por fecha, nunca por lote.
import { db } from "@/lib/db";
import { resolverCadenaVisita } from "@/lib/estadisticasEncuestas";
import { esPreguntaDeGrupoEspecial, respuestaNumericaAplicable, valorMaximoPregunta, type PreguntaPlantilla } from "@/lib/plantillaPreguntas";
import { esEsquemaDeEncuesta } from "@/lib/tabulacion";
import { ETIQUETAS_TIPO_PETICION_PQRS, type TipoPeticionPqrs } from "@/lib/pqrs";

const RESPUESTA_FAVORABLE = "SI";
function redondear(valor: number): number {
  return Math.round(valor * 10) / 10;
}

// Las "Encuesta*" (ver esEsquemaDeEncuesta) usan preguntas SI/NO
// cualitativas, no la escala 0/1/3 de las visitas de inspección — su
// favorabilidad es, literalmente, % de respuestas "SI" sobre el total de
// respuestas registradas (de todas las preguntas principales dadas).
async function favorabilidadPorSi(preguntaIds: string[], visitaIds: string[]): Promise<number | null> {
  if (preguntaIds.length === 0) return null;

  const respuestas = await db.respuesta.findMany({
    where: { visitaId: { in: visitaIds }, preguntaId: { in: preguntaIds }, valor: { not: null } },
    select: { valor: true },
  });
  if (respuestas.length === 0) return null;

  const totalSi = respuestas.filter((r) => r.valor?.trim().toUpperCase() === RESPUESTA_FAVORABLE).length;
  return redondear((totalSi / respuestas.length) * 100);
}

export type RangoFechas = { desde: Date | null; hasta: Date };

export type ConteoVisitasEsquema = { esquemaNombre: string; cantidad: number; cumplimientoPromedio: number | null };
// Las Encuestas ("Encuesta*", ver esEsquemaDeEncuesta) no son visitas de
// inspección — son un conteo aparte, agrupado por institución en vez de por
// esquema, con la misma favorabilidad de "SI" sobre el total de respuestas.
export type ConteoEncuestaInstitucion = { institucion: string; cantidad: number; favorabilidad: number | null };
export type ConteoLaboratorioResultado = { resultado: string; cantidad: number };
export type ConteoPqrsTipo = { tipo: string; cantidad: number };

// El acta de Conformación es un documento único por institución (funda el
// comité), así que su indicador es una cobertura acumulada — % de
// instituciones que YA la tienen, sin importar el periodo del informe — no
// un conteo por periodo. El acta de Reunión sí es un evento que se repite,
// así que ahí simplemente se cuenta cuántas hubo dentro del periodo.
export type ResumenCaes = {
  totalInstituciones: number;
  institucionesConConformacion: number;
  porcentajeConformacion: number | null;
  totalReunion: number;
};

export type DatosInformeConsolidado = {
  lote: { nombre: string; departamento: string };
  rango: RangoFechas;
  visitas: ConteoVisitasEsquema[];
  totalVisitas: number;
  encuestas: ConteoEncuestaInstitucion[];
  totalEncuestas: number;
  caes: ResumenCaes;
  laboratorios: ConteoLaboratorioResultado[];
  totalLaboratorios: number;
  pqrs: ConteoPqrsTipo[];
  totalPqrs: number;
  pqrsRespondidas: number;
  pqrsPendientes: number;
};

function dentroDelRango(fecha: Date, rango: RangoFechas): boolean {
  if (rango.desde && fecha < rango.desde) return false;
  return fecha <= rango.hasta;
}

const CADENA_ZODE = { lote: { include: { departamento: { select: { nombre: true } } } } } as const;

type VisitaResuelta = {
  id: string;
  fecha: Date;
  esquemaId: string;
  esquemaNombre: string;
  institucion: string | null;
  lote: string;
};

// Fetch único (reutilizado por visitas y encuestas) que resuelve la cadena
// Departamento→Lote→Zode→Municipio→Institución de cada Visita contra el
// catálogo de Registro.
async function obtenerVisitasResueltas(): Promise<VisitaResuelta[]> {
  const [visitas, instituciones, municipios, zodes, lotes] = await Promise.all([
    db.visita.findMany({
      select: { id: true, fecha: true, operador: true, municipio: true, institucion: true, zodes: true, lote: true, esquemaId: true, esquema: { select: { nombre: true } } },
    }),
    db.institucion.findMany({ select: { nombre: true, municipio: { include: { zode: { include: CADENA_ZODE } } } } }),
    db.municipio.findMany({ select: { nombre: true, zode: { include: CADENA_ZODE } } }),
    db.zode.findMany({ select: { nombre: true, ...CADENA_ZODE } }),
    db.lote.findMany({ select: { nombre: true, departamento: { select: { nombre: true } } } }),
  ]);

  return visitas.map((v) => ({
    id: v.id,
    fecha: v.fecha,
    esquemaId: v.esquemaId,
    esquemaNombre: v.esquema.nombre,
    institucion: v.institucion,
    lote: resolverCadenaVisita(v, instituciones, municipios, zodes, lotes).lote,
  }));
}

// Solo visitas de inspección (Bodega, RPS, RI, CCT, Bodega Administrativa,
// ...); las Encuestas se excluyen aquí — ver contarEncuestasPorInstitucion.
async function contarVisitasPorEsquema(visitasResueltas: VisitaResuelta[], loteNombre: string, rango: RangoFechas): Promise<ConteoVisitasEsquema[]> {
  const visitasDelLote = visitasResueltas.filter(
    (v) => !esEsquemaDeEncuesta(v.esquemaNombre) && dentroDelRango(v.fecha, rango) && v.lote === loteNombre
  );

  const grupoPorEsquema = new Map<string, { nombre: string; ids: string[] }>();
  for (const v of visitasDelLote) {
    const actual = grupoPorEsquema.get(v.esquemaId) ?? { nombre: v.esquemaNombre, ids: [] };
    actual.ids.push(v.id);
    grupoPorEsquema.set(v.esquemaId, actual);
  }

  const resultado: ConteoVisitasEsquema[] = [];
  for (const [esquemaId, info] of grupoPorEsquema) {
    const preguntas = (await db.pregunta.findMany({
      where: { modulo: { esquemaId }, clase: "PRINCIPAL", naturalezaOpciones: { not: "NO_APLICA" } },
      select: { id: true, texto: true, clase: true, tipo: true, opciones: true, naturalezaOpciones: true, padreId: true, orden: true, generarSubPreguntasAuto: true },
    })) as PreguntaPlantilla[];
    const preguntasCalificables = preguntas.filter((p) => !esPreguntaDeGrupoEspecial(p) && valorMaximoPregunta(p) !== null);

    let promedio: number | null = null;
    if (preguntasCalificables.length > 0) {
      const respuestas = await db.respuesta.findMany({
        where: { visitaId: { in: info.ids }, preguntaId: { in: preguntasCalificables.map((p) => p.id) } },
        select: { visitaId: true, preguntaId: true, valor: true },
      });
      const porVisita = new Map<string, string | null>();
      for (const r of respuestas) {
        porVisita.set(`${r.visitaId}:${r.preguntaId}`, r.valor);
      }

      const porcentajes: number[] = [];
      for (const visitaId of info.ids) {
        let suma = 0;
        let denominador = 0;
        for (const p of preguntasCalificables) {
          const max = valorMaximoPregunta(p);
          if (max === null) continue;
          const valor = porVisita.get(`${visitaId}:${p.id}`) ?? null;
          const aplicable = respuestaNumericaAplicable(valor);
          if (aplicable !== null) {
            denominador += max;
            suma += aplicable;
          }
        }
        if (denominador > 0) porcentajes.push((suma / denominador) * 100);
      }
      if (porcentajes.length > 0) {
        promedio = Math.round((porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length) * 10) / 10;
      }
    }

    resultado.push({ esquemaNombre: info.nombre, cantidad: info.ids.length, cumplimientoPromedio: promedio });
  }

  return resultado.sort((a, b) => b.cantidad - a.cantidad);
}

// Las Encuestas no cuentan como visitas: se agrupan por institución (no por
// esquema) y su favorabilidad es % de "SI" sobre el total de respuestas.
async function contarEncuestasPorInstitucion(visitasResueltas: VisitaResuelta[], loteNombre: string, rango: RangoFechas): Promise<ConteoEncuestaInstitucion[]> {
  const encuestasDelLote = visitasResueltas.filter(
    (v) => esEsquemaDeEncuesta(v.esquemaNombre) && dentroDelRango(v.fecha, rango) && v.lote === loteNombre
  );

  const grupoPorInstitucion = new Map<string, { ids: string[]; esquemaIds: Set<string> }>();
  for (const v of encuestasDelLote) {
    const nombreInstitucion = v.institucion?.trim() || "Sin institución";
    const actual = grupoPorInstitucion.get(nombreInstitucion) ?? { ids: [], esquemaIds: new Set<string>() };
    actual.ids.push(v.id);
    actual.esquemaIds.add(v.esquemaId);
    grupoPorInstitucion.set(nombreInstitucion, actual);
  }

  const resultado: ConteoEncuestaInstitucion[] = [];
  for (const [institucion, info] of grupoPorInstitucion) {
    const preguntas = await db.pregunta.findMany({
      where: { clase: "PRINCIPAL", naturalezaOpciones: { not: "NO_APLICA" }, modulo: { esquemaId: { in: [...info.esquemaIds] } } },
      select: { id: true },
    });
    const favorabilidad = await favorabilidadPorSi(preguntas.map((p) => p.id), info.ids);
    resultado.push({ institucion, cantidad: info.ids.length, favorabilidad });
  }

  return resultado.sort((a, b) => b.cantidad - a.cantidad);
}

async function contarActasCaes(loteId: string, rango: RangoFechas): Promise<ResumenCaes> {
  const instituciones = await db.institucion.findMany({ where: { municipio: { zode: { loteId } } }, select: { id: true } });
  const totalInstituciones = instituciones.length;

  const actas = await db.actaCaes.findMany({
    where: { institucion: { municipio: { zode: { loteId } } } },
    select: { tipo: true, fecha: true, institucionId: true },
  });

  // Conformación: cobertura acumulada a hoy (no se filtra por periodo).
  const institucionesConConformacion = new Set(actas.filter((a) => a.tipo === "CONFORMACION").map((a) => a.institucionId)).size;

  // Reunión: sí es un evento recurrente, se cuenta dentro del periodo pedido.
  const totalReunion = actas.filter((a) => a.tipo === "REUNION" && dentroDelRango(a.fecha, rango)).length;

  return {
    totalInstituciones,
    institucionesConConformacion,
    porcentajeConformacion: totalInstituciones > 0 ? redondear((institucionesConConformacion / totalInstituciones) * 100) : null,
    totalReunion,
  };
}

async function contarLaboratorios(loteId: string, rango: RangoFechas): Promise<ConteoLaboratorioResultado[]> {
  const zodesDelLote = await db.zode.findMany({ where: { loteId }, select: { id: true } });
  const laboratorios = await db.laboratorio.findMany({
    where: { zodeId: { in: zodesDelLote.map((z) => z.id) } },
    select: { resultado: true, fechaTomaMuestra: true },
  });
  const delRango = laboratorios.filter((l) => dentroDelRango(l.fechaTomaMuestra, rango));

  const conteos = new Map<string, number>();
  for (const l of delRango) conteos.set(l.resultado, (conteos.get(l.resultado) ?? 0) + 1);
  return [...conteos.entries()].map(([resultado, cantidad]) => ({ resultado, cantidad }));
}

export type ResumenPqrsGlobal = { porTipo: ConteoPqrsTipo[]; total: number; respondidas: number; pendientes: number };

// PQRS no tiene lote: es un dato del sistema completo. Exportada aparte para
// que el Dashboard la muestre una sola vez (no por cada lote/departamento).
export async function obtenerResumenPqrsGlobal(rango: RangoFechas): Promise<ResumenPqrsGlobal> {
  const peticiones = await db.peticionPqrs.findMany({
    select: { tipoPeticion: true, fechaRadicado: true, respuesta: { select: { id: true } } },
  });
  const delRango = peticiones.filter((p) => dentroDelRango(p.fechaRadicado, rango));

  const conteos = new Map<string, number>();
  let respondidas = 0;
  for (const p of delRango) {
    conteos.set(p.tipoPeticion, (conteos.get(p.tipoPeticion) ?? 0) + 1);
    if (p.respuesta) respondidas += 1;
  }
  const porTipo = (Object.keys(ETIQUETAS_TIPO_PETICION_PQRS) as TipoPeticionPqrs[])
    .map((tipo) => ({ tipo, cantidad: conteos.get(tipo) ?? 0 }))
    .filter((c) => c.cantidad > 0);

  return { porTipo, total: delRango.length, respondidas, pendientes: delRango.length - respondidas };
}

export async function generarDatosInforme(loteId: string, rango: RangoFechas): Promise<DatosInformeConsolidado | null> {
  const lote = await db.lote.findUnique({ where: { id: loteId }, include: { departamento: { select: { nombre: true } } } });
  if (!lote) return null;

  const visitasResueltas = await obtenerVisitasResueltas();

  const [visitas, encuestas, caes, laboratorios, pqrs] = await Promise.all([
    contarVisitasPorEsquema(visitasResueltas, lote.nombre, rango),
    contarEncuestasPorInstitucion(visitasResueltas, lote.nombre, rango),
    contarActasCaes(loteId, rango),
    contarLaboratorios(loteId, rango),
    obtenerResumenPqrsGlobal(rango),
  ]);

  return {
    lote: { nombre: lote.nombre, departamento: lote.departamento.nombre },
    rango,
    visitas,
    totalVisitas: visitas.reduce((a, v) => a + v.cantidad, 0),
    encuestas,
    totalEncuestas: encuestas.reduce((a, e) => a + e.cantidad, 0),
    caes,
    laboratorios,
    totalLaboratorios: laboratorios.reduce((a, l) => a + l.cantidad, 0),
    pqrs: pqrs.porTipo,
    totalPqrs: pqrs.total,
    pqrsRespondidas: pqrs.respondidas,
    pqrsPendientes: pqrs.pendientes,
  };
}
