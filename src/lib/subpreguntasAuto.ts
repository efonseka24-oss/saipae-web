// Plantillas de subpreguntas automáticas: traducción exacta de
// composeApp/.../ui/EncuestaUtils.kt (crearGrupoDePreguntas, generarGrupoMateriaPrima,
// crearGrupoDePreguntasOrg) para que el CRUD web genere el mismo grupo fijo de
// subpreguntas que arma la app móvil al activar una pregunta principal.
import type { GenerarSubPreguntasAuto, TipoPregunta, TipoValidacion } from "@/lib/preguntas";

export type PlantillaSubPregunta = {
  texto: string;
  tipo: TipoPregunta;
  validacion?: TipoValidacion;
  obligatoria: boolean;
  opciones?: string[];
};

function grupoEvidencias(): PlantillaSubPregunta[] {
  return [
    {
      texto:
        "Observaciones sobre la pregunta, recuerde que en caso que la respuesta sea diferente a 1 o a cumple, el deber ser es dejar observación",
      tipo: "TEXTO_LIBRE",
      obligatoria: false,
    },
    {
      texto:
        "Evidencia Fotográfica (Opcional), recuerde que en caso que la respuesta sea diferente a 1 o a cumple, el deber ser es tomar evidencia",
      tipo: "FOTO",
      obligatoria: false,
    },
    {
      texto:
        "Evidencia en Archivo (Opcional), recuerde que en caso que la respuesta sea diferente a 1 o a cumple, el deber ser es tomar evidencia",
      tipo: "ARCHIVO",
      obligatoria: false,
    },
  ];
}

function grupoMateriaPrima(): PlantillaSubPregunta[] {
  return [
    { texto: "Proveedor:", tipo: "TEXTO_LIBRE", obligatoria: true },
    { texto: "Lote:", tipo: "TEXTO_LIBRE", obligatoria: true },
    { texto: "Fecha de Vencimiento:", tipo: "TEXTO_LIBRE", validacion: "FECHA", obligatoria: true },
    {
      texto: "Temperatura en °C (Aplica para productos de alto riesgo):",
      tipo: "TEXTO_LIBRE",
      validacion: "NUMERO",
      obligatoria: false,
    },
    { texto: "Unidad de Medida:", tipo: "TEXTO_LIBRE", obligatoria: true },
    { texto: "Cantidad:", tipo: "TEXTO_LIBRE", validacion: "NUMERO", obligatoria: true },
    {
      texto: "CUMPLIMIENTO:",
      tipo: "SELECCION_MULTIPLE",
      obligatoria: true,
      opciones: ["CUMPLE", "NO CUMPLE"],
    },
  ];
}

function grupoOrganoleptico(): PlantillaSubPregunta[] {
  const cumplimiento = (texto: string): PlantillaSubPregunta => ({
    texto,
    tipo: "SELECCION_MULTIPLE",
    obligatoria: true,
    opciones: ["CUMPLE", "NO CUMPLE"],
  });
  const numero = (texto: string): PlantillaSubPregunta => ({
    texto,
    tipo: "TEXTO_LIBRE",
    validacion: "NUMERO",
    obligatoria: true,
  });

  return [
    { texto: "Verificacion de peso y Volumen - Nivel / Grado:", tipo: "TEXTO_LIBRE", obligatoria: true },
    numero("Verificacion de peso y Volumen - Peso Declarado"),
    numero("Verificacion de peso y Volumen - Peso Verificado:"),
    cumplimiento("Verificacion de peso y Volumen - Cumplimiento"),
    numero("Verificacion de Temperatura Para alimentos de alto riesgo - Temperatura Final de Cocción:"),
    cumplimiento("Temperatura Final de Cocción - Cumplimieto:"),
    numero("Verificacion de Temperatura Para alimentos de alto riesgo - Temperatura de distribucion inicial:"),
    cumplimiento("Temperatura de distribucion inicial - Cumplimiento:"),
    numero("Verificacion de Temperatura Para alimentos de alto riesgo - Temperatura de distribucion final:"),
    cumplimiento("Temperatura de distribucion final - Cumplimiento:"),
    cumplimiento("Verificacion de Temperatura Para alimentos de alto riesgo - CUMPLIMIENTO GENERAL:"),
  ];
}

export function plantillaSubPreguntasAuto(tipo: GenerarSubPreguntasAuto): PlantillaSubPregunta[] {
  switch (tipo) {
    case "EVIDENCIAS":
      return grupoEvidencias();
    case "MATERIA_PRIMA":
      return grupoMateriaPrima();
    case "ORGANOLEPTICO":
      return grupoOrganoleptico();
    case "NINGUNA":
    default:
      return [];
  }
}
