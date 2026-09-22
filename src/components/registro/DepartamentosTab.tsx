"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Departamento } from "@/components/registro/tipos";

function FilaDepartamento({ departamento }: { departamento: Departamento }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(departamento.nombre);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    setError(null);
    const respuesta = await fetch(`/api/registro/departamentos/${departamento.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      setError(datos.error ?? "No se pudo guardar.");
      setGuardando(false);
      return;
    }
    setGuardando(false);
    setEditando(false);
    router.refresh();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el departamento "${departamento.nombre}"?`)) return;
    const respuesta = await fetch(`/api/registro/departamentos/${departamento.id}`, { method: "DELETE" });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      alert(datos.error ?? "No se pudo eliminar.");
      return;
    }
    router.refresh();
  }

  if (editando) {
    return (
      <tr className="border-b border-slate-100 bg-slate-50 last:border-0">
        <td className="py-2 pr-4">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
        </td>
        <td className="py-2 pr-4" />
        <td className="py-2 pr-4">
          <div className="flex gap-2">
            <button onClick={guardar} disabled={guardando} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50">
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setEditando(false);
                setNombre(departamento.nombre);
                setError(null);
              }}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 pr-4 font-medium text-slate-900">{departamento.nombre}</td>
      <td className="py-3 pr-4">
        <Badge variante={departamento._count.lotes > 0 ? "green" : "slate"}>{departamento._count.lotes} lote(s)</Badge>
      </td>
      <td className="py-3 pr-4">
        <div className="flex gap-2">
          <button onClick={() => setEditando(true)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={eliminar} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function DepartamentosTab({ departamentos }: { departamentos: Departamento[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    const respuesta = await fetch("/api/registro/departamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      setError(datos.error ?? "No se pudo crear.");
      setGuardando(false);
      return;
    }
    setNombre("");
    setAbierto(false);
    setGuardando(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {abierto ? (
        <Card className="max-w-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Nuevo departamento</h2>
            <button onClick={() => setAbierto(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={crear} className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar departamento"}
            </Button>
          </form>
        </Card>
      ) : (
        <Button onClick={() => setAbierto(true)}>
          <Plus className="h-4 w-4" />
          Nuevo departamento
        </Button>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Lotes</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {departamentos.map((d) => (
                <FilaDepartamento key={d.id} departamento={d} />
              ))}
              {departamentos.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-sm text-slate-400">
                    No hay departamentos todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
