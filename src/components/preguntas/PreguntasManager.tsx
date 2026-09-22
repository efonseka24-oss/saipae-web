"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PreguntaForm, type PreguntaExistente } from "@/components/preguntas/PreguntaForm";
import {
  ETIQUETAS_TIPO_PREGUNTA,
  ETIQUETAS_VALIDACION,
  ETIQUETAS_NATURALEZA_OPCIONES,
  ETIQUETAS_GENERAR_SUBPREGUNTAS_AUTO,
  type TipoPregunta,
  type TipoValidacion,
  type NaturalezaOpciones,
  type GenerarSubPreguntasAuto,
} from "@/lib/preguntas";

export function PreguntasManager({
  moduloId,
  preguntas,
  modulosDelEsquema,
}: {
  moduloId: string;
  preguntas: PreguntaExistente[];
  modulosDelEsquema: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [modoEdicion, setModoEdicion] = useState<string | null>(null); // id, "__nueva__", o null

  const principales = preguntas.filter((p) => p.clase === "PRINCIPAL");
  const preguntasPrincipalesOpciones = principales.map((p) => ({ id: p.id, texto: p.texto }));
  const preguntaPorId = new Map(preguntas.map((p) => [p.id, p]));

  async function eliminar(pregunta: PreguntaExistente) {
    const tieneSubpreguntas = preguntas.some((p) => p.padreId === pregunta.id);
    const aviso = tieneSubpreguntas
      ? `"${pregunta.texto.slice(0, 40)}" tiene subpreguntas asociadas, que quedarán sueltas. ¿Eliminar de todas formas?`
      : `¿Eliminar la pregunta "${pregunta.texto.slice(0, 40)}"?`;
    if (!confirm(aviso)) return;

    await fetch(`/api/preguntas/${pregunta.id}`, { method: "DELETE" });
    router.refresh();
  }

  function renderFila(pregunta: PreguntaExistente, esSub: boolean) {
    if (modoEdicion === pregunta.id) {
      return (
        <div key={pregunta.id} className="py-3">
          <PreguntaForm
            moduloId={moduloId}
            modulosDelEsquema={modulosDelEsquema}
            preguntasPrincipales={preguntasPrincipalesOpciones}
            preguntaExistente={pregunta}
            onCancelar={() => setModoEdicion(null)}
            onGuardado={() => setModoEdicion(null)}
          />
        </div>
      );
    }

    return (
      <div
        key={pregunta.id}
        className={`flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-0 ${
          esSub ? "pl-8" : ""
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {esSub && <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
            <p className="truncate text-sm font-medium text-slate-900">{pregunta.texto}</p>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge variante="blue">{ETIQUETAS_TIPO_PREGUNTA[pregunta.tipo as TipoPregunta]}</Badge>
            {pregunta.validacion !== "NINGUNA" && (
              <Badge variante="slate">{ETIQUETAS_VALIDACION[pregunta.validacion as TipoValidacion]}</Badge>
            )}
            {pregunta.obligatoria ? (
              <Badge variante="amber">Obligatoria</Badge>
            ) : (
              <Badge variante="slate">Opcional</Badge>
            )}
            {pregunta.tipo === "SELECCION_MULTIPLE" && pregunta.opciones.length > 0 && (
              <>
                <Badge variante="green">{pregunta.opciones.length} opción(es)</Badge>
                <Badge variante="slate">
                  {ETIQUETAS_NATURALEZA_OPCIONES[pregunta.naturalezaOpciones as NaturalezaOpciones]}
                </Badge>
              </>
            )}
            {pregunta.generarSubPreguntasAuto !== "NINGUNA" && (
              <Badge variante="blue">
                Auto: {ETIQUETAS_GENERAR_SUBPREGUNTAS_AUTO[pregunta.generarSubPreguntasAuto as GenerarSubPreguntasAuto]}
              </Badge>
            )}
            {pregunta.saltarSiRespuesta && pregunta.saltarHastaPreguntaId && (
              <Badge variante="amber">
                Salta si &quot;{pregunta.saltarSiRespuesta}&quot; → {preguntaPorId.get(pregunta.saltarHastaPreguntaId)?.texto.slice(0, 30) ?? "?"}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => setModoEdicion(pregunta.id)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => eliminar(pregunta)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {modoEdicion !== "__nueva__" && (
          <Button onClick={() => setModoEdicion("__nueva__")}>
            <Plus className="h-4 w-4" />
            Nueva pregunta
          </Button>
        )}
      </div>

      {modoEdicion === "__nueva__" && (
        <PreguntaForm
          moduloId={moduloId}
          modulosDelEsquema={modulosDelEsquema}
          preguntasPrincipales={preguntasPrincipalesOpciones}
          onCancelar={() => setModoEdicion(null)}
          onGuardado={() => setModoEdicion(null)}
        />
      )}

      <Card>
        {preguntas.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Este módulo todavía no tiene preguntas.
          </p>
        ) : (
          <div>
            {principales.map((principal) => (
              <div key={principal.id}>
                {renderFila(principal, false)}
                {preguntas
                  .filter((p) => p.padreId === principal.id)
                  .map((sub) => renderFila(sub, true))}
              </div>
            ))}
            {/* Huérfanas: secundarias cuyo padre ya no existe o preguntas sin clase reconocida */}
            {preguntas
              .filter((p) => p.clase === "SECUNDARIA" && !principales.some((pr) => pr.id === p.padreId))
              .map((huerfana) => renderFila(huerfana, false))}
          </div>
        )}
      </Card>
    </div>
  );
}
