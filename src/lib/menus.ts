// Menús del PAE (sección de Esquemas y Preguntas). Cada menú tiene número,
// lote, la marca de especial para comunidades negras o étnicas y sus
// alimentos (tipo, nombre, unidad de medida y cantidad).

// Sugerencias para "Tipo de alimento" (grupos de alimentos de la minuta PAE);
// se puede escribir otro.
export const TIPOS_ALIMENTO = [
  "Lácteo",
  "Proteico",
  "Cereal",
  "Tubérculo, raíz o plátano",
  "Leguminosa",
  "Fruta",
  "Verdura",
  "Grasa",
  "Azúcar",
  "Bebida",
] as const;

export const UNIDADES_MENU = ["g", "kg", "ml", "L", "cc", "unidad", "porción", "onza", "cucharada"] as const;

// Máximo de alimentos por menú.
export const MAXIMO_DETALLES_MENU = 40;

export type DetalleMenuEntrada = {
  tipoAlimento: string;
  nombreAlimento: string;
  unidad: string;
  cantidad: string;
};

export const ETIQUETA_ESPECIAL_ETNICO = "Especial comunidades negras o étnicas";
