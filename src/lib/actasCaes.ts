export const TIPOS_ACTA_CAES = ["CONFORMACION", "REUNION"] as const;
export type TipoActaCaes = (typeof TIPOS_ACTA_CAES)[number];

export const ETIQUETAS_TIPO_ACTA_CAES: Record<TipoActaCaes, string> = {
  CONFORMACION: "Conformación",
  REUNION: "Reunión",
};

export function esTipoActaCaes(valor: string): valor is TipoActaCaes {
  return (TIPOS_ACTA_CAES as readonly string[]).includes(valor);
}
