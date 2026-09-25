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
// cualitativa (ej. CUMPLE / NO CUMPLE / NO APLICA), cuantitativa (ej. 0 / 1 / 3)
// o "no aplica": la pregunta no se cuenta en ninguna estadística (ej. municipio).
export const NATURALEZAS_OPCIONES = ["CUALITATIVA", "CUANTITATIVA", "NO_APLICA"] as const;
export type NaturalezaOpciones = (typeof NATURALEZAS_OPCIONES)[number];

export const ETIQUETAS_NATURALEZA_OPCIONES: Record<NaturalezaOpciones, string> = {
  CUALITATIVA: "Cualitativa",
  CUANTITATIVA: "Cuantitativa",
  NO_APLICA: "No aplica (no cuenta en estadísticas)",
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

// Origen de las opciones de una pregunta de selección: fijas (escritas en la
// pregunta) o tomadas del módulo Registro / de los usuarios del panel. Las de
// Registro se filtran en cascada: al elegir un municipio, la pregunta de
// institución solo ofrece las de ese municipio, y así sucesivamente.
export const FUENTES_OPCIONES = ["NINGUNA", "LOTE", "ZODE", "MUNICIPIO", "INSTITUCION", "SEDE", "OPERADOR", "USUARIO"] as const;
export type FuenteOpciones = (typeof FUENTES_OPCIONES)[number];

export const ETIQUETAS_FUENTE_OPCIONES: Record<FuenteOpciones, string> = {
  NINGUNA: "Opciones escritas en la pregunta",
  LOTE: "Lotes (Registro)",
  ZODE: "Zodes (Registro)",
  MUNICIPIO: "Municipios (Registro)",
  INSTITUCION: "Instituciones (Registro)",
  SEDE: "Sedes (Registro)",
  OPERADOR: "Operadores (Registro, según el zode)",
  USUARIO: "Correos de los usuarios (interventor)",
};

export function esFuenteOpciones(valor: string): valor is FuenteOpciones {
  return (FUENTES_OPCIONES as readonly string[]).includes(valor);
}
