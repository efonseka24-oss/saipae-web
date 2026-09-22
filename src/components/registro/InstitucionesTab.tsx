"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { Institucion, Municipio } from "@/components/registro/tipos";
import { SelectorTiposRacion } from "@/components/registro/SelectorTiposRacion";
import { parsearTiposRacion, ETIQUETAS_TIPO_RACION_PAE, type TipoRacionPae } from "@/lib/racionesPae";
import { FiltroUbicacion, FILTRO_UBICACION_VACIO, type ValorFiltroUbicacion, type ItemLote, type ItemZode } from "@/components/shared/FiltroUbicacion";

function SelectMunicipio({
  value,
  onChange,
  municipios,
}: {
  value: string;
  onChange: (v: string) => void;
  municipios: Municipio[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">Selecciona...</option>
      {municipios.map((m) => (
        <option key={m.id} value={m.id}>
          {m.nombre} — {m.zode.nombre} / {m.zode.lote.nombre}
        </option>
      ))}
    </select>
  );
}

function FilaInstitucion({ institucion, municipios }: { institucion: Institucion; municipios: Municipio[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [numeroDane, setNumeroDane] = useState(institucion.numeroDane);
  const [nombre, setNombre] = useState(institucion.nombre);
  const [municipioId, setMunicipioId] = useState(institucion.municipioId);
  const [habilitadaPae, setHabilitadaPae] = useState(institucion.habilitadaPae);
  const [tiposRacion, setTiposRacion] = useState<string[]>(() => parsearTiposRacion(institucion.tiposRacion));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    setError(null);
    const respuesta = await fetch(`/api/registro/instituciones/${institucion.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numeroDane, nombre, municipioId, habilitadaPae, tiposRacion }),
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
    if (!confirm(`¿Eliminar la institución "${institucion.nombre}"?`)) return;
    const respuesta = await fetch(`/api/registro/instituciones/${institucion.id}`, { method: "DELETE" });
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
          <SelectMunicipio value={municipioId} onChange={setMunicipioId} municipios={municipios} />
        </td>
        <td className="py-2 pr-4" />
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
                setNumeroDane(institucion.numeroDane);
                setNombre(institucion.nombre);
                setMunicipioId(institucion.municipioId);
                setHabilitadaPae(institucion.habilitadaPae);
                setTiposRacion(parsearTiposRacion(institucion.tiposRacion));
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
      <td className="py-3 pr-4 font-mono text-xs text-slate-600">{institucion.numeroDane}</td>
      <td className="py-3 pr-4 font-medium text-slate-900">{institucion.nombre}</td>
      <td className="py-3 pr-4 text-slate-600">{institucion.municipio.nombre}</td>
      <td className="py-3 pr-4 text-slate-500">{institucion.municipio.zode.nombre}</td>
      <td className="py-3 pr-4">
        <Badge variante="blue">{institucion.municipio.zode.lote.nombre}</Badge>
      </td>
      <td className="py-3 pr-4">
        <Badge variante={institucion._count.sedes > 0 ? "green" : "slate"}>{institucion._count.sedes} sede(s)</Badge>
      </td>
      <td className="py-3 pr-4">
        <Badge variante={institucion.habilitadaPae ? "green" : "slate"}>{institucion.habilitadaPae ? "Habilitada" : "No habilitada"}</Badge>
      </td>
      <td className="py-3 pr-4">
        <div className="flex flex-wrap gap-1">
          {parsearTiposRacion(institucion.tiposRacion).map((t) => (
            <Badge key={t} variante="blue">
              {ETIQUETAS_TIPO_RACION_PAE[t as TipoRacionPae]}
            </Badge>
          ))}
          {parsearTiposRacion(institucion.tiposRacion).length === 0 && <span className="text-xs text-slate-400">—</span>}
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

export function InstitucionesTab({
  instituciones,
  municipios,
  lotes,
  zodes,
}: {
  instituciones: Institucion[];
  municipios: Municipio[];
  lotes: ItemLote[];
  zodes: ItemZode[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [numeroDane, setNumeroDane] = useState("");
  const [nombre, setNombre] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [habilitadaPae, setHabilitadaPae] = useState(true);
  const [tiposRacion, setTiposRacion] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState<ValorFiltroUbicacion>(FILTRO_UBICACION_VACIO);

  const institucionesFiltradas = instituciones.filter(
    (i) =>
      (!filtro.loteId || i.municipio.zode.lote.id === filtro.loteId) &&
      (!filtro.zodeId || i.municipio.zode.id === filtro.zodeId) &&
      (!filtro.municipioId || i.municipioId === filtro.municipioId)
  );

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    const respuesta = await fetch("/api/registro/instituciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numeroDane, nombre, municipioId, habilitadaPae, tiposRacion }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      setError(datos.error ?? "No se pudo crear.");
      setGuardando(false);
      return;
    }
    setNumeroDane("");
    setNombre("");
    setMunicipioId("");
    setHabilitadaPae(true);
    setTiposRacion([]);
    setAbierto(false);
    setGuardando(false);
    router.refresh();
  }

  if (municipios.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">Primero crea al menos un municipio.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {abierto ? (
        <Card className="max-w-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Nueva institución</h2>
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Municipio</label>
              <SelectMunicipio value={municipioId} onChange={setMunicipioId} municipios={municipios} />
              <p className="mt-1 text-xs text-slate-500">El zode, el lote y el departamento se asignan automáticamente.</p>
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
              {guardando ? "Guardando..." : "Guardar institución"}
            </Button>
          </form>
        </Card>
      ) : (
        <Button onClick={() => setAbierto(true)}>
          <Plus className="h-4 w-4" />
          Nueva institución
        </Button>
      )}

      <Card>
        <FiltroUbicacion lotes={lotes} zodes={zodes} municipios={municipios} value={filtro} onChange={setFiltro} mostrarInstitucion={false} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">DANE</th>
                <th className="py-2 pr-4">Nombre</th>
                <th className="py-2 pr-4">Municipio</th>
                <th className="py-2 pr-4">Zode</th>
                <th className="py-2 pr-4">Lote</th>
                <th className="py-2 pr-4">Sedes</th>
                <th className="py-2 pr-4">PAE</th>
                <th className="py-2 pr-4">Raciones</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {institucionesFiltradas.map((i) => (
                <FilaInstitucion key={i.id} institucion={i} municipios={municipios} />
              ))}
              {institucionesFiltradas.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-slate-400">
                    {instituciones.length === 0 ? "No hay instituciones todavía." : "Ninguna institución coincide con el filtro."}
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
