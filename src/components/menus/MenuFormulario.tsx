"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ETIQUETA_ESPECIAL_ETNICO,
  MAXIMO_DETALLES_MENU,
  TIPOS_ALIMENTO,
  UNIDADES_MENU,
  type DetalleMenuEntrada,
} from "@/lib/menus";
import type { LoteMenu, MenuPae } from "@/components/menus/tipos";

const CLASE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

const FILA_VACIA: DetalleMenuEntrada = { tipoAlimento: "", nombreAlimento: "", unidad: "g", cantidad: "" };

export type DatosFormularioMenu = {
  numero: string;
  loteId: string;
  especialEtnico: boolean;
  detalles: DetalleMenuEntrada[];
};

export function MenuFormulario({
  titulo,
  lotes,
  valoresIniciales,
  onGuardar,
  onCancelar,
}: {
  titulo: string;
  lotes: LoteMenu[];
  valoresIniciales?: MenuPae;
  onGuardar: (datos: DatosFormularioMenu) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [numero, setNumero] = useState(valoresIniciales ? String(valoresIniciales.numero) : "");
  const [loteId, setLoteId] = useState(valoresIniciales?.loteId ?? "");
  const [especialEtnico, setEspecialEtnico] = useState(valoresIniciales?.especialEtnico ?? false);
  const [detalles, setDetalles] = useState<DetalleMenuEntrada[]>(() =>
    valoresIniciales?.detalles.length
      ? valoresIniciales.detalles.map((d) => ({
          tipoAlimento: d.tipoAlimento,
          nombreAlimento: d.nombreAlimento,
          unidad: d.unidad,
          cantidad: String(d.cantidad).replace(".", ","),
        }))
      : [{ ...FILA_VACIA }]
  );
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function actualizarDetalle(indice: number, campo: keyof DetalleMenuEntrada, valor: string) {
    setDetalles((anterior) => anterior.map((fila, i) => (i === indice ? { ...fila, [campo]: valor } : fila)));
  }

  async function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    const mensajeError = await onGuardar({ numero, loteId, especialEtnico, detalles });
    setGuardando(false);
    if (mensajeError) setError(mensajeError);
  }

  return (
    <Card className="max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
        <button onClick={onCancelar} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={manejarEnvio} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Número de menú</label>
            <input type="number" min={1} step={1} value={numero} onChange={(e) => setNumero(e.target.value)} required className={CLASE_CAMPO} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Lote</label>
            <select value={loteId} onChange={(e) => setLoteId(e.target.value)} required className={CLASE_CAMPO}>
              <option value="">Selecciona...</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre} ({l.departamento.nombre})
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={especialEtnico}
              onChange={(e) => setEspecialEtnico(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            {ETIQUETA_ESPECIAL_ETNICO}
          </label>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Alimentos del menú</label>
          <datalist id="tipos-alimento">
            {TIPOS_ALIMENTO.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-56 px-2 py-2">Tipo de alimento</th>
                  <th className="px-2 py-2">Nombre del alimento</th>
                  <th className="w-36 px-2 py-2">Unidad de medida</th>
                  <th className="w-28 px-2 py-2">Cantidad</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {detalles.map((d, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-2 py-1.5">
                      <input
                        list="tipos-alimento"
                        value={d.tipoAlimento}
                        onChange={(e) => actualizarDetalle(i, "tipoAlimento", e.target.value)}
                        placeholder="Ej. Proteico"
                        className={CLASE_CAMPO}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={d.nombreAlimento}
                        onChange={(e) => actualizarDetalle(i, "nombreAlimento", e.target.value)}
                        placeholder="Ej. Carne de res"
                        className={CLASE_CAMPO}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={d.unidad} onChange={(e) => actualizarDetalle(i, "unidad", e.target.value)} className={CLASE_CAMPO}>
                        {UNIDADES_MENU.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={d.cantidad} onChange={(e) => actualizarDetalle(i, "cantidad", e.target.value)} inputMode="decimal" className={CLASE_CAMPO} />
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => setDetalles((anterior) => (anterior.length > 1 ? anterior.filter((_, j) => j !== i) : [{ ...FILA_VACIA }]))}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detalles.length < MAXIMO_DETALLES_MENU && (
              <div className="border-t border-slate-200 bg-slate-50 px-2 py-2">
                <button
                  type="button"
                  onClick={() => setDetalles((anterior) => [...anterior, { ...FILA_VACIA }])}
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Plus className="h-4 w-4" /> Agregar alimento
                </button>
              </div>
            )}
          </div>
        </div>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar menú"}
        </Button>
      </form>
    </Card>
  );
}
