"use client";

import { ChevronUp, ChevronDown, Eye, EyeOff } from "lucide-react";
import {
  aplicarConfigModulos,
  obtenerConfigEsquema,
  actualizarConfigEsquema,
  type PlantillaConfig,
} from "@/lib/plantillaConfig";

export type PreguntaDiseno = { id: string; texto: string; valorMaximo: number | null };
export type ModuloDiseno = {
  id: string;
  nombre: string;
  tipo: "PREGUNTAS" | "DATOS_GENERALES";
  preguntas: PreguntaDiseno[];
};

function ordenarIds<T extends { id: string }>(items: T[], orden: string[]): T[] {
  if (orden.length === 0) return items;
  const mapa = new Map(items.map((i) => [i.id, i]));
  const resultado: T[] = [];
  for (const id of orden) {
    const item = mapa.get(id);
    if (item) {
      resultado.push(item);
      mapa.delete(id);
    }
  }
  resultado.push(...items.filter((i) => mapa.has(i.id)));
  return resultado;
}

function moverEnLista(orden: string[], idsCompletos: string[], id: string, direccion: -1 | 1): string[] {
  const lista = orden.length > 0 ? [...orden] : [...idsCompletos];
  // Asegura que todos los ids estén materializados antes de mover, si no ya lo estaban.
  for (const otro of idsCompletos) if (!lista.includes(otro)) lista.push(otro);
  const idx = lista.indexOf(id);
  const destino = idx + direccion;
  if (idx < 0 || destino < 0 || destino >= lista.length) return lista;
  [lista[idx], lista[destino]] = [lista[destino], lista[idx]];
  return lista;
}

