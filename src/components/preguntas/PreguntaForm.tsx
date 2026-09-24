"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  CLASES_PREGUNTA,
  TIPOS_PREGUNTA,
  TIPOS_VALIDACION,
  NATURALEZAS_OPCIONES,
  GENERAR_SUBPREGUNTAS_AUTO,
  FUENTES_OPCIONES,
  ETIQUETAS_FUENTE_OPCIONES,
  ETIQUETAS_TIPO_PREGUNTA,
  ETIQUETAS_VALIDACION,
  ETIQUETAS_NATURALEZA_OPCIONES,
  ETIQUETAS_GENERAR_SUBPREGUNTAS_AUTO,
  type ClasePregunta,
  type TipoPregunta,
  type TipoValidacion,
  type NaturalezaOpciones,
  type GenerarSubPreguntasAuto,
  type FuenteOpciones,
} from "@/lib/preguntas";

export type PreguntaExistente = {
  id: string;
  moduloId: string;
  texto: string;
  clase: string;
  padreId: string | null;
  tipo: string;
  opciones: string[];
  naturalezaOpciones: string;
  validacion: string;
  obligatoria: boolean;
  orden: number;
  ordenPanel?: number;
  fuenteOpciones?: string;
  generarSubPreguntasAuto: string;
  saltarSiRespuesta: string | null;
  saltarHastaPreguntaId: string | null;
  saltarRellenarCon: string | null;
};

export type PreguntaPrincipalOpcion = { id: string; texto: string };

