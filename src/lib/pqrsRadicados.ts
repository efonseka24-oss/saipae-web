// Server-only: genera los consecutivos de radicado. Separado de lib/pqrs.ts
// (que sí se importa desde componentes cliente) porque este archivo usa
// Prisma/better-sqlite3, que no puede empaquetarse para el navegador.
import { db } from "@/lib/db";

function anioCorto(fecha: Date): string {
  return String(fecha.getFullYear()).slice(-2);
}

// Consecutivo de 5 dígitos que reinicia cada año: ENT-26-00001, ENT-26-00002,
// ...; en enero del año siguiente vuelve a partir de ENT-27-00001. Una vez
// asignado, el radicado queda fijo aunque la fecha se corrija después.
export async function siguienteRadicadoEntrada(fechaRadicado: Date): Promise<string> {
  const prefijo = `ENT-${anioCorto(fechaRadicado)}-`;
  const total = await db.peticionPqrs.count({ where: { radicadoEntrada: { startsWith: prefijo } } });
  return `${prefijo}${String(total + 1).padStart(5, "0")}`;
}

export async function siguienteRadicadoSalida(fechaRadicado: Date): Promise<string> {
  const prefijo = `SAL-${anioCorto(fechaRadicado)}-`;
  const total = await db.respuestaPqrs.count({ where: { radicadoSalida: { startsWith: prefijo } } });
  return `${prefijo}${String(total + 1).padStart(5, "0")}`;
}