export function DisenadorFormato({
  esquemaId,
  modulos,
  config,
  onCambiar,
}: {
  esquemaId: string;
  modulos: ModuloDiseno[];
  config: PlantillaConfig;
  onCambiar: (config: PlantillaConfig) => void;
}) {
  const configEsquema = obtenerConfigEsquema(config, esquemaId);
  const idsModulos = modulos.map((m) => m.id);
  const modulosOrdenados = ordenarIds(modulos, configEsquema.ordenModulos);

  // Índice real de módulo calificado tal como lo verá el documento: solo
  // cuenta módulos visibles y de tipo "preguntas", en el orden final.
  const modulosVisiblesOrdenados = aplicarConfigModulos(
    modulos.map((m) => ({ ...m })),
    config,
    esquemaId,
    (p) => p.id
  );
  const indicePorModulo = new Map<string, number>();
  let contador = 0;
  for (const m of modulosVisiblesOrdenados) {
    if (m.tipo === "PREGUNTAS") {
      contador += 1;
      indicePorModulo.set(m.id, contador);
    }
  }

  function actualizar(cambios: Parameters<typeof actualizarConfigEsquema>[2]) {
    onCambiar(actualizarConfigEsquema(config, esquemaId, cambios));
  }

  function moverModulo(id: string, direccion: -1 | 1) {
    actualizar({ ordenModulos: moverEnLista(configEsquema.ordenModulos, idsModulos, id, direccion) });
  }

  function alternarModulo(id: string) {
    const oculto = configEsquema.modulosOcultos.includes(id);
    actualizar({
      modulosOcultos: oculto
        ? configEsquema.modulosOcultos.filter((x) => x !== id)
        : [...configEsquema.modulosOcultos, id],
    });
  }

  function moverPregunta(moduloId: string, preguntaId: string, idsPreguntas: string[], direccion: -1 | 1) {
    const ordenActual = configEsquema.ordenPreguntas[moduloId] ?? [];
    const nuevo = moverEnLista(ordenActual, idsPreguntas, preguntaId, direccion);
    actualizar({ ordenPreguntas: { ...configEsquema.ordenPreguntas, [moduloId]: nuevo } });
  }

  function alternarPregunta(id: string) {
    const oculta = configEsquema.preguntasOcultas.includes(id);
    actualizar({
      preguntasOcultas: oculta
        ? configEsquema.preguntasOcultas.filter((x) => x !== id)
        : [...configEsquema.preguntasOcultas, id],
    });
  }

  if (modulos.length === 0) {
    return <p className="text-sm text-slate-400">Este esquema todavía no tiene módulos con preguntas.</p>;
  }

  return (
    <div className="space-y-4">
      {modulosOrdenados.map((modulo, idxModulo) => {
        const moduloOculto = configEsquema.modulosOcultos.includes(modulo.id);
        const preguntasOrdenadas = ordenarIds(modulo.preguntas, configEsquema.ordenPreguntas[modulo.id] ?? []);
        const idsPreguntas = modulo.preguntas.map((p) => p.id);
        const indiceReal = indicePorModulo.get(modulo.id);

        return (
          <div
            key={modulo.id}
            className={`overflow-hidden rounded-lg border ${moduloOculto ? "border-slate-200 opacity-50" : "border-slate-300"}`}
          >
            <div
              className="flex items-center justify-between gap-3 border-l-4 px-3 py-2"
              style={{ borderLeftColor: `#${config.colores.encabezadoModulo}`, backgroundColor: "#F8FAFC" }}
            >
              <span className="text-sm font-semibold" style={{ color: `#${config.colores.encabezadoModulo}` }}>
                {modulo.nombre}
                {indiceReal && <span className="ml-2 text-xs font-normal text-slate-400">módulo {indiceReal}</span>}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Subir módulo"
                  disabled={idxModulo === 0}
                  onClick={() => moverModulo(modulo.id, -1)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Bajar módulo"
                  disabled={idxModulo === modulosOrdenados.length - 1}
                  onClick={() => moverModulo(modulo.id, 1)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title={moduloOculto ? "Mostrar módulo en el formato" : "Quitar módulo del formato"}
                  onClick={() => alternarModulo(modulo.id)}
                  className="rounded p-1 text-slate-500 hover:bg-slate-200"
                >
                  {moduloOculto ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {modulo.tipo === "PREGUNTAS" ? (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr style={{ backgroundColor: `#${config.colores.encabezadoTabla}` }}>
                    <th className="w-10 border border-slate-200 px-2 py-1.5 text-center font-semibold">N°</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold">Variable</th>
                    <th className="w-16 border border-slate-200 px-2 py-1.5 text-center font-semibold">Valor</th>
                    <th className="w-20 border border-slate-200 px-2 py-1.5 text-center font-semibold">Calificación</th>
                    <th className="w-24 border border-slate-200 px-2 py-1.5 text-left font-semibold">Observación</th>
                    <th className="w-20 border border-slate-200 bg-white px-2 py-1.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {preguntasOrdenadas.map((pregunta, idxPregunta) => {
                    const oculta = configEsquema.preguntasOcultas.includes(pregunta.id);
                    return (
                      <tr key={pregunta.id} className={oculta ? "opacity-40" : ""}>
                        <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-500">
                          {indiceReal ? `${indiceReal}.${idxPregunta + 1}` : "—"}
                        </td>
                        <td className="border border-slate-200 px-2 py-1.5">{pregunta.texto}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-500">
                          {pregunta.valorMaximo ?? "—"}
                        </td>
                        <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-400 italic">(respuesta)</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-slate-400 italic">(observación)</td>
                        <td className="border border-slate-200 bg-white px-1 py-1">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              title="Subir pregunta"
                              disabled={idxPregunta === 0}
                              onClick={() => moverPregunta(modulo.id, pregunta.id, idsPreguntas, -1)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Bajar pregunta"
                              disabled={idxPregunta === preguntasOrdenadas.length - 1}
                              onClick={() => moverPregunta(modulo.id, pregunta.id, idsPreguntas, 1)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={oculta ? "Mostrar pregunta" : "Quitar pregunta del formato"}
                              onClick={() => alternarPregunta(pregunta.id)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100"
                            >
                              {oculta ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {indiceReal && (
                    <tr style={{ backgroundColor: `#${config.colores.filaTotales}` }}>
                      <td className="border border-slate-200 px-2 py-1.5 font-semibold" colSpan={2}>
                        Total módulo ({indiceReal})
                      </td>
                      <td className="border border-slate-200 px-2 py-1.5 text-center font-semibold text-slate-500">Σ valor</td>
                      <td className="border border-slate-200 px-2 py-1.5 text-center font-semibold text-slate-500">Σ cumplido</td>
                      <td className="border border-slate-200 px-2 py-1.5 font-semibold text-slate-500">%</td>
                      <td className="border border-slate-200 bg-white"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {preguntasOrdenadas.map((pregunta, idxPregunta) => {
                    const oculta = configEsquema.preguntasOcultas.includes(pregunta.id);
                    return (
                      <tr key={pregunta.id} className={oculta ? "opacity-40" : ""}>
                        <td
                          className="w-1/3 border border-slate-200 px-2 py-1.5 font-semibold"
                          style={{ backgroundColor: `#${config.colores.etiquetaDatosGenerales}` }}
                        >
                          {pregunta.texto.replace(/:$/, "")}
                        </td>
                        <td className="border border-slate-200 px-2 py-1.5 italic text-slate-400">(dato)</td>
                        <td className="w-20 border border-slate-200 bg-white px-1 py-1">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              title="Subir"
                              disabled={idxPregunta === 0}
                              onClick={() => moverPregunta(modulo.id, pregunta.id, idsPreguntas, -1)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Bajar"
                              disabled={idxPregunta === preguntasOrdenadas.length - 1}
                              onClick={() => moverPregunta(modulo.id, pregunta.id, idsPreguntas, 1)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={oculta ? "Mostrar" : "Quitar del formato"}
                              onClick={() => alternarPregunta(pregunta.id)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-100"
                            >
                              {oculta ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
