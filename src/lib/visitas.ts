export const ESTADOS_VISITA = ["EN_PROGRESO", "FINALIZADA"] as const;
export type EstadoVisita = (typeof ESTADOS_VISITA)[number];

export const ETIQUETAS_ESTADO_VISITA: Record<EstadoVisita, string> = {
  EN_PROGRESO: "En progreso",
  FINALIZADA: "Finalizada",
};

export function esEstadoVisita(valor: string): valor is EstadoVisita {
  return (ESTADOS_VISITA as readonly string[]).includes(valor);
}
