"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FiltroUbicacion, FILTRO_UBICACION_VACIO, type ValorFiltroUbicacion } from "@/components/shared/FiltroUbicacion";
import { CronogramaFormulario } from "@/components/cronograma/CronogramaFormulario";
import {
  ESTADOS_CRONOGRAMA,
  ETIQUETAS_ESTADO_CRONOGRAMA,
  diaDeFecha,
  estadoCronograma,
  formatearDia,
  type EstadoCronograma,
} from "@/lib/cronograma";
import type { CatalogosCronograma, VisitaProgramada } from "@/components/cronograma/tipos";

const VARIANTE_ESTADO: Record<EstadoCronograma, "blue" | "red" | "green"> = {
  PROGRAMADA: "blue",
  VENCIDA: "red",
  REALIZADA: "green",
};

const CLASE_CAMPO =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

type Modo = { tipo: "cerrado" } | { tipo: "crear" } | { tipo: "editar"; visita: VisitaProgramada };

// Cuerpo que esperan las rutas a partir de una visita ya guardada.
function cuerpoDe(v: VisitaProgramada, cambios: Record<string, string> = {}): Record<string, string> {
  return {
    esquemaId: v.esquemaId ?? "",
    zodeId: v.zodeId,
    municipioId: v.municipioId,
    institucionId: v.institucionId ?? "",
    sedeId: v.sedeId ?? "",
    operadorId: v.operadorId ?? "",
    bodegaId: v.bodegaId ?? "",
    fechaProgramada: diaDeFecha(v.fechaProgramada),
    fechaRealizacion: v.fechaRealizacion ? diaDeFecha(v.fechaRealizacion) : "",
    interventorId: v.interventorId ?? "",
    supervisorId: v.supervisorId ?? "",
    observaciones: v.observaciones ?? "",
    ...cambios,
  };
}

