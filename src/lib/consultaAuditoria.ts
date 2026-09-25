// Filtros de la pantalla de auditoría (los mismos para ver y para exportar).
import type { Prisma } from "@prisma/client";

export type FiltrosAuditoria = { usuario?: string; tipo?: string; desde?: string; hasta?: string; q?: string; resultado?: string };

type Parametros = Record<string, string | string[] | undefined>;

export function leerFiltrosAuditoria(parametros: Parametros | URLSearchParams): FiltrosAuditoria {
  const leer = (clave: string) => {
    const valor = parametros instanceof URLSearchParams ? parametros.get(clave) : parametros[clave];
    const texto = Array.isArray(valor) ? valor[0] : valor;
    return texto?.trim() || undefined;
  };
  return { usuario: leer("usuario"), tipo: leer("tipo"), desde: leer("desde"), hasta: leer("hasta"), q: leer("q"), resultado: leer("resultado") };
}

// Las fechas del filtro son días en hora de Colombia (UTC-5, sin horario de verano).
function inicioDelDia(dia: string): Date | undefined {
  const fecha = new Date(`${dia}T00:00:00-05:00`);
  return Number.isNaN(fecha.getTime()) ? undefined : fecha;
}

export function whereAuditoria(filtros: FiltrosAuditoria): Prisma.AuditoriaWhereInput {
  const desde = filtros.desde ? inicioDelDia(filtros.desde) : undefined;
  const hastaInicio = filtros.hasta ? inicioDelDia(filtros.hasta) : undefined;
  const hasta = hastaInicio ? new Date(hastaInicio.getTime() + 24 * 60 * 60 * 1000) : undefined;
  return {
    ...(filtros.usuario ? { usuario: filtros.usuario } : {}),
    ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
    ...(filtros.resultado === "error" ? { exito: false } : filtros.resultado === "ok" ? { exito: true } : {}),
    ...(desde || hasta ? { fecha: { ...(desde ? { gte: desde } : {}), ...(hasta ? { lt: hasta } : {}) } } : {}),
    ...(filtros.q
      ? { OR: [{ descripcion: { contains: filtros.q } }, { modulo: { contains: filtros.q } }, { nombre: { contains: filtros.q } }, { ip: { contains: filtros.q } }] }
      : {}),
  };
}

export function formatearFechaColombia(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(fecha);
}
