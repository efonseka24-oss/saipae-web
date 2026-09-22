"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Esquema = { id: string; nombre: string };

type Operador = {
  id: string;
  nit: string;
  nombreRazonSocial: string;
  zodeId: string;
  zode: { id: string; nombre: string; lote: { id: string; nombre: string; departamento: { nombre: string } } };
};

type Municipio = { id: string; nombre: string; zodeId: string };

type Institucion = { id: string; nombre: string; numeroDane: string; municipioId: string };

type Sede = { id: string; nombre: string; numeroDane: string; institucionId: string };

export function NuevaVisitaForm({
  esquemas,
  operadores,
  municipios,
  instituciones,
  sedes,
  mensajeSinEsquemas = "Todavía no hay esquemas disponibles.",
}: {
  esquemas: Esquema[];
  operadores: Operador[];
  municipios: Municipio[];
  instituciones: Institucion[];
  sedes: Sede[];
  mensajeSinEsquemas?: string;
}) {
  const router = useRouter();
  const [esquemaId, setEsquemaId] = useState(esquemas[0]?.id ?? "");
  const [fecha, setFecha] = useState("");
  const [operadorId, setOperadorId] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [institucionId, setInstitucionId] = useState("");
  const [sedeId, setSedeId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const operadorSeleccionado = useMemo(() => operadores.find((o) => o.id === operadorId), [operadores, operadorId]);

  const municipiosDisponibles = useMemo(
    () => (operadorSeleccionado ? municipios.filter((m) => m.zodeId === operadorSeleccionado.zodeId) : []),
    [municipios, operadorSeleccionado]
  );
  const municipioSeleccionado = useMemo(
    () => municipiosDisponibles.find((m) => m.id === municipioId),
    [municipiosDisponibles, municipioId]
  );

  const institucionesDisponibles = useMemo(
    () => (municipioSeleccionado ? instituciones.filter((i) => i.municipioId === municipioSeleccionado.id) : []),
    [instituciones, municipioSeleccionado]
  );
  const institucionSeleccionada = useMemo(
    () => institucionesDisponibles.find((i) => i.id === institucionId),
    [institucionesDisponibles, institucionId]
  );

  const sedesDisponibles = useMemo(
    () => (institucionSeleccionada ? sedes.filter((s) => s.institucionId === institucionSeleccionada.id) : []),
    [sedes, institucionSeleccionada]
  );

  function cambiarOperador(id: string) {
    setOperadorId(id);
    setMunicipioId("");
    setInstitucionId("");
    setSedeId("");
  }

  function cambiarMunicipio(id: string) {
    setMunicipioId(id);
    setInstitucionId("");
    setSedeId("");
  }

  function cambiarInstitucion(id: string) {
    setInstitucionId(id);
    setSedeId("");
  }

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);

    const sedeSeleccionada = sedesDisponibles.find((s) => s.id === sedeId);

    const respuesta = await fetch("/api/visitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        esquemaId,
        fecha,
        operador: operadorSeleccionado?.nombreRazonSocial ?? "",
        nit: operadorSeleccionado?.nit ?? "",
        zodes: operadorSeleccionado?.zode.nombre ?? "",
        lote: operadorSeleccionado?.zode.lote.nombre ?? "",
        municipio: municipioSeleccionado?.nombre ?? "",
        institucion: institucionSeleccionada?.nombre ?? "",
        sede: sedeSeleccionada?.nombre ?? "",
      }),
    });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      setError(datos.error ?? "No se pudo crear la visita.");
      setGuardando(false);
      return;
    }

    router.push(`/tabulacion/${datos.id}`);
    router.refresh();
  }

  if (esquemas.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">
          {mensajeSinEsquemas} Crea uno en{" "}
          <a href="/esquemas" className="font-medium text-blue-600 hover:text-blue-700">
            Esquemas y Preguntas
          </a>
          .
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={crear} className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Esquema</label>
          <select
            value={esquemaId}
            onChange={(e) => setEsquemaId(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {esquemas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Fecha de la visita</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Operador</label>
          <select
            value={operadorId}
            onChange={(e) => cambiarOperador(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Selecciona... (opcional)</option>
            {operadores.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombreRazonSocial}
              </option>
            ))}
          </select>
          {operadores.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">
              No hay operadores en{" "}
              <a href="/registro" className="font-medium text-blue-600 hover:text-blue-700">
                Registro
              </a>
              .
            </p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">NIT / ZODES / Lote</label>
          <input
            disabled
            value={
              operadorSeleccionado
                ? `${operadorSeleccionado.nit} · ${operadorSeleccionado.zode.nombre} · ${operadorSeleccionado.zode.lote.nombre}`
                : ""
            }
            placeholder="Se completa según el operador"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Municipio</label>
          <select
            value={municipioId}
            onChange={(e) => cambiarMunicipio(e.target.value)}
            disabled={!operadorSeleccionado}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">{operadorSeleccionado ? "Selecciona... (opcional)" : "Elige primero un operador"}</option>
            {municipiosDisponibles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
          {operadorSeleccionado && municipiosDisponibles.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">No hay municipios registrados en el zode de este operador.</p>
          )}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Institución</label>
          <select
            value={institucionId}
            onChange={(e) => cambiarInstitucion(e.target.value)}
            disabled={!municipioSeleccionado}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">
              {municipioSeleccionado ? "Selecciona... (opcional)" : "Elige primero un municipio"}
            </option>
            {institucionesDisponibles.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre}
              </option>
            ))}
          </select>
          {municipioSeleccionado && institucionesDisponibles.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">No hay instituciones registradas en este municipio.</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Sede</label>
          <select
            value={sedeId}
            onChange={(e) => setSedeId(e.target.value)}
            disabled={!institucionSeleccionada}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">
              {institucionSeleccionada ? "Selecciona... (opcional)" : "Elige primero una institución"}
            </option>
            {sedesDisponibles.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
          {institucionSeleccionada && sedesDisponibles.length === 0 && (
            <p className="mt-1 text-xs text-slate-500">Esta institución no tiene sedes registradas.</p>
          )}
        </div>

        {error && <p className="sm:col-span-2 text-sm font-medium text-red-600">{error}</p>}

        <div className="sm:col-span-2">
          <Button type="submit" disabled={guardando}>
            {guardando ? "Creando..." : "Crear y empezar a diligenciar"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