export function CronogramaManager({
  visitas,
  catalogos,
  hoy,
}: {
  visitas: VisitaProgramada[];
  catalogos: CatalogosCronograma;
  hoy: string;
}) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>({ tipo: "cerrado" });
  const [ubicacion, setUbicacion] = useState<ValorFiltroUbicacion>(FILTRO_UBICACION_VACIO);
  const [estado, setEstado] = useState("");
  const [interventorId, setInterventorId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const conEstado = visitas.map((v) => ({ ...v, estado: estadoCronograma(v.fechaProgramada, v.fechaRealizacion, hoy) }));
  const filtradas = conEstado.filter((v) => {
    const dia = diaDeFecha(v.fechaProgramada);
    return (
      (!ubicacion.loteId || v.zode.loteId === ubicacion.loteId) &&
      (!ubicacion.zodeId || v.zodeId === ubicacion.zodeId) &&
      (!ubicacion.municipioId || v.municipioId === ubicacion.municipioId) &&
      (!ubicacion.institucionId || v.institucionId === ubicacion.institucionId) &&
      (!estado || v.estado === estado) &&
      (!interventorId || v.interventorId === interventorId) &&
      (!supervisorId || v.supervisorId === supervisorId) &&
      (!desde || dia >= desde) &&
      (!hasta || dia <= hasta)
    );
  });
  const conteo = Object.fromEntries(ESTADOS_CRONOGRAMA.map((e) => [e, filtradas.filter((v) => v.estado === e).length])) as Record<
    EstadoCronograma,
    number
  >;

  async function guardar(url: string, metodo: "POST" | "PATCH", datos: Record<string, string>): Promise<string | null> {
    const respuesta = await fetch(url, { method: metodo, headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => ({}));
      return cuerpo.error ?? "No se pudo guardar.";
    }
    setModo({ tipo: "cerrado" });
    router.refresh();
    return null;
  }

  async function marcarRealizada(v: VisitaProgramada) {
    if (!confirm(`¿Marcar como realizada hoy la visita a ${v.sede?.nombre ?? v.bodega?.nombre ?? v.municipio.nombre}?`)) return;
    const mensaje = await guardar(`/api/cronograma/${v.id}`, "PATCH", cuerpoDe(v, { fechaRealizacion: hoy }));
    if (mensaje) alert(mensaje);
  }

  async function eliminar(v: VisitaProgramada) {
    if (!confirm(`¿Eliminar del cronograma la visita a ${v.sede?.nombre ?? v.bodega?.nombre ?? v.municipio.nombre} del ${formatearDia(v.fechaProgramada)}?`)) {
      return;
    }
    const respuesta = await fetch(`/api/cronograma/${v.id}`, { method: "DELETE" });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json().catch(() => ({}));
      alert(cuerpo.error ?? "No se pudo eliminar.");
      return;
    }
    router.refresh();
  }

  if (catalogos.zodes.length === 0 || catalogos.municipios.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">
          Primero completa el catálogo (zodes y municipios) en{" "}
          <a href="/registro" className="font-medium text-blue-600 hover:text-blue-700">
            Registro
          </a>
          .
        </p>
      </Card>
    );
  }

  const etiquetaUsuario = (u: { nombre: string; cargo: string | null }) => (u.cargo ? `${u.nombre} — ${u.cargo}` : u.nombre);

  return (
    <div className="space-y-6">
      {modo.tipo === "crear" && (
        <CronogramaFormulario
          titulo="Programar visita"
          catalogos={catalogos}
          onGuardar={(datos) => guardar("/api/cronograma", "POST", datos)}
          onCancelar={() => setModo({ tipo: "cerrado" })}
        />
      )}
      {modo.tipo === "editar" && (
        <CronogramaFormulario
          key={modo.visita.id}
          titulo="Editar visita programada"
          catalogos={catalogos}
          valoresIniciales={modo.visita}
          onGuardar={(datos) => guardar(`/api/cronograma/${modo.visita.id}`, "PATCH", datos)}
          onCancelar={() => setModo({ tipo: "cerrado" })}
        />
      )}
      {modo.tipo === "cerrado" && (
        <Button onClick={() => setModo({ tipo: "crear" })}>
          <Plus className="h-4 w-4" />
          Programar visita
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Visitas programadas</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variante="blue">{conteo.PROGRAMADA} programada(s)</Badge>
            <Badge variante="red">{conteo.VENCIDA} vencida(s)</Badge>
            <Badge variante="green">{conteo.REALIZADA} realizada(s)</Badge>
          </div>
        </CardHeader>

        <FiltroUbicacion
          lotes={catalogos.lotes}
          zodes={catalogos.zodes}
          municipios={catalogos.municipios}
          instituciones={catalogos.instituciones}
          value={ubicacion}
          onChange={setUbicacion}
        />
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className={CLASE_CAMPO}>
              <option value="">Todos</option>
              {ESTADOS_CRONOGRAMA.map((e) => (
                <option key={e} value={e}>
                  {ETIQUETAS_ESTADO_CRONOGRAMA[e]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Interventor</label>
            <select value={interventorId} onChange={(e) => setInterventorId(e.target.value)} className={CLASE_CAMPO}>
              <option value="">Todos</option>
              {catalogos.usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {etiquetaUsuario(u)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Supervisor</label>
            <select value={supervisorId} onChange={(e) => setSupervisorId(e.target.value)} className={CLASE_CAMPO}>
              <option value="">Todos</option>
              {catalogos.usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {etiquetaUsuario(u)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Programadas desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={CLASE_CAMPO} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={CLASE_CAMPO} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Fecha programada</th>
                <th className="py-2 pr-4">Lugar</th>
                <th className="py-2 pr-4">Tipo de visita</th>
                <th className="py-2 pr-4">Interventor</th>
                <th className="py-2 pr-4">Supervisor</th>
                <th className="py-2 pr-4">Realización</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4">Observaciones</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((v) => (
                <tr key={v.id} className="border-b border-slate-100 align-top last:border-0">
                  <td className="whitespace-nowrap py-3 pr-4 font-medium text-slate-900">{formatearDia(v.fechaProgramada)}</td>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-slate-900">{v.sede?.nombre ?? v.bodega?.nombre ?? v.institucion?.nombre ?? v.municipio.nombre}</p>
                    {v.sede && v.institucion && <p className="text-xs text-slate-500">{v.institucion.nombre}</p>}
                    {v.operador && (
                      <p className="text-xs text-slate-500">
                        {v.operador.nombreRazonSocial}
                        {/* La bodega ya es el título cuando no hay sede. */}
                        {v.bodega && v.sede ? ` · ${v.bodega.nombre}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      {v.sede || v.bodega || v.institucion ? `${v.municipio.nombre} — ` : ""}
                      {v.zode.nombre} · {v.zode.lote.nombre}
                    </p>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{v.esquema?.nombre ?? "—"}</td>
                  <td className="py-3 pr-4 text-slate-600">{v.interventor?.nombre ?? <span className="text-amber-600">Sin asignar</span>}</td>
                  <td className="py-3 pr-4 text-slate-600">{v.supervisor?.nombre ?? <span className="text-amber-600">Sin asignar</span>}</td>
                  <td className="whitespace-nowrap py-3 pr-4 text-slate-600">{formatearDia(v.fechaRealizacion)}</td>
                  <td className="py-3 pr-4">
                    <Badge variante={VARIANTE_ESTADO[v.estado]}>{ETIQUETAS_ESTADO_CRONOGRAMA[v.estado]}</Badge>
                  </td>
                  <td className="max-w-xs py-3 pr-4 text-slate-600">
                    <p className="line-clamp-3 whitespace-pre-line" title={v.observaciones ?? undefined}>
                      {v.observaciones ?? "—"}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-1">
                      {v.estado !== "REALIZADA" && (
                        <button
                          onClick={() => marcarRealizada(v)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600"
                          title="Marcar como realizada hoy"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setModo({ tipo: "editar", visita: v })}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminar(v)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-slate-400">
                    {visitas.length === 0 ? "No hay visitas programadas todavía." : "Ninguna visita coincide con los filtros."}
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
