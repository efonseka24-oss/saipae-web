// Lista única de módulos del panel: define la navegación del sidebar y qué
// rutas existen. Mantiene paridad con las opciones que tenía el panel de
// escritorio (Kotlin) más los módulos nuevos (Esquemas y Preguntas, Datos de
// la Empresa).
//
// Nota: hubo un módulo "Editor de Formatos" (plantilla .docx estática
// editable) que quedó obsoleto al pasar Generar Formatos a un generador 100%
// dinámico (Esquema→Módulo→Pregunta→Respuesta). Se retiró de la navegación;
// su código queda sin usar en src/app/api/editor-formatos, src/app/(panel)/editor-formatos
// y src/lib/{listarPlantillas,marcadoresPlantilla,mapasPlantillas,buscarVisitas}.ts.

export type ModuloId =
  | "dashboard"
  | "tabulacion"
  | "cronograma"
  | "formatos"
  | "plantillas"
  | "informes"
  | "pqrs"
  | "administrador"
  | "esquemas"
  | "empresa"
  | "registro"
  | "caes"
  | "laboratorios";

export type Modulo = {
  id: ModuloId;
  href: string;
  etiqueta: string;
  icono:
    | "dashboard"
    | "tabulacion"
    | "cronograma"
    | "formatos"
    | "plantillas"
    | "informes"
    | "pqrs"
    | "administrador"
    | "esquemas"
    | "empresa"
    | "registro"
    | "caes"
    | "laboratorios";
  implementado: boolean;
};

export const MODULOS: Modulo[] = [
  { id: "dashboard", href: "/dashboard", etiqueta: "Dashboard General", icono: "dashboard", implementado: true },
  { id: "tabulacion", href: "/tabulacion", etiqueta: "Tabulación de Encuestas", icono: "tabulacion", implementado: true },
  { id: "cronograma", href: "/cronograma", etiqueta: "Cronograma de Visitas", icono: "cronograma", implementado: true },
  { id: "formatos", href: "/formatos", etiqueta: "Generar Formatos", icono: "formatos", implementado: true },
  { id: "plantillas", href: "/plantillas", etiqueta: "Plantillas de Formatos", icono: "plantillas", implementado: true },
  { id: "informes", href: "/informes", etiqueta: "Generar Informes", icono: "informes", implementado: true },
  { id: "pqrs", href: "/pqrs", etiqueta: "PQRS", icono: "pqrs", implementado: true },
  { id: "esquemas", href: "/esquemas", etiqueta: "Esquemas y Preguntas", icono: "esquemas", implementado: true },
  { id: "empresa", href: "/empresa", etiqueta: "Datos de la Empresa", icono: "empresa", implementado: true },
  { id: "registro", href: "/registro", etiqueta: "Registro", icono: "registro", implementado: true },
  { id: "caes", href: "/caes", etiqueta: "CAES", icono: "caes", implementado: true },
  { id: "laboratorios", href: "/laboratorios", etiqueta: "Laboratorios", icono: "laboratorios", implementado: true },
  { id: "administrador", href: "/administrador", etiqueta: "Administrador", icono: "administrador", implementado: true },
];
