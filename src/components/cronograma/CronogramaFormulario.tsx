"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { diaDeFecha } from "@/lib/cronograma";
import type { CatalogosCronograma, VisitaProgramada } from "@/components/cronograma/tipos";

const CLASE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400";

function Campo({ etiqueta, children, ancho = false }: { etiqueta: string; children: React.ReactNode; ancho?: boolean }) {
  return (
    <div className={ancho ? "sm:col-span-2" : undefined}>
      <label className="mb-1 block text-sm font-medium text-slate-700">{etiqueta}</label>
      {children}
    </div>
  );
}

export function CronogramaFormulario({
  titulo,
  catalogos,
  valoresIniciales,
  onGuardar,
  onCancelar,
}: {
  titulo: string;
  catalogos: CatalogosCronograma;
  valoresIniciales?: VisitaProgramada;
  onGuardar: (datos: Record<string, string>) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const { lotes, zodes, municipios, instituciones, sedes, operadores, bodegas, esquemas, usuarios } = catalogos;
  const [loteId, setLoteId] = useState(valoresIniciales?.zode.loteId ?? "");
  const [zodeId, setZodeId] = useState(valoresIniciales?.zodeId ?? "");
  const [municipioId, setMunicipioId] = useState(valoresIniciales?.municipioId ?? "");
  const [institucionId, setInstitucionId] = useState(valoresIniciales?.institucionId ?? "");
  const [sedeId, setSedeId] = useState(valoresIniciales?.sedeId ?? "");
  const [operadorId, setOperadorId] = useState(valoresIniciales?.operadorId ?? "");
  const [bodegaId, setBodegaId] = useState(valoresIniciales?.bodegaId ?? "");
  const [esquemaId, setEsquemaId] = useState(valoresIniciales?.esquemaId ?? "");
  const [fechaProgramada, setFechaProgramada] = useState(valoresIniciales ? diaDeFecha(valoresIniciales.fechaProgramada) : "");
  const [fechaRealizacion, setFechaRealizacion] = useState(
    valoresIniciales?.fechaRealizacion ? diaDeFecha(valoresIniciales.fechaRealizacion) : ""
  );
  const [interventorId, setInterventorId] = useState(valoresIniciales?.interventorId ?? "");
  const [supervisorId, setSupervisorId] = useState(valoresIniciales?.supervisorId ?? "");
  const [observaciones, setObservaciones] = useState(valoresIniciales?.observaciones ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Cada lista muestra solo lo que pertenece a lo elegido arriba.
  const zodesFiltrados = loteId ? zodes.filter((z) => z.loteId === loteId) : zodes;
  const municipiosFiltrados = municipios.filter((m) => m.zodeId === zodeId);
  const institucionesFiltradas = instituciones.filter((i) => i.municipioId === municipioId);
  const sedesFiltradas = sedes.filter((s) => s.institucionId === institucionId);
  const operadoresFiltrados = operadores.filter((o) => o.zodeId === zodeId);
  const bodegasFiltradas = bodegas.filter((b) => b.operadorId === operadorId);

  function cambiarLote(valor: string) {
    setLoteId(valor);
    if (valor && zodes.find((z) => z.id === zodeId)?.loteId !== valor) cambiarZode("");
  }

  function cambiarZode(valor: string) {
    setZodeId(valor);
    setMunicipioId("");
    setInstitucionId("");
    setSedeId("");
    const delZode = operadores.filter((o) => o.zodeId === valor);
    setOperadorId(delZode.length === 1 ? delZode[0].id : "");
    setBodegaId("");
  }

  function cambiarMunicipio(valor: string) {
    setMunicipioId(valor);
    setInstitucionId("");
    setSedeId("");
  }

  function cambiarInstitucion(valor: string) {
    setInstitucionId(valor);
    setSedeId("");
  }

  function cambiarOperador(valor: string) {
    setOperadorId(valor);
    setBodegaId("");
  }

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (fechaRealizacion && fechaRealizacion < fechaProgramada && !confirm("La fecha de realización es anterior a la programada. ¿Guardar así?")) {
      return;
    }
    setGuardando(true);
    setError(null);
    const mensaje = await onGuardar({
      esquemaId,
      zodeId,
      municipioId,
      institucionId,
      sedeId,
      operadorId,
      bodegaId,
      fechaProgramada,
      fechaRealizacion,
      interventorId,
      supervisorId,
      observaciones,
    });
    setGuardando(false);
    if (mensaje) setError(mensaje);
  }

  const etiquetaUsuario = (u: { nombre: string; cargo: string | null }) => (u.cargo ? `${u.nombre} — ${u.cargo}` : u.nombre);

  return (
    <Card className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
        <button type="button" onClick={onCancelar} className="text-slate-400 hover:text-slate-600" title="Cerrar">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={enviar} className="space-y-5">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Lugar (Registro)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Lote">
              <select value={loteId} onChange={(e) => cambiarLote(e.target.value)} className={CLASE_CAMPO}>
                <option value="">Todos</option>
                {lotes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Zode *">
              <select value={zodeId} onChange={(e) => cambiarZode(e.target.value)} required className={CLASE_CAMPO}>
                <option value="">Selecciona...</option>
                {zodesFiltrados.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Municipio *">
              <select value={municipioId} onChange={(e) => cambiarMunicipio(e.target.value)} required disabled={!zodeId} className={CLASE_CAMPO}>
                <option value="">Selecciona...</option>
                {municipiosFiltrados.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Institución">
              <select value={institucionId} onChange={(e) => cambiarInstitucion(e.target.value)} disabled={!municipioId} className={CLASE_CAMPO}>
                <option value="">Ninguna</option>
                {institucionesFiltradas.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Sede" ancho>
              <select value={sedeId} onChange={(e) => setSedeId(e.target.value)} disabled={!institucionId} className={CLASE_CAMPO}>
                <option value="">Ninguna</option>
                {sedesFiltradas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Operador">
              <select value={operadorId} onChange={(e) => cambiarOperador(e.target.value)} disabled={!zodeId} className={CLASE_CAMPO}>
                <option value="">Ninguno</option>
                {operadoresFiltrados.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombreRazonSocial}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Bodega">
              <select value={bodegaId} onChange={(e) => setBodegaId(e.target.value)} disabled={!operadorId} className={CLASE_CAMPO}>
                <option value="">Ninguna</option>
                {bodegasFiltradas.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Visita</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Tipo de visita">
              <select value={esquemaId} onChange={(e) => setEsquemaId(e.target.value)} className={CLASE_CAMPO}>
                <option value="">Sin definir</option>
                {esquemas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <div className="hidden sm:block" />
            <Campo etiqueta="Fecha programada *">
              <input type="date" value={fechaProgramada} onChange={(e) => setFechaProgramada(e.target.value)} required className={CLASE_CAMPO} />
            </Campo>
            <Campo etiqueta="Fecha de realización">
              <input type="date" value={fechaRealizacion} onChange={(e) => setFechaRealizacion(e.target.value)} className={CLASE_CAMPO} />
            </Campo>
            <Campo etiqueta="Interventor asignado *">
              <select value={interventorId} onChange={(e) => setInterventorId(e.target.value)} required className={CLASE_CAMPO}>
                <option value="">Selecciona...</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {etiquetaUsuario(u)}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Supervisor *">
              <select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)} required className={CLASE_CAMPO}>
                <option value="">Selecciona...</option>
                {usuarios.map((u) => (
                  <option key={u.id} value={u.id}>
                    {etiquetaUsuario(u)}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Observaciones" ancho>
              <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} className={CLASE_CAMPO} />
            </Campo>
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
          <Button type="button" variante="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
