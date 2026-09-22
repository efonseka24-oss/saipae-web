"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Sede, Institucion } from "@/components/registro/tipos";
import { SelectorTiposRacion } from "@/components/registro/SelectorTiposRacion";
import { parsearTiposRacion, ETIQUETAS_TIPO_RACION_PAE, type TipoRacionPae } from "@/lib/racionesPae";
import { FiltroUbicacion, FILTRO_UBICACION_VACIO, type ValorFiltroUbicacion, type ItemLote, type ItemZode, type ItemMunicipio } from "@/components/shared/FiltroUbicacion";

function SelectInstitucion({
  value,
  onChange,
  instituciones,
}: {
  value: string;
  onChange: (v: string) => void;
  instituciones: Institucion[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">Selecciona...</option>
      {instituciones.map((i) => (
        <option key={i.id} value={i.id}>
          {i.nombre} — {i.municipio.nombre}
        </option>
      ))}
    </select>
  );
}

function FilaSede({ sede, instituciones }: { sede: Sede; instituciones: Institucion[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [numeroDane, setNumeroDane] = useState(sede.numeroDane);
  const [nombre, setNombre] = useState(sede.nombre);
  const [institucionId, setInstitucionId] = useState(sede.institucionId);
  const [habilitadaPae, setHabilitadaPae] = useState(sede.habilitadaPae);
  const [tiposRacion, setTiposRacion] = useState<string[]>(() => parsearTiposRacion(sede.tiposRacion));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    setError(null);
    const respuesta = await fetch(`/api/registro/sedes/${sede.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numeroDane, nombre, institucionId, habilitadaPae, tiposRacion }),
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
    if (!confirm(`¿Eliminar la sede "${sede.nombre}"?`)) return;
    const respuesta = await fetch(`/api/registro/sedes/${sede.id}`, { method: "DELETE" });
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
            value={numeroDane}
            onChange={(e) => setNumeroDane(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="py-2 pr-4">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="py-2 pr-4">
          <SelectInstitucion value={institucionId} onChange={setInstitucionId} instituciones={instituciones} />
        </td>
        <td className="py-2 pr-4" />
        <td className="py-2 pr-4" />
        <td className="py-2 pr-4 align-top">
          <label className="flex items-center gap-1.5 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={habilitadaPae}
              onChange={(e) => setHabilitadaPae(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Habilitada
          </label>
        </td>
        <td className="py-2 pr-4 align-top">
          <SelectorTiposRacion value={tiposRacion} onChange={setTiposRacion} />
        </td>
        <td className="py-2 pr-4">
          {error && <p className="mb-1 text-xs font-medium text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={guardar} disabled={guardando} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50">
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setEditando(false);
                setNumeroDane(sede.numeroDane);
                setNombre(sede.nombre);
                setInstitucionId(sede.institucionId);
                setHabilitadaPae(sede.habilitadaPae);
                setTiposRacion(parsearTiposRacion(sede.tiposRacion));
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
      <td className="py-3 pr-4 font-mono text-xs text-slate-600">{sede.numeroDane}</td>
      <td className="py-3 pr-4 font-medium text-slate-900">{sede.nombre}</td>
      <td className="py-3 pr-4 text-slate-600">{sede.institucion.nombre}</td>
      <td className="py-3 pr-4 text-slate-600">
        {sede.institucion.municipio.nombre} — {sede.institucion.municipio.zode.nombre}
      </td>
      <td className="py-3 pr-4">
        <Badge variante="blue">{sede.institucion.municipio.zode.lote.nombre}</Badge>
      </td>
      <td className="py-3 pr-4">
        <Badge variante={sede.habilitadaPae ? "green" : "slate"}>{sede.habilitadaPae ? "Habilitada" : "No habilitada"}</Badge>
      </td>
      <td className="py-3 pr-4">
        <div className="flex flex-wrap gap-1">
          {parsearTiposRacion(sede.tiposRacion).map((t) => (
            <Badge key={t} variante="blue">
              {ETIQUETAS_TIPO_RACION_PAE[t as TipoRacionPae]}
            </Badge>
          ))}
          {parsearTiposRacion(sede.tiposRacion).length === 0 && <span className="text-xs text-slate-400">—</span>}
        </div>
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

export function SedesTab({
  sedes,
  instituciones,
  lotes,
  zodes,
  municipios,
}: {
  sedes: Sede[];
  instituciones: Institucion[];
  lotes: ItemLote[];
  zodes: ItemZode[];
  municipios: ItemMunicipio[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [numeroDane, setNumeroDane] = useState("");
  const [nombre, setNombre] = useState("");
  const [institucionId, setInstitucionId] = useState("");
  const [filtro, setFiltro] = useState<ValorFiltroUbicacion>(FILTRO_UBICACION_VACIO);

  const sedesFiltradas = sedes.filter(
    (s) =>
      (!filtro.loteId || s.institucion.municipio.zode.lote.id === filtro.loteId) &&
      (!filtro.zodeId || s.institucion.municipio.zode.id === filtro.zodeId) &&
      (!filtro.municipioId || s.institucion.municipio.id === filtro.municipioId) &&
      (!filtro.institucionId || s.institucionId === filtro.institucionId)
  );
  const [habilitadaPae, setHabilitadaPae] = useState(true);
  const [tiposRacion, setTiposRacion] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    const respuesta = await fetch("/api/registro/sedes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numeroDane, nombre, institucionId, habilitadaPae, tiposRacion }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      setError(datos.error ?? "No se pudo crear.");
      setGuardando(false);
      return;
    }
    setNumeroDane("");
    setNombre("");
    setInstitucionId("");
    setHabilitadaPae(true);
    setTiposRacion([]);
    setAbierto(false);
    setGuardando(false);
    router.refresh();
  }

  if (instituciones.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">Primero crea al menos una institución.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {abierto ? (
        <Card className="max-w-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Nueva sede</h2>
            <button onClick={() => setAbierto(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={crear} className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Número DANE</label>
              <input
                value={numeroDane}
                onChange={(e) => setNumeroDane(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre de la sede</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Institución</label>
              <SelectInstitucion value={institucionId} onChange={setInstitucionId} instituciones={instituciones} />
              <p className="mt-1 text-xs text-slate-500">
                Municipio, zode, lote y departamento se asignan automáticamente según la institución.
              </p>
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={habilitadaPae}
                  onChange={(e) => setHabilitadaPae(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Habilitada para PAE
              </label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tipo(s) de ración</label>
              <SelectorTiposRacion value={tiposRacion} onChange={setTiposRacion} />
            </div>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar sede"}
            </Button>
          </form>
        </Card>
      ) : (
        <Button onClick={() => setAbierto(true)}>
          <Plus className="h-4 w-4" />
          Nueva sede
        </Button>
      )}

      <Card>
        <FiltroUbicacion lotes={lotes} zodes={zodes} municipios={municipios} instituciones={instituciones} value={filtro} onChange={setFiltro} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">DANE</th>
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Institución</th>
                <th className="py-2 pr-4">Municipio / Zode</th>
                <th className="py-2 pr-4">Lote</th>
                <th className="py-2 pr-4">PAE</th>
                <th className="py-2 pr-4">Raciones</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sedesFiltradas.map((s) => (
                <FilaSede key={s.id} sede={s} instituciones={instituciones} />
              ))}
              {sedesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-slate-400">
                    {sedes.length === 0 ? "No hay sedes todavía." : "Ninguna sede coincide con el filtro."}
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
