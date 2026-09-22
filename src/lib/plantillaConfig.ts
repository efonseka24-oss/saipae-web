// Diseño del formato de una Plantilla. Una plantilla puede vincularse a
// varios esquemas a la vez (ej. "Plantilla Visitas" sirve para Bodega, RI,
// CCT, RPS, ...), así que solo colores/márgenes son globales a la plantilla;
// qué módulos/preguntas se muestran y en qué orden dentro del REPORTE (no
// afecta el esquema real ni el orden que ve el usuario al diligenciar en
// Tabulación) se guarda POR ESQUEMA. Se guarda como JSON en
// Plantilla.configJson. Solo guarda "excepciones" (ocultos / orden
// explícito) para no quedar desactualizado si luego se agregan módulos o
// preguntas nuevas al esquema: lo no listado se muestra, al final, en su
// orden natural.

export type ColoresPlantilla = {
  encabezadoModulo: string; // barra de título de cada módulo
  encabezadoTabla: string; // fila de encabezado (N°/Variable/Valor/...) de las tablas de preguntas
  filaTotales: string; // fila "Total módulo (N)"
  etiquetaDatosGenerales: string; // columna de etiqueta en los módulos de datos generales
};

export const COLORES_POR_DEFECTO: ColoresPlantilla = {
  encabezadoModulo: "1D4ED8",
  encabezadoTabla: "E2E8F0",
  filaTotales: "F1F5F9",
  etiquetaDatosGenerales: "E2E8F0",
};

// Márgenes de página, en centímetros.
export type MargenesPlantilla = {
  superior: number;
  inferior: number;
  izquierdo: number;
  derecho: number;
};

export const MARGENES_POR_DEFECTO: MargenesPlantilla = {
  superior: 2.5,
  inferior: 2.5,
  izquierdo: 3,
  derecho: 2,
};

export type ConfigPorEsquema = {
  modulosOcultos: string[];
  preguntasOcultas: string[];
  ordenModulos: string[]; // ids de ModuloEsquema, en el orden deseado
  ordenPreguntas: Record<string, string[]>; // moduloId -> ids de Pregunta principal, en orden
};

export function configEsquemaPorDefecto(): ConfigPorEsquema {
  return { modulosOcultos: [], preguntasOcultas: [], ordenModulos: [], ordenPreguntas: {} };
}

export type PlantillaConfig = {
  colores: ColoresPlantilla;
  margenes: MargenesPlantilla;
  porEsquema: Record<string, ConfigPorEsquema>;
};

export function configPorDefecto(): PlantillaConfig {
  return { colores: { ...COLORES_POR_DEFECTO }, margenes: { ...MARGENES_POR_DEFECTO }, porEsquema: {} };
}

function numeroValido(valor: unknown, porDefecto: number): number {
  return typeof valor === "number" && Number.isFinite(valor) && valor >= 0 ? valor : porDefecto;
}

function parsearConfigEsquema(datos: unknown): ConfigPorEsquema {
  const d = (datos && typeof datos === "object" ? datos : {}) as Partial<ConfigPorEsquema>;
  return {
    modulosOcultos: Array.isArray(d.modulosOcultos) ? d.modulosOcultos : [],
    preguntasOcultas: Array.isArray(d.preguntasOcultas) ? d.preguntasOcultas : [],
    ordenModulos: Array.isArray(d.ordenModulos) ? d.ordenModulos : [],
    ordenPreguntas: d.ordenPreguntas && typeof d.ordenPreguntas === "object" ? d.ordenPreguntas : {},
  };
}

export function parsearConfig(json: string | null | undefined): PlantillaConfig {
  const base = configPorDefecto();
  if (!json) return base;
  try {
    const datos = JSON.parse(json);
    const margenes = datos.margenes ?? {};
    const porEsquemaEntrada = datos.porEsquema && typeof datos.porEsquema === "object" ? datos.porEsquema : {};
    const porEsquema: Record<string, ConfigPorEsquema> = {};
    for (const [esquemaId, valor] of Object.entries(porEsquemaEntrada)) {
      porEsquema[esquemaId] = parsearConfigEsquema(valor);
    }
    return {
      colores: { ...base.colores, ...(datos.colores ?? {}) },
      margenes: {
        superior: numeroValido(margenes.superior, base.margenes.superior),
        inferior: numeroValido(margenes.inferior, base.margenes.inferior),
        izquierdo: numeroValido(margenes.izquierdo, base.margenes.izquierdo),
        derecho: numeroValido(margenes.derecho, base.margenes.derecho),
      },
      porEsquema,
    };
  } catch {
    return base;
  }
}

export function obtenerConfigEsquema(config: PlantillaConfig, esquemaId: string): ConfigPorEsquema {
  return config.porEsquema[esquemaId] ?? configEsquemaPorDefecto();
}

export function actualizarConfigEsquema(
  config: PlantillaConfig,
  esquemaId: string,
  cambios: Partial<ConfigPorEsquema>
): PlantillaConfig {
  return {
    ...config,
    porEsquema: {
      ...config.porEsquema,
      [esquemaId]: { ...obtenerConfigEsquema(config, esquemaId), ...cambios },
    },
  };
}

// Ordena una lista de ids según un orden explícito parcial: los ids listados
// van primero (en ese orden), los que falten se agregan al final en su orden
// original.
function ordenarConExcepcion<T>(items: T[], idDe: (item: T) => string, ordenExplicito: string[]): T[] {
  if (ordenExplicito.length === 0) return items;
  const porId = new Map(items.map((i) => [idDe(i), i]));
  const resultado: T[] = [];
  for (const id of ordenExplicito) {
    const item = porId.get(id);
    if (item) {
      resultado.push(item);
      porId.delete(id);
    }
  }
  resultado.push(...items.filter((i) => porId.has(idDe(i))));
  return resultado;
}

export type ModuloConPreguntas<M, P> = M & { id: string; preguntas: P[] };

// Aplica visibilidad + orden de módulos y, dentro de cada uno, de sus
// preguntas principales, según la configuración guardada PARA ESE ESQUEMA.
// Usado tanto por el generador de Word (servidor) como por la vista previa
// del diseñador (navegador).
export function aplicarConfigModulos<M, P>(
  modulos: ModuloConPreguntas<M, P>[],
  config: PlantillaConfig,
  esquemaId: string,
  idPregunta: (p: P) => string
): ModuloConPreguntas<M, P>[] {
  const configEsquema = obtenerConfigEsquema(config, esquemaId);
  const visibles = modulos.filter((m) => !configEsquema.modulosOcultos.includes(m.id));
  const ordenados = ordenarConExcepcion(visibles, (m) => m.id, configEsquema.ordenModulos);

  return ordenados.map((m) => {
    const preguntasVisibles = m.preguntas.filter((p) => !configEsquema.preguntasOcultas.includes(idPregunta(p)));
    const preguntasOrdenadas = ordenarConExcepcion(
      preguntasVisibles,
      idPregunta,
      configEsquema.ordenPreguntas[m.id] ?? []
    );
    return { ...m, preguntas: preguntasOrdenadas };
  });
}
