"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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

type Visita = {
  id: string;
  fecha: string | Date;
  operador: string | null;
  municipio: string | null;
  institucion: string | null;
  sede: string | null;
  zodes: string | null;
  lote: string | null;
  nit: string | null;
};

function fechaParaInput(fecha: string | Date): string {
  return new Date(fecha).toISOString().slice(0, 10);
}

function formatearFecha(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString("es-CO", { dateStyle: "medium" });
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{etiqueta}</p>
      <p className="text-sm text-slate-800">{valor || "—"}</p>
    </div>
  );
}

export function DatosVisitaCard({
  visita,
  operadores,
  municipios,
  instituciones,
  sedes,
}: {
  visita: Visita;
  operadores: Operador[];
  municipios: Municipio[];
  instituciones: Institucion[];
  sedes: Sede[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fecha, setFecha] = useState(() => fechaParaInput(visita.fecha));
  const [operadorId, setOperadorId] = useState(
    () => operadores.find((o) => o.nombreRazonSocial === visita.operador)?.id ?? ""
  );
  const [municipioId, setMunicipioId] = useState(
    () => municipios.find((m) => m.nombre === visita.municipio)?.id ?? ""
  );
  const [institucionId, setInstitucionId] = useState(
    () => instituciones.find((i) => i.nombre === visita.institucion)?.id ?? ""
  );
  const [sedeId, setSedeId] = useState(() => sedes.find((s) => s.nombre === visita.sede)?.id ?? "");

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
  const sedeSeleccionada = useMemo(() => sedesDisponibles.find((s) => s.id === sedeId), [sedesDisponibles, sedeId]);

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

  function cancelar() {
    setEditando(false);
    setError(null);
    setFecha(fechaParaInput(visita.fecha));
    setOperadorId(operadores.find((o) => o.nombreRazonSocial === visita.operador)?.id ?? "");
    setMunicipioId(municipios.find((m) => m.nombre === visita.municipio)?.id ?? "");
    setInstitucionId(instituciones.find((i) => i.nombre === visita.institucion)?.id ?? "");
    setSedeId(sedes.find((s) => s.nombre === visita.sede)?.id ?? "");
  }

  async function guardar() {
    setGuardando(true);
    setError(null);

    const respuesta = await fetch(`/api/visitas/${visita.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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

  if (!editando) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Datos de la visita</CardTitle>
          <Button variante="outline" onClick={() => setEditando(true)}>
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-3">
          <Dato etiqueta="Fecha" valor={formatearFecha(visita.fecha)} />
          <Dato etiqueta="Operador" valor={visita.operador} />
          <Dato etiqueta="NIT" valor={visita.nit} />
          <Dato etiqueta="Zodes" valor={visita.zodes} />
          <Dato etiqueta="Lote" valor={visita.lote} />
          <Dato etiqueta="Municipio" valor={visita.municipio} />
          <Dato etiqueta="Institución" valor={visita.institucion} />
          <Dato etiqueta="Sede" valor={visita.sede} />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar datos de la visita</CardTitle>
      </CardHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Fecha de la visita</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div />

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
        </div>

        {error && <p className="sm:col-span-2 text-sm font-medium text-red-600">{error}</p>}

        <div className="flex gap-2 sm:col-span-2">
          <Button onClick={guardar} disabled={guardando}>
            <Check className="h-4 w-4" />
            {guardando ? "Guardando..." : "Guardar cambios"}
          </Button>
          <Button variante="outline" onClick={cancelar} disabled={guardando}>
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </div>
    </Card>
  );
}
