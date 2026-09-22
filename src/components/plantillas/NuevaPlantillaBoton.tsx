"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TIPOS_PLANTILLA, ETIQUETAS_TIPO_PLANTILLA, type TipoPlantilla } from "@/lib/plantillaPreguntas";

type Esquema = { id: string; nombre: string };

export function NuevaPlantillaBoton({ esquemas }: { esquemas: Esquema[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoPlantilla>("VISITA");
  const [esquemaIds, setEsquemaIds] = useState<string[]>([]);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function alternarEsquema(id: string) {
    setEsquemaIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    if (!nombre.trim()) {
      setError("Ponle un nombre a la plantilla.");
      return;
    }
    setCreando(true);
    setError(null);
    const respuesta = await fetch("/api/plantillas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim(), tipo, esquemaIds }),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      setError(datos.error ?? "No se pudo crear la plantilla.");
      setCreando(false);
      return;
    }
    router.push(`/plantillas/${datos.id}`);
  }

  return (
    <div className="relative">
      <Button onClick={() => setAbierto(true)}>
        <Plus className="h-4 w-4" />
        Nueva plantilla
      </Button>

      {abierto && (
        <Card className="absolute right-0 top-full z-10 mt-2 w-96 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Nueva plantilla</h3>
            <button onClick={() => setAbierto(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={crear} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
              <input
                autoFocus
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Plantilla Encuestas"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoPlantilla)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {TIPOS_PLANTILLA.map((t) => (
                  <option key={t} value={t}>
                    {ETIQUETAS_TIPO_PLANTILLA[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Esquemas (opcional, se puede cambiar después)
              </label>
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                {esquemas.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={esquemaIds.includes(e.id)}
                      onChange={() => alternarEsquema(e.id)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {e.nombre}
                  </label>
                ))}
                {esquemas.length === 0 && <p className="text-xs text-slate-400">No hay esquemas todavía.</p>}
              </div>
            </div>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" disabled={creando} className="w-full justify-center">
              {creando ? "Creando..." : "Crear plantilla"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
