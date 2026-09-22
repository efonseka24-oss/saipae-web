"use client";

import type { PlantillaConfig, ColoresPlantilla, MargenesPlantilla } from "@/lib/plantillaConfig";

function MargenField({
  etiqueta,
  valor,
  onCambiar,
}: {
  etiqueta: string;
  valor: number;
  onCambiar: (valor: number) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
      {etiqueta}
      <input
        type="number"
        min={0}
        step={0.1}
        value={valor}
        onChange={(e) => {
          const numero = Number(e.target.value);
          if (Number.isFinite(numero) && numero >= 0) onCambiar(numero);
        }}
        className="w-16 rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      cm
    </label>
  );
}

function ColorField({
  etiqueta,
  valor,
  onCambiar,
}: {
  etiqueta: string;
  valor: string;
  onCambiar: (valor: string) => void;
}) {
  const hex = `#${valor.replace(/^#/, "")}`;
  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
      <input
        type="color"
        value={hex}
        onChange={(e) => onCambiar(e.target.value.replace(/^#/, "").toUpperCase())}
        className="h-7 w-9 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
      />
      {etiqueta}
    </label>
  );
}

// Colores y márgenes son GLOBALES a la plantilla (se aplican igual sin
// importar a cuál de sus esquemas vinculados corresponda el documento).
export function EstiloPlantilla({
  config,
  onCambiar,
}: {
  config: PlantillaConfig;
  onCambiar: (config: PlantillaConfig) => void;
}) {
  function cambiarColor(campo: keyof ColoresPlantilla, valor: string) {
    onCambiar({ ...config, colores: { ...config.colores, [campo]: valor } });
  }

  function cambiarMargen(campo: keyof MargenesPlantilla, valor: number) {
    onCambiar({ ...config, margenes: { ...config.margenes, [campo]: valor } });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Colores</span>
        <ColorField etiqueta="Título de módulo" valor={config.colores.encabezadoModulo} onCambiar={(v) => cambiarColor("encabezadoModulo", v)} />
        <ColorField etiqueta="Encabezado de tabla" valor={config.colores.encabezadoTabla} onCambiar={(v) => cambiarColor("encabezadoTabla", v)} />
        <ColorField etiqueta="Fila de totales" valor={config.colores.filaTotales} onCambiar={(v) => cambiarColor("filaTotales", v)} />
        <ColorField etiqueta="Etiquetas (datos generales)" valor={config.colores.etiquetaDatosGenerales} onCambiar={(v) => cambiarColor("etiquetaDatosGenerales", v)} />
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Márgenes de página</span>
        <MargenField etiqueta="Superior" valor={config.margenes.superior} onCambiar={(v) => cambiarMargen("superior", v)} />
        <MargenField etiqueta="Inferior" valor={config.margenes.inferior} onCambiar={(v) => cambiarMargen("inferior", v)} />
        <MargenField etiqueta="Izquierdo" valor={config.margenes.izquierdo} onCambiar={(v) => cambiarMargen("izquierdo", v)} />
        <MargenField etiqueta="Derecho" valor={config.margenes.derecho} onCambiar={(v) => cambiarMargen("derecho", v)} />
      </div>
    </div>
  );
}
