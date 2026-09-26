// Cronograma de visitas: estados y manejo de fechas. Las fechas son solo día
// (columna DATE): se guardan como medianoche UTC y se muestran en UTC, para
// que la zona horaria no corra el día.

export const ESTADOS_CRONOGRAMA = ["PROGRAMADA", "VENCIDA", "REALIZADA"] as const;
export type EstadoCronograma = (typeof ESTADOS_CRONOGRAMA)[number];

export const ETIQUETAS_ESTADO_CRONOGRAMA: Record<EstadoCronograma, string> = {
  PROGRAMADA: "Programada",
  VENCIDA: "Vencida",
  REALIZADA: "Realizada",
};

// "AAAA-MM-DD" de hoy en Colombia.
export function hoyColombia(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date()
  );
}

// "AAAA-MM-DD" de una fecha guardada (medianoche UTC).
export function diaDeFecha(fecha: string | Date): string {
  return new Date(fecha).toISOString().slice(0, 10);
}

export function estadoCronograma(
  fechaProgramada: string | Date,
  fechaRealizacion: string | Date | null | undefined,
  hoy = hoyColombia()
): EstadoCronograma {
  if (fechaRealizacion) return "REALIZADA";
  return diaDeFecha(fechaProgramada) < hoy ? "VENCIDA" : "PROGRAMADA";
}

export function formatearDia(fecha: string | Date | null | undefined): string {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-CO", { timeZone: "UTC", dateStyle: "medium" });
}

// Convierte "AAAA-MM-DD" (del formulario) a la fecha que se guarda; null si no es válida.
export function leerDia(valor: unknown): Date | null {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  return Number.isNaN(fecha.getTime()) || diaDeFecha(fecha) !== valor ? null : fecha;
}
