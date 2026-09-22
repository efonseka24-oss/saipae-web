// Tipos compartidos del módulo Esquemas y Preguntas.
// SQLite (vía Prisma) no soporta enums nativos, así que estos valores se
// guardan como String y se validan aquí en la capa de aplicación.

export const CLASES_PREGUNTA = ["PRINCIPAL", "SECUNDARIA"] as const;
export type ClasePregunta = (typeof CLASES_PREGUNTA)[number];

export const TIPOS_PREGUNTA = [
  "TEXTO_LIBRE",
  "NUMERO",
  "SELECCION_MULTIPLE",
  "FOTO",
  "ARCHIVO",
  "FIRMA",
] as const;
export type TipoPregunta = (typeof TIPOS_PREGUNTA)[number];

export const TIPOS_VALIDACION = [
  "NINGUNA",
  "EMAIL",
  "NUMERO",
  "TELEFONO",
  "FECHA",
  "HORA",
] as const;
export type TipoValidacion = (typeof TIPOS_VALIDACION)[number];

// Naturaleza de las opciones de respuesta cuando tipo = SELECCION_MULTIPLE:
// cualitativa (ej. CUMPLE / NO CUMPLE / NO APLICA) o cuantitativa (ej. 0 / 1 / 3).
export const NATURALEZAS_OPCIONES = ["CUALITATIVA", "CUANTITATIVA"] as const;
export type NaturalezaOpciones = (typeof NATURALEZAS_OPCIONES)[number];

export const ETIQUETAS_NATURALEZA_OPCIONES: Record<NaturalezaOpciones, string> = {
  CUALITATIVA: "Cualitativa",
  CUANTITATIVA: "Cuantitativa",
};

export const ETIQUETAS_TIPO_PREGUNTA: Record<TipoPregunta, string> = {
  TEXTO_LIBRE: "Texto libre",
  NUMERO: "Número",
  SELECCION_MULTIPLE: "Selección múltiple",
  FOTO: "Foto",
  ARCHIVO: "Archivo",
  FIRMA: "Firma",
};

export const ETIQUETAS_VALIDACION: Record<TipoValidacion, string> = {
  NINGUNA: "Ninguna",
  EMAIL: "Email",
  NUMERO: "Número",
  TELEFONO: "Teléfono",
  FECHA: "Fecha",
  HORA: "Hora",
};

export function esClasePregunta(valor: string): valor is ClasePregunta {
  return (CLASES_PREGUNTA as readonly string[]).includes(valor);
}

export function esTipoPregunta(valor: string): valor is TipoPregunta {
  return (TIPOS_PREGUNTA as readonly string[]).includes(valor);
}

export function esTipoValidacion(valor: string): valor is TipoValidacion {
  return (TIPOS_VALIDACION as readonly string[]).includes(valor);
}

export function esNaturalezaOpciones(valor: string): valor is NaturalezaOpciones {
  return (NATURALEZAS_OPCIONES as readonly string[]).includes(valor);
}

// Generación automática de subpreguntas: replica los 3 grupos fijos que la
// app móvil arma en EncuestaUtils.kt (crearGrupoDePreguntas/generarGrupoMateriaPrima/
// crearGrupoDePreguntasOrg). Solo aplica al CREAR una pregunta principal.
export const GENERAR_SUBPREGUNTAS_AUTO = [
  "NINGUNA",
  "EVIDENCIAS",
  "MATERIA_PRIMA",
  "ORGANOLEPTICO",
] as const;
export type GenerarSubPreguntasAuto = (typeof GENERAR_SUBPREGUNTAS_AUTO)[number];

export const ETIQUETAS_GENERAR_SUBPREGUNTAS_AUTO: Record<GenerarSubPreguntasAuto, string> = {
  NINGUNA: "Ninguna",
  EVIDENCIAS: "Evidencias (observación + foto + archivo)",
  MATERIA_PRIMA: "Materia prima (proveedor, lote, fecha, temperatura, ...)",
  ORGANOLEPTICO: "Organoléptico (peso/volumen, temperaturas de cocción/distribución)",
};

export function esGenerarSubPreguntasAuto(valor: string): valor is GenerarSubPreguntasAuto {
  return (GENERAR_SUBPREGUNTAS_AUTO as readonly string[]).includes(valor);
}
