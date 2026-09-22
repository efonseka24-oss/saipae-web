"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function RespuestaFormulario({
  titulo,
  valorInicial,
  onGuardar,
  onCancelar,
}: {
  titulo: string;
  valorInicial?: string;
  onGuardar: (texto: string) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [texto, setTexto] = useState(valorInicial ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    const mensajeError = await onGuardar(texto);
    setGuardando(false);
    if (mensajeError) setError(mensajeError);
  }

  return (
    <Card className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
        <button onClick={onCancelar} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={manejarEnvio} className="grid gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Texto de la respuesta</label>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            required
            rows={10}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Escribe el cuerpo de la carta. Cada línea se imprime como un párrafo aparte."
          />
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" disabled={guardando}>
          {guardando ? "Generando documento..." : "Guardar y generar documento"}
        </Button>
      </form>
    </Card>
  );
}
