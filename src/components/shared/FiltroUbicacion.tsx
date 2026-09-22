"use client";

import { X } from "lucide-react";

export type ItemLote = { id: string; nombre: string };
export type ItemZode = { id: string; nombre: string; loteId: string };
export type ItemMunicipio = { id: string; nombre: string; zodeId: string };
export type ItemInstitucion = { id: string; nombre: string; municipioId: string };

export type ValorFiltroUbicacion = { loteId: string; zodeId: string; municipioId: string; institucionId: string };

export const FILTRO_UBICACION_VACIO: ValorFiltroUbicacion = { loteId: "", zodeId: "", municipioId: "", institucionId: "" };

export function filtroUbicacionActivo(valor: ValorFiltroUbicacion): boolean {
  return Boolean(valor.loteId || valor.zodeId || valor.municipioId || valor.institucionId);
}

const CLASE_CAMPO =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

// Buscador en cascada por Lote → Zode → Municipio → Institución, reutilizado
// en las pantallas de actividad (Tabulación, Generar Formatos, CAES,
// Laboratorios) y en Registro (Instituciones/Sedes). Cada pantalla filtra su
// propia lista con el valor que expone (por id o, si sus filas solo guardan
// texto plano, comparando nombres).
export function FiltroUbicacion({
  lotes,
  zodes,
  municipios,
  instituciones,
  value,
  onChange,
  mostrarInstitucion = true,
}: {
  lotes: ItemLote[];
  zodes: ItemZode[];
  municipios: ItemMunicipio[];
  instituciones?: ItemInstitucion[];
  value: ValorFiltroUbicacion;
  onChange: (valor: ValorFiltroUbicacion) => void;
  mostrarInstitucion?: boolean;
}) {
  const zodesFiltrados = value.loteId ? zodes.filter((z) => z.loteId === value.loteId) : zodes;
  const municipiosFiltrados = value.zodeId ? municipios.filter((m) => m.zodeId === value.zodeId) : municipios;
  const institucionesFiltradas =
    mostrarInstitucion && instituciones ? (value.municipioId ? instituciones.filter((i) => i.municipioId === value.municipioId) : instituciones) : [];

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Lote</label>
        <select
          value={value.loteId}
          onChange={(e) => onChange({ loteId: e.target.value, zodeId: "", municipioId: "", institucionId: "" })}
          className={CLASE_CAMPO}
        >
          <option value="">Todos</option>
          {lotes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Zode</label>
        <select
          value={value.zodeId}
          onChange={(e) => onChange({ ...value, zodeId: e.target.value, municipioId: "", institucionId: "" })}
          className={CLASE_CAMPO}
        >
          <option value="">Todos</option>
          {zodesFiltrados.map((z) => (
            <option key={z.id} value={z.id}>
              {z.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-500">Municipio</label>
        <select
          value={value.municipioId}
          onChange={(e) => onChange({ ...value, municipioId: e.target.value, institucionId: "" })}
          className={CLASE_CAMPO}
        >
          <option value="">Todos</option>
          {municipiosFiltrados.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>
      {mostrarInstitucion && (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Institución</label>
          <select value={value.institucionId} onChange={(e) => onChange({ ...value, institucionId: e.target.value })} className={CLASE_CAMPO}>
            <option value="">Todas</option>
            {institucionesFiltradas.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre}
              </option>
            ))}
          </select>
        </div>
      )}
      {filtroUbicacionActivo(value) && (
        <button
          type="button"
          onClick={() => onChange(FILTRO_UBICACION_VACIO)}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" /> Limpiar filtros
        </button>
      )}
    </div>
  );
}
