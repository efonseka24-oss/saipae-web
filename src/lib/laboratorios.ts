export const RESULTADOS_LABORATORIO = ["FAVORABLE", "DESFAVORABLE"] as const;
export type ResultadoLaboratorio = (typeof RESULTADOS_LABORATORIO)[number];

export const ETIQUETAS_RESULTADO_LABORATORIO: Record<ResultadoLaboratorio, string> = {
  FAVORABLE: "Favorable",
  DESFAVORABLE: "Desfavorable",
};

export function esResultadoLaboratorio(valor: string): valor is ResultadoLaboratorio {
  return (RESULTADOS_LABORATORIO as readonly string[]).includes(valor);
}

// Cumplimiento de cada línea de detalle de la muestra (producto/examen). No
// es obligatorio: una línea puede quedar sin diligenciar.
export const CUMPLIMIENTOS_MUESTRA = ["CUMPLE", "NO_CUMPLE"] as const;
export type CumplimientoMuestra = (typeof CUMPLIMIENTOS_MUESTRA)[number];

export const ETIQUETAS_CUMPLIMIENTO_MUESTRA: Record<CumplimientoMuestra, string> = {
  CUMPLE: "Cumple",
  NO_CUMPLE: "No cumple",
};

export function esCumplimientoMuestra(valor: string): valor is CumplimientoMuestra {
  return (CUMPLIMIENTOS_MUESTRA as readonly string[]).includes(valor);
}

// Número fijo de líneas de detalle (producto/examen/cumplimiento) por muestra.
export const NUMERO_DETALLES_MUESTRA = 10;

export type DetalleMuestraEntrada = {
  producto: string;
  examen: string;
  cumplimiento: string;
};
