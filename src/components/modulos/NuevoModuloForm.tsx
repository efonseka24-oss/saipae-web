"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function NuevoModuloForm({ esquemaId }: { esquemaId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);

    const respuesta = await fetch(`/api/esquemas/${esquemaId}/modulos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, descripcion }),
    });

    if (!respuesta.ok) {
      const datos = await respuesta.json();
      setError(datos.error ?? "No se pudo crear el módulo.");
      setGuardando(false);
      return;
    }

    setNombre("");
    setDescripcion("");
    setAbierto(false);
    setGuardando(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <Button onClick={() => setAbierto(true)}>
        <Plus className="h-4 w-4" />
        Nuevo módulo
      </Button>
    );
  }

  return (
    <Card className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Nuevo módulo</h2>
        <button onClick={() => setAbierto(false)} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={crear} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Ej. Personal Manipulador de Alimentos"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Opcional"
          />
        </div>
        {error && <p className="sm:col-span-2 text-sm font-medium text-red-600">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar módulo"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
