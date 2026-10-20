"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Lote, Zode, Municipio, Institucion, Sede, EstudianteSimat } from "@/components/simat/tipos";

const CLASE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400";

export type DatosFormularioSimat = {
  idSimat: string;
  numeroDocumento: string;
  nombre: string;
  municipioId: string;
  institucionId: string;
  sedeId: string;
};

export function EstudianteSimatFormulario({
  titulo,
  lotes,
  zodes,
  municipios,
  instituciones,
  sedes,
  valoresIniciales,
  onGuardar,
  onCancelar,
}: {
  titulo: string;
  lotes: Lote[];
  zodes: Zode[];
  municipios: Municipio[];
  instituciones: Institucion[];
  sedes: Sede[];
  valoresIniciales?: EstudianteSimat;
  onGuardar: (datos: DatosFormularioSimat) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [idSimat, setIdSimat] = useState(valoresIniciales?.idSimat ?? "");
  const [numeroDocumento, setNumeroDocumento] = useState(valoresIniciales?.numeroDocumento ?? "");
  const [nombre, setNombre] = useState(valoresIniciales?.nombre ?? "");
  // El zode solo sirve para acotar los municipios: no se guarda (sale del municipio).
  const [zodeId, setZodeId] = useState(valoresIniciales?.municipio.zode.id ?? "");
  const [municipioId, setMunicipioId] = useState(valoresIniciales?.municipioId ?? "");
  const [institucionId, setInstitucionId] = useState(valoresIniciales?.institucionId ?? "");
  const [sedeId, setSedeId] = useState(valoresIniciales?.sedeId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const municipiosFiltrados = municipios.filter((m) => m.zodeId === zodeId);
  const institucionesFiltradas = instituciones.filter((i) => i.municipioId === municipioId);
  const sedesFiltradas = sedes.filter((s) => s.institucionId === institucionId);
  const loteDelZode = lotes.find((l) => l.id === zodes.find((z) => z.id === zodeId)?.loteId);

  async function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    const mensajeError = await onGuardar({ idSimat, numeroDocumento, nombre, municipioId, institucionId, sedeId });
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
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">ID SIMAT</label>
            <input value={idSimat} onChange={(e) => setIdSimat(e.target.value)} required className={CLASE_CAMPO} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Número de documento</label>
            <input value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} required className={CLASE_CAMPO} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required className={CLASE_CAMPO} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Zode</label>
            <select
              value={zodeId}
              onChange={(e) => {
                setZodeId(e.target.value);
                setMunicipioId("");
                setInstitucionId("");
                setSedeId("");
              }}
              required
              className={CLASE_CAMPO}
            >
              <option value="">Selecciona...</option>
              {zodes.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                </option>
              ))}
            </select>
            {loteDelZode && <p className="mt-1 text-xs text-slate-500">Lote: {loteDelZode.nombre}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Municipio</label>
            <select
              value={municipioId}
              onChange={(e) => {
                setMunicipioId(e.target.value);
                setInstitucionId("");
                setSedeId("");
              }}
              required
              disabled={!zodeId}
              className={CLASE_CAMPO}
            >
              <option value="">Selecciona...</option>
              {municipiosFiltrados.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Institución</label>
            <select
              value={institucionId}
              onChange={(e) => {
                setInstitucionId(e.target.value);
                setSedeId("");
              }}
              required
              disabled={!municipioId}
              className={CLASE_CAMPO}
            >
              <option value="">Selecciona...</option>
              {institucionesFiltradas.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre} ({i.numeroDane})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Sede</label>
            <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} required disabled={!institucionId} className={CLASE_CAMPO}>
              <option value="">Selecciona...</option>
              {sedesFiltradas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre} ({s.numeroDane})
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </Card>
  );
}
