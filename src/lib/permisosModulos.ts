import { MODULOS, type ModuloId } from "@/lib/modulos";

export const TODOS_LOS_MODULOS_IDS: ModuloId[] = MODULOS.map((m) => m.id);

function esModuloId(valor: string): valor is ModuloId {
  return (TODOS_LOS_MODULOS_IDS as string[]).includes(valor);
}

// Lista explícita de módulos permitidos (JSON-encoded string[] de ModuloId,
// SQLite no soporta arrays nativos). No hay convención de "vacío = todos":
// un usuario con la lista vacía literalmente no ve ningún módulo. Los
// usuarios nuevos y los ya existentes (vía migración) parten con todos
// marcados para no bloquear a nadie por accidente.
export function parsearModulosPermitidos(json: string): ModuloId[] {
  try {
    const datos = JSON.parse(json);
    if (!Array.isArray(datos)) return [];
    return datos.filter(esModuloId);
  } catch {
    return [];
  }
}

export function serializarModulosPermitidos(modulos: string[]): string {
  return JSON.stringify(modulos.filter(esModuloId));
}

export function tieneAccesoModulo(modulosPermitidos: ModuloId[], moduloId: ModuloId): boolean {
  return modulosPermitidos.includes(moduloId);
}

// Dado un pathname (ej. "/tabulacion/nueva"), el módulo al que pertenece
// (por prefijo de su href), o null si no coincide con ninguno.
export function moduloDeRuta(pathname: string): ModuloId | null {
  const modulo = MODULOS.find((m) => pathname === m.href || pathname.startsWith(`${m.href}/`));
  return modulo?.id ?? null;
}
