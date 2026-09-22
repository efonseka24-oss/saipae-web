export const TIPOS_RACION_PAE = ["RPS", "RI", "CCT"] as const;
export type TipoRacionPae = (typeof TIPOS_RACION_PAE)[number];

export const ETIQUETAS_TIPO_RACION_PAE: Record<TipoRacionPae, string> = {
  RPS: "RPS",
  RI: "RI",
  CCT: "CCT",
};

export function esTipoRacionPae(valor: string): valor is TipoRacionPae {
  return (TIPOS_RACION_PAE as readonly string[]).includes(valor);
}

// Una institución/sede puede tener cualquier combinación de las 3, así que
// se guarda como JSON-encoded string[] (SQLite no soporta arrays nativos).
export function parsearTiposRacion(json: string): TipoRacionPae[] {
  try {
    const datos = JSON.parse(json);
    if (!Array.isArray(datos)) return [];
    return datos.filter(esTipoRacionPae);
  } catch {
    return [];
  }
}

export function serializarTiposRacion(tipos: string[]): string {
  return JSON.stringify(tipos.filter(esTipoRacionPae));
}