export function PreguntaForm({
  moduloId,
  modulosDelEsquema,
  preguntasPrincipales,
  preguntaExistente,
  onCancelar,
  onGuardado,
}: {
  moduloId: string;
  modulosDelEsquema: { id: string; nombre: string }[];
  preguntasPrincipales: PreguntaPrincipalOpcion[];
  preguntaExistente?: PreguntaExistente;
  onCancelar?: () => void;
  onGuardado?: () => void;
}) {
  const router = useRouter();
  const editando = Boolean(preguntaExistente);

  const [texto, setTexto] = useState(preguntaExistente?.texto ?? "");
  const [moduloDestinoId, setModuloDestinoId] = useState(preguntaExistente?.moduloId ?? moduloId);
  const [clase, setClase] = useState<ClasePregunta>(
    (preguntaExistente?.clase as ClasePregunta) ?? "PRINCIPAL"
  );
  const [padreId, setPadreId] = useState(preguntaExistente?.padreId ?? "");
  const [tipo, setTipo] = useState<TipoPregunta>(
    (preguntaExistente?.tipo as TipoPregunta) ?? "TEXTO_LIBRE"
  );
  const [opciones, setOpciones] = useState<string[]>(
    preguntaExistente?.opciones.length ? preguntaExistente.opciones : [""]
  );
  const [naturalezaOpciones, setNaturalezaOpciones] = useState<NaturalezaOpciones>(
    (preguntaExistente?.naturalezaOpciones as NaturalezaOpciones) ?? "CUALITATIVA"
  );
  const [fuenteOpciones, setFuenteOpciones] = useState<FuenteOpciones>(
    (preguntaExistente?.fuenteOpciones as FuenteOpciones) ?? "NINGUNA"
  );
  const conFuente = tipo === "SELECCION_MULTIPLE" && fuenteOpciones !== "NINGUNA";
  const [validacion, setValidacion] = useState<TipoValidacion>(
    (preguntaExistente?.validacion as TipoValidacion) ?? "NINGUNA"
  );
  const [obligatoria, setObligatoria] = useState(preguntaExistente?.obligatoria ?? true);
  const [orden, setOrden] = useState(preguntaExistente?.orden ?? 0);
  const [generarSubPreguntasAuto, setGenerarSubPreguntasAuto] = useState<GenerarSubPreguntasAuto>(
    (preguntaExistente?.generarSubPreguntasAuto as GenerarSubPreguntasAuto) ?? "NINGUNA"
  );
  const [saltarSiRespuesta, setSaltarSiRespuesta] = useState(preguntaExistente?.saltarSiRespuesta ?? "");
  const [saltarHastaPreguntaId, setSaltarHastaPreguntaId] = useState(
    preguntaExistente?.saltarHastaPreguntaId ?? ""
  );
  const [saltarRellenarCon, setSaltarRellenarCon] = useState(preguntaExistente?.saltarRellenarCon ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);

    const cuerpo = {
      texto,
      moduloId: editando && clase === "PRINCIPAL" ? moduloDestinoId : undefined,
      clase,
      padreId: clase === "SECUNDARIA" ? padreId : null,
      tipo,
      opciones: tipo === "SELECCION_MULTIPLE" && !conFuente ? opciones.filter((o) => o.trim()) : [],
      naturalezaOpciones: conFuente ? "NO_APLICA" : tipo === "SELECCION_MULTIPLE" ? naturalezaOpciones : "CUALITATIVA",
      fuenteOpciones: conFuente ? fuenteOpciones : "NINGUNA",
      validacion: conFuente ? "NINGUNA" : validacion,
      obligatoria,
      orden: Number(orden) || 0,
      generarSubPreguntasAuto: clase === "PRINCIPAL" ? generarSubPreguntasAuto : "NINGUNA",
      saltarSiRespuesta: clase === "PRINCIPAL" ? saltarSiRespuesta.trim() || null : null,
      saltarHastaPreguntaId: clase === "PRINCIPAL" ? saltarHastaPreguntaId || null : null,
      saltarRellenarCon: clase === "PRINCIPAL" ? saltarRellenarCon.trim() || null : null,
    };

    const url = editando ? `/api/preguntas/${preguntaExistente!.id}` : `/api/modulos/${moduloId}/preguntas`;
    const metodo = editando ? "PATCH" : "POST";

    const respuesta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });

    if (!respuesta.ok) {
      const datos = await respuesta.json();
      setError(datos.error ?? "No se pudo guardar la pregunta.");
      setGuardando(false);
      return;
    }

    setGuardando(false);
    router.refresh();
    onGuardado?.();
  }

  const opcionesDestinoSalto = preguntasPrincipales.filter((p) => p.id !== preguntaExistente?.id);

  return (
    <Card className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          {editando ? "Editar pregunta" : "Nueva pregunta"}
        </h2>
        {onCancelar && (
          <button onClick={onCancelar} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Pregunta</label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            required
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Clase</label>
          <select
            value={clase}
            onChange={(e) => setClase(e.target.value as ClasePregunta)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {CLASES_PREGUNTA.map((c) => (
              <option key={c} value={c}>
                {c === "PRINCIPAL" ? "Principal" : "Secundaria"}
              </option>
            ))}
          </select>
        </div>

        {editando && clase === "PRINCIPAL" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Módulo</label>
            <select
              value={moduloDestinoId}
              onChange={(e) => setModuloDestinoId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {modulosDelEsquema.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
            {moduloDestinoId !== moduloId && (
              <p className="mt-1 text-xs text-amber-600">
                Al guardar, esta pregunta (y sus subpreguntas) se mueven a ese módulo y dejan de verse aquí.
              </p>
            )}
          </div>
        )}

        {clase === "SECUNDARIA" && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Pregunta principal (padre)
            </label>
            <select
              value={padreId}
              onChange={(e) => setPadreId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Selecciona...</option>
              {preguntasPrincipales
                .filter((p) => p.id !== preguntaExistente?.id)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.texto.slice(0, 60)}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Tipo de pregunta</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoPregunta)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {TIPOS_PREGUNTA.map((t) => (
              <option key={t} value={t}>
                {ETIQUETAS_TIPO_PREGUNTA[t]}
              </option>
            ))}
          </select>
        </div>

        {!conFuente && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Validación</label>
            <select
              value={validacion}
              onChange={(e) => setValidacion(e.target.value as TipoValidacion)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {TIPOS_VALIDACION.map((v) => (
                <option key={v} value={v}>
                  {ETIQUETAS_VALIDACION[v]}
                </option>
              ))}
            </select>
          </div>
          )}

        {tipo === "SELECCION_MULTIPLE" && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Opciones desde</label>
            <select
              value={fuenteOpciones}
              onChange={(e) => setFuenteOpciones(e.target.value as FuenteOpciones)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {FUENTES_OPCIONES.map((f) => (
                <option key={f} value={f}>
                  {ETIQUETAS_FUENTE_OPCIONES[f]}
                </option>
              ))}
            </select>
            {conFuente && (
              <p className="mt-1 text-xs text-slate-500">
                {fuenteOpciones === "USUARIO"
                  ? "La app muestra los correos de los usuarios activos del panel; la visita queda unida a ese usuario."
                  : "Las opciones se cargan del módulo Registro y se filtran según lo elegido antes en la visita (lote → zode → municipio → institución → sede). No cuenta en estadísticas."}
              </p>
            )}
          </div>
        )}

        {tipo === "SELECCION_MULTIPLE" && !conFuente && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Naturaleza de las opciones
              </label>
              <select
                value={naturalezaOpciones}
                onChange={(e) => setNaturalezaOpciones(e.target.value as NaturalezaOpciones)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {NATURALEZAS_OPCIONES.map((n) => (
                  <option key={n} value={n}>
                    {ETIQUETAS_NATURALEZA_OPCIONES[n]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Cualitativa: p. ej. CUMPLE / NO CUMPLE. Cuantitativa: p. ej. 0 / 1 / 3. No aplica: no se cuenta en las estadísticas.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Opciones</label>
              <div className="space-y-2">
                {opciones.map((opcion, indice) => (
                  <div key={indice} className="flex gap-2">
                    <input
                      value={opcion}
                      onChange={(e) => {
                        const copia = [...opciones];
                        copia[indice] = e.target.value;
                        setOpciones(copia);
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder={`Opción ${indice + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => setOpciones(opciones.filter((_, i) => i !== indice))}
                      className="rounded-md p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setOpciones([...opciones, ""])}
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar opción
                </button>
              </div>
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Orden</label>
          <input
            type="number"
            value={orden}
            onChange={(e) => setOrden(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={obligatoria}
              onChange={(e) => setObligatoria(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Obligatoria
          </label>
        </div>

        {clase === "PRINCIPAL" && (
          <>
            <div className="sm:col-span-2 border-t border-slate-100 pt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Generar subpreguntas automáticas
              </label>
              <select
                value={generarSubPreguntasAuto}
                onChange={(e) => setGenerarSubPreguntasAuto(e.target.value as GenerarSubPreguntasAuto)}
                disabled={editando}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 sm:max-w-md"
              >
                {GENERAR_SUBPREGUNTAS_AUTO.map((g) => (
                  <option key={g} value={g}>
                    {ETIQUETAS_GENERAR_SUBPREGUNTAS_AUTO[g]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-500">
                {editando
                  ? "Esto solo se aplica al crear la pregunta; no se puede regenerar el grupo desde aquí."
                  : "Crea automáticamente, al guardar, el mismo grupo fijo de subpreguntas que usa la app móvil (mismos textos y tipos)."}
              </p>
              {!editando && (generarSubPreguntasAuto === "MATERIA_PRIMA" || generarSubPreguntasAuto === "ORGANOLEPTICO") && (
                <p className="mt-1 text-xs font-medium text-amber-600">
                  Las preguntas de materia prima y organoléptico siempre se ubican al final del resto del esquema
                  (materia prima antes que organoléptico), sin importar el módulo que elijas aquí.
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium text-slate-700">
                Salto condicional (opcional)
              </p>
              <div className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Si la respuesta es
                  </label>
                  <input
                    value={saltarSiRespuesta}
                    onChange={(e) => setSaltarSiRespuesta(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej. NO"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Saltar hasta
                  </label>
                  <select
                    value={saltarHastaPreguntaId}
                    onChange={(e) => setSaltarHastaPreguntaId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">(sin salto)</option>
                    {opcionesDestinoSalto.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.texto.slice(0, 40)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Rellenar las saltadas con
                  </label>
                  <input
                    value={saltarRellenarCon}
                    onChange={(e) => setSaltarRellenarCon(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Ej. NO OBSERVADO"
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Si la respuesta a esta pregunta coincide exactamente, el flujo salta directo a la
                pregunta elegida y rellena las preguntas principales de en medio con ese valor.
              </p>
            </div>
          </>
        )}

        {error && <p className="sm:col-span-2 text-sm font-medium text-red-600">{error}</p>}

        <div className="sm:col-span-2">
          <Button type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear pregunta"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
