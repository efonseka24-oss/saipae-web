// Panorama del Dashboard General: reutiliza el mismo agregador de
// "Generar Informes" (web/src/lib/informeConsolidado.ts) calculado para
// cada lote desde el inicio del proyecto hasta hoy, y luego lo agrupa hacia
// arriba por departamento. PQRS es global (no tiene lote) y se muestra una
// sola vez, aparte. Los nombres de campo (visitas/caes/laboratorios)
// coinciden a propósito con DatosInformeConsolidado para que ResumenLote y
// ResumenDepartamento compartan el mismo shape en web/src/components/dashboard/BloqueResumen.tsx.
import { db } from "@/lib/db";
import { generarDatosInforme, obtenerResumenPqrsGlobal, type DatosInformeConsolidado, type ResumenCaes, type ResumenPqrsGlobal } from "@/lib/informeConsolidado";

export type ResumenLote = DatosInformeConsolidado & { loteId: string };

export type ResumenDepartamento = {
  nombre: string;
  totalVisitas: number;
  visitas: { esquemaNombre: string; cantidad: number; cumplimientoPromedio: number | null }[];
  totalEncuestas: number;
  encuestas: { institucion: string; cantidad: number; favorabilidad: number | null }[];
  caes: ResumenCaes;
  totalLaboratorios: number;
  laboratorios: { resultado: string; cantidad: number }[];
};

export type ResumenDashboard = {
  departamentos: ResumenDepartamento[];
  lotes: ResumenLote[];
  pqrs: ResumenPqrsGlobal;
};

function sumarConteo<T extends { cantidad: number }>(lista: Map<string, T>, clave: string, item: T, combinar: (a: T, b: T) => T) {
  const actual = lista.get(clave);
  lista.set(clave, actual ? combinar(actual, item) : item);
}

function redondear(valor: number): number {
  return Math.round(valor * 10) / 10;
}

export async function obtenerResumenDashboard(): Promise<ResumenDashboard> {
  const rango = { desde: null, hasta: new Date() };
  const lotesDb = await db.lote.findMany({ select: { id: true } });

  const [resultadosPorLote, pqrs] = await Promise.all([
    Promise.all(lotesDb.map((l) => generarDatosInforme(l.id, rango))),
    obtenerResumenPqrsGlobal(rango),
  ]);

  const lotes: ResumenLote[] = resultadosPorLote
    .map((datos, i) => (datos ? { ...datos, loteId: lotesDb[i].id } : null))
    .filter((d): d is ResumenLote => d !== null);

  const porDepartamento = new Map<
    string,
    {
      nombre: string;
      totalVisitas: number;
      visitas: Map<string, { esquemaNombre: string; cantidad: number; sumaPonderada: number; conCumplimiento: number }>;
      encuestas: Map<string, { institucion: string; cantidad: number; sumaPonderada: number; conFavorabilidad: number }>;
      totalInstituciones: number;
      institucionesConConformacion: number;
      totalReunion: number;
      totalLaboratorios: number;
      laboratorios: Map<string, { resultado: string; cantidad: number }>;
    }
  >();

  for (const lote of lotes) {
    const actual = porDepartamento.get(lote.lote.departamento) ?? {
      nombre: lote.lote.departamento,
      totalVisitas: 0,
      visitas: new Map(),
      encuestas: new Map(),
      totalInstituciones: 0,
      institucionesConConformacion: 0,
      totalReunion: 0,
      totalLaboratorios: 0,
      laboratorios: new Map(),
    };

    actual.totalVisitas += lote.totalVisitas;
    for (const v of lote.visitas) {
      const previo = actual.visitas.get(v.esquemaNombre) ?? { esquemaNombre: v.esquemaNombre, cantidad: 0, sumaPonderada: 0, conCumplimiento: 0 };
      previo.cantidad += v.cantidad;
      if (v.cumplimientoPromedio !== null) {
        previo.sumaPonderada += v.cumplimientoPromedio * v.cantidad;
        previo.conCumplimiento += v.cantidad;
      }
      actual.visitas.set(v.esquemaNombre, previo);
    }

    for (const e of lote.encuestas) {
      const previo = actual.encuestas.get(e.institucion) ?? { institucion: e.institucion, cantidad: 0, sumaPonderada: 0, conFavorabilidad: 0 };
      previo.cantidad += e.cantidad;
      if (e.favorabilidad !== null) {
        previo.sumaPonderada += e.favorabilidad * e.cantidad;
        previo.conFavorabilidad += e.cantidad;
      }
      actual.encuestas.set(e.institucion, previo);
    }

    actual.totalInstituciones += lote.caes.totalInstituciones;
    actual.institucionesConConformacion += lote.caes.institucionesConConformacion;
    actual.totalReunion += lote.caes.totalReunion;

    actual.totalLaboratorios += lote.totalLaboratorios;
    for (const l of lote.laboratorios) {
      sumarConteo(actual.laboratorios, l.resultado, l, (a, b) => ({ resultado: a.resultado, cantidad: a.cantidad + b.cantidad }));
    }

    porDepartamento.set(lote.lote.departamento, actual);
  }

  const departamentos: ResumenDepartamento[] = [...porDepartamento.values()]
    .map((d) => ({
      nombre: d.nombre,
      totalVisitas: d.totalVisitas,
      visitas: [...d.visitas.values()]
        .map((v) => ({
          esquemaNombre: v.esquemaNombre,
          cantidad: v.cantidad,
          cumplimientoPromedio: v.conCumplimiento > 0 ? redondear(v.sumaPonderada / v.conCumplimiento) : null,
        }))
        .sort((a, b) => b.cantidad - a.cantidad),
      totalEncuestas: [...d.encuestas.values()].reduce((a, e) => a + e.cantidad, 0),
      encuestas: [...d.encuestas.values()]
        .map((e) => ({
          institucion: e.institucion,
          cantidad: e.cantidad,
          favorabilidad: e.conFavorabilidad > 0 ? redondear(e.sumaPonderada / e.conFavorabilidad) : null,
        }))
        .sort((a, b) => b.cantidad - a.cantidad),
      caes: {
        totalInstituciones: d.totalInstituciones,
        institucionesConConformacion: d.institucionesConConformacion,
        porcentajeConformacion: d.totalInstituciones > 0 ? redondear((d.institucionesConConformacion / d.totalInstituciones) * 100) : null,
        totalReunion: d.totalReunion,
      },
      totalLaboratorios: d.totalLaboratorios,
      laboratorios: [...d.laboratorios.values()],
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return { departamentos, lotes: lotes.sort((a, b) => a.lote.nombre.localeCompare(b.lote.nombre)), pqrs };
}
