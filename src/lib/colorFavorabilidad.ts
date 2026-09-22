// Escala de color por umbral para cualquier barra que represente un
// porcentaje de favorabilidad/cumplimiento (0-100%). Se usa igual en la
// pantalla del Dashboard, el PDF y el Word de Informes para que el mismo
// porcentaje siempre se vea del mismo color en todos lados.
//   >= 95%        -> verde
//   70% - 94.9%   -> azul
//   50% - 69.9%   -> naranja
//   < 50%         -> rojo
export type NivelFavorabilidad = "ALTO" | "MEDIO_ALTO" | "MEDIO_BAJO" | "BAJO";

export function nivelFavorabilidad(porcentaje: number): NivelFavorabilidad {
  if (porcentaje >= 95) return "ALTO";
  if (porcentaje >= 70) return "MEDIO_ALTO";
  if (porcentaje >= 50) return "MEDIO_BAJO";
  return "BAJO";
}

export const CLASE_TAILWIND_FAVORABILIDAD: Record<NivelFavorabilidad, string> = {
  ALTO: "bg-emerald-600",
  MEDIO_ALTO: "bg-blue-600",
  MEDIO_BAJO: "bg-amber-500",
  BAJO: "bg-red-600",
};

export const COLOR_HEX_FAVORABILIDAD: Record<NivelFavorabilidad, string> = {
  ALTO: "16A34A",
  MEDIO_ALTO: "1D4ED8",
  MEDIO_BAJO: "D97706",
  BAJO: "DC2626",
};

export const COLOR_RGB_FAVORABILIDAD: Record<NivelFavorabilidad, [number, number, number]> = {
  ALTO: [22, 163, 74],
  MEDIO_ALTO: [29, 78, 216],
  MEDIO_BAJO: [217, 119, 6],
  BAJO: [220, 38, 38],
};

export function claseTailwindPorcentaje(porcentaje: number): string {
  return CLASE_TAILWIND_FAVORABILIDAD[nivelFavorabilidad(porcentaje)];
}

export function colorHexPorcentaje(porcentaje: number): string {
  return COLOR_HEX_FAVORABILIDAD[nivelFavorabilidad(porcentaje)];
}

export function colorRgbPorcentaje(porcentaje: number): [number, number, number] {
  return COLOR_RGB_FAVORABILIDAD[nivelFavorabilidad(porcentaje)];
}
