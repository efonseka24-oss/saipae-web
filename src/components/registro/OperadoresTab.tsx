"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Operador, Zode } from "@/components/registro/tipos";

function SelectZode({ value, onChange, zodes }: { value: string; onChange: (v: string) => void; zodes: Zode[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">Selecciona...</option>
      {zodes.map((z) => (
        <option key={z.id} value={z.id}>
          {z.nombre} — {z.lote.nombre} / {z.lote.departamento.nombre}
        </option>
      ))}
    </select>
  );
}

function FilaOperador({ operador, zodes }: { operador: Operador; zodes: Zode[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [nit, setNit] = useState(operador.nit);
  const [nombreRazonSocial, setNombreRazonSocial] = useState(operador.nombreRazonSocial);
  const [zodeId, setZodeId] = useState(operador.zodeId);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    setError(null);
    const respuesta = await fetch(`/api/registro/operadores/${operador.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nit, nombreRazonSocial, zodeId }),
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
    if (!confirm(`¿Eliminar el operador "${operador.nombreRazonSocial}"?`)) return;
    const respuesta = await fetch(`/api/registro/operadores/${operador.id}`, { method: "DELETE" });
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
            value={nit}
            onChange={(e) => setNit(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="py-2 pr-4">
          <input
            value={nombreRazonSocial}
            onChange={(e) => setNombreRazonSocial(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="py-2 pr-4">
          <SelectZode value={zodeId} onChange={setZodeId} zodes={zodes} />
        </td>
        <td className="py-2 pr-4" />
        <td className="py-2 pr-4" />
        <td className="py-2 pr-4">
          {error && <p className="mb-1 text-xs font-medium text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={guardar} disabled={guardando} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50">
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setEditando(false);
                setNit(operador.nit);
                setNombreRazonSocial(operador.nombreRazonSocial);
                setZodeId(operador.zodeId);
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
      <td className="py-3 pr-4 font-mono text-xs text-slate-600">{operador.nit}</td>
      <td className="py-3 pr-4 font-medium text-slate-900">{operador.nombreRazonSocial}</td>
      <td className="py-3 pr-4 text-slate-600">{operador.zode.nombre}</td>
      <td className="py-3 pr-4">
        <Badge variante="blue">{operador.zode.lote.nombre}</Badge>{" "}
        <span className="text-xs text-slate-400">({operador.zode.lote.departamento.nombre})</span>
      </td>
      <td className="py-3 pr-4">
        <Badge variante={operador._count.bodegas > 0 ? "green" : "slate"}>{operador._count.bodegas} bodega(s)</Badge>
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

export function OperadoresTab({ operadores, zodes }: { operadores: Operador[]; zodes: Zode[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nit, setNit] = useState("");
  const [nombreRazonSocial, setNombreRazonSocial] = useState("");
  const [zodeId, setZodeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    const respuesta = await fetch("/api/registro/operadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nit, nombreRazonSocial, zodeId }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      setError(datos.error ?? "No se pudo crear.");
      setGuardando(false);
      return;
    }
    setNit("");
    setNombreRazonSocial("");
    setZodeId("");
    setAbierto(false);
    setGuardando(false);
    router.refresh();
  }

  if (zodes.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">Primero crea al menos un zode.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {abierto ? (
        <Card className="max-w-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Nuevo operador</h2>
            <button onClick={() => setAbierto(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={crear} className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">NIT</label>
              <input
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre o razón social</label>
              <input
                value={nombreRazonSocial}
                onChange={(e) => setNombreRazonSocial(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Zode</label>
              <SelectZode value={zodeId} onChange={setZodeId} zodes={zodes} />
              <p className="mt-1 text-xs text-slate-500">El lote y el departamento se asignan automáticamente según el zode.</p>
            </div>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar operador"}
            </Button>
          </form>
        </Card>
      ) : (
        <Button onClick={() => setAbierto(true)}>
          <Plus className="h-4 w-4" />
          Nuevo operador
        </Button>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">NIT</th>
                <th className="py-2 pr-4">Nombre / Razón social</th>
                <th className="py-2 pr-4">Zode</th>
                <th className="py-2 pr-4">Lote / Depto</th>
                <th className="py-2 pr-4">Bodegas</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {operadores.map((o) => (
                <FilaOperador key={o.id} operador={o} zodes={zodes} />
              ))}
              {operadores.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                    No hay operadores todavía.
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
