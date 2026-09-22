export const TIPOS_PETICION_PQRS = ["PETICION", "QUEJA", "RECLAMO", "SUGERENCIA"] as const;
export type TipoPeticionPqrs = (typeof TIPOS_PETICION_PQRS)[number];

export const ETIQUETAS_TIPO_PETICION_PQRS: Record<TipoPeticionPqrs, string> = {
  PETICION: "Petición",
  QUEJA: "Queja",
  RECLAMO: "Reclamo",
  SUGERENCIA: "Sugerencia",
};

export function esTipoPeticionPqrs(valor: string): valor is TipoPeticionPqrs {
  return (TIPOS_PETICION_PQRS as readonly string[]).includes(valor);
}
