// Reglas de negocio para el generador de Word de Plantillas: cómo se
// clasifica un módulo (datos generales vs. preguntas de encuesta calificadas),
// cuál es el valor máximo de una pregunta y dónde vive su observación.
// Todo se deriva de los datos ya existentes (Pregunta/Respuesta) — no
// requiere campos nuevos de "valor máximo" ni "observación" en el esquema.

export type PreguntaPlantilla = {
  id: string;
  texto: string;
  clase: string;
  tipo: string;
  opciones: string;
  naturalezaOpciones: string;
  padreId: string | null;
  orden: number;
  generarSubPreguntasAuto: string;
};

export const TIPOS_GRUPO_ESPECIAL = ["MATERIA_PRIMA", "ORGANOLEPTICO"] as const;
export type TipoGrupoEspecial = (typeof TIPOS_GRUPO_ESPECIAL)[number];

export function esTipoGrupoEspecial(valor: string): valor is TipoGrupoEspecial {
  return (TIPOS_GRUPO_ESPECIAL as readonly string[]).includes(valor);
}

export const TIPOS_PLANTILLA = ["VISITA", ...TIPOS_GRUPO_ESPECIAL] as const;
export type TipoPlantilla = (typeof TIPOS_PLANTILLA)[number];

export const ETIQUETAS_TIPO_PLANTILLA: Record<TipoPlantilla, string> = {
  VISITA: "Visita (por módulos del esquema)",
  MATERIA_PRIMA: "Materia prima (dedicada)",
  ORGANOLEPTICO: "Organoléptico (dedicada)",
};

export function esTipoPlantilla(valor: string): valor is TipoPlantilla {
  return (TIPOS_PLANTILLA as readonly string[]).includes(valor);
}

// Una pregunta principal marcada con MATERIA_PRIMA u ORGANOLEPTICO (al
// crearla, ver web/src/lib/subpreguntasAuto.ts) siempre se reporta en su
// propia plantilla dedicada (Plantilla Materia Prima / Organolépticas), sin
// importar en qué módulo del esquema viva — nunca en la plantilla de visita.
export function esPreguntaDeGrupoEspecial(pregunta: PreguntaPlantilla): boolean {
  return (TIPOS_GRUPO_ESPECIAL as readonly string[]).includes(pregunta.generarSubPreguntasAuto);
}

export function parsearOpciones(opcionesJson: string): string[] {
  try {
    const datos = JSON.parse(opcionesJson);
    return Array.isArray(datos) ? datos : [];
  } catch {
    return [];
  }
}

// El valor máximo de una pregunta calificada (1 o 3) es el mayor número
// presente en sus opciones (ej. ["0","1","NO OBSERVADO","NO APLICA"] -> 1,
// ["0","3","NO OBSERVADO","NO APLICA"] -> 3). null si la pregunta no es
// calificable (no es de selección múltiple cuantitativa).
export function valorMaximoPregunta(pregunta: PreguntaPlantilla): number | null {
  if (pregunta.tipo !== "SELECCION_MULTIPLE" || pregunta.naturalezaOpciones !== "CUANTITATIVA") return null;
  const numeros = parsearOpciones(pregunta.opciones)
    .map((o) => Number(o))
    .filter((n) => Number.isFinite(n));
  if (numeros.length === 0) return null;
  return Math.max(...numeros);
}

// Un módulo se trata como "de preguntas de encuesta" (tabla con ítem/valor/
// calificación/observación) si tiene al menos una pregunta principal
// calificable; si no, se trata como "datos generales" (formato compacto).
export function esModuloDePreguntas(preguntas: PreguntaPlantilla[]): boolean {
  return preguntas.some((p) => p.clase === "PRINCIPAL" && valorMaximoPregunta(p) !== null);
}

// 0, 1 o 3 son respuestas "aplicables" (cuentan para los totales); NO
// OBSERVADO / NO APLICA / sin responder quedan fuera del porcentaje.
export function respuestaNumericaAplicable(valor: string | null | undefined): number | null {
  if (valor === "0" || valor === "1" || valor === "3") return Number(valor);
  return null;
}

// La observación de una pregunta principal vive en su primera subpregunta
// (clase SECUNDARIA) de texto libre, tal como las genera la app móvil.
export function textoObservacion(
  pregunta: PreguntaPlantilla,
  todasLasPreguntas: PreguntaPlantilla[],
  valorPorPregunta: Map<string, string | null | undefined>
): string {
  const hijaObservacion = todasLasPreguntas
    .filter((p) => p.padreId === pregunta.id && p.clase === "SECUNDARIA" && p.tipo === "TEXTO_LIBRE")
    .sort((a, b) => a.orden - b.orden)[0];
  if (!hijaObservacion) return "";
  return valorPorPregunta.get(hijaObservacion.id)?.trim() || "";
}
