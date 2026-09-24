"use client";

import { ChevronUp, ChevronDown } from "lucide-react";

// Botones subir/bajar del panel (módulos y preguntas). Solo cambian el orden
// en que se ven en el panel e informes, no el orden de la encuesta en la app.
export function BotonesMover({
  onMover,
  esPrimero,
  esUltimo,
  ocupado,
}: {
  onMover: (direccion: "arriba" | "abajo") => void;
  esPrimero: boolean;
  esUltimo: boolean;
  ocupado?: boolean;
}) {
  const clase =
    "rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-30";
  return (
    <div className="flex flex-col">
      <button type="button" onClick={() => onMover("arriba")} disabled={esPrimero || ocupado} className={clase} title="Subir">
        <ChevronUp className="h-4 w-4" />
      </button>
      <button type="button" onClick={() => onMover("abajo")} disabled={esUltimo || ocupado} className={clase} title="Bajar">
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}
