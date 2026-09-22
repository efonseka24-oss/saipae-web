"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ETIQUETAS_RESULTADO_LABORATORIO, ETIQUETAS_CUMPLIMIENTO_MUESTRA } from "@/lib/laboratorios";
import { LaboratorioFormulario } from "@/components/laboratorios/LaboratorioFormulario";
import type { Lote, Zode, Municipio, Institucion, Sede, Operador, Esquema, Laboratorio } from "@/components/laboratorios/tipos";
import { FiltroUbicacion, FILTRO_UBICACION_VACIO, type ValorFiltroUbicacion } from "@/components/shared/FiltroUbicacion";

function formatearFecha(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString("es-CO", { dateStyle: "medium" });
}

type Modo = { tipo: "cerrado" } | { tipo: "crear" } | { tipo: "editar"; laboratorio: Laboratorio };

export function LaboratoriosManager({
  laboratorios,
  lotes,
  zodes,
  municipios,
  instituciones,
  sedes,
  operadores,
  esquemas,
}: {
  laboratorios: Laboratorio[];
  lotes: Lote[];
  zodes: Zode[];
  municipios: Municipio[];
  instituciones: Institucion[];
  sedes: Sede[];
  operadores: Operador[];
  esquemas: Esquema[];
}) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>({ tipo: "cerrado" });
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<ValorFiltroUbicacion>(FILTRO_UBICACION_VACIO);

  const laboratoriosFiltrados = laboratorios.filter(
    (l) =>
      (!filtro.loteId || l.zode.lote.id === filtro.loteId) &&
      (!filtro.zodeId || l.zodeId === filtro.zodeId) &&
      (!filtro.municipioId || l.municipioId === filtro.municipioId) &&
      (!filtro.institucionId || l.institucionId === filtro.institucionId)
  );

  async function crear(formData: FormData): Promise<string | null> {
    const respuesta = await fetch("/api/laboratorios", { method: "POST", body: formData });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      return datos.error ?? "No se pudo crear el registro.";
    }
    setModo({ tipo: "cerrado" });
    router.refresh();
    return null;
  }

  async function editar(id: string, formData: FormData): Promise<string | null> {
    const respuesta = await fetch(`/api/laboratorios/${id}`, { method: "PATCH", body: formData });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      return datos.error ?? "No se pudo guardar.";
    }
    setModo({ tipo: "cerrado" });
    router.refresh();
    return null;
  }

  async function eliminar(laboratorio: Laboratorio) {
    if (!confirm(`¿Eliminar el registro de muestra de "${laboratorio.sede.nombre}"?`)) return;
    const respuesta = await fetch(`/api/laboratorios/${laboratorio.id}`, { method: "DELETE" });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      alert(datos.error ?? "No se pudo eliminar.");
      return;
    }
    router.refresh();
  }

  if (zodes.length === 0 || instituciones.length === 0 || sedes.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">
          Primero completa el catálogo (zode, municipio, institución y sede) en{" "}
          <a href="/registro" className="font-medium text-blue-600 hover:text-blue-700">
            Registro
          </a>
          .
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {modo.tipo === "crear" && (
        <LaboratorioFormulario
          titulo="Nueva muestra de laboratorio"
          zodes={zodes}
          municipios={municipios}
          instituciones={instituciones}
          sedes={sedes}
          operadores={operadores}
          esquemas={esquemas}
          onGuardar={crear}
          onCancelar={() => setModo({ tipo: "cerrado" })}
        />
      )}
      {modo.tipo === "editar" && (
        <LaboratorioFormulario
          titulo="Editar muestra de laboratorio"
          zodes={zodes}
          municipios={municipios}
          instituciones={instituciones}
          sedes={sedes}
          operadores={operadores}
          esquemas={esquemas}
          valoresIniciales={modo.laboratorio}
          onGuardar={(formData) => editar(modo.laboratorio.id, formData)}
          onCancelar={() => setModo({ tipo: "cerrado" })}
        />
      )}
      {modo.tipo === "cerrado" && (
        <Button onClick={() => setModo({ tipo: "crear" })}>
          <Plus className="h-4 w-4" />
          Nueva muestra
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Muestras registradas</CardTitle>
          <Badge variante="slate">{laboratoriosFiltrados.length} registro(s)</Badge>
        </CardHeader>
        <FiltroUbicacion lotes={lotes} zodes={zodes} municipios={municipios} instituciones={instituciones} value={filtro} onChange={setFiltro} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Sede</th>
                <th className="py-2 pr-4">Ubicación</th>
                <th className="py-2 pr-4">Operador</th>
                <th className="py-2 pr-4">Tipo de visita</th>
                <th className="py-2 pr-4">Toma de muestra</th>
                <th className="py-2 pr-4">Laboratorio</th>
                <th className="py-2 pr-4">Resultado</th>
                <th className="py-2 pr-4">Fecha resultado</th>
                <th className="py-2 pr-4">Soporte</th>
                <th className="py-2 pr-4">Detalle</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {laboratoriosFiltrados.map((l) => {
                const detallesLlenos = l.detalles.filter((d) => d.producto || d.examen || d.cumplimiento);
                const expandido = expandidoId === l.id;
                return (
                <Fragment key={l.id}>
                <tr className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4">
                    <p className="font-medium text-slate-900">{l.sede.nombre}</p>
                    <p className="text-xs text-slate-500">{l.institucion.nombre}</p>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">
                    {l.municipio.nombre} — {l.zode.nombre}
                    <br />
                    <span className="text-xs text-slate-400">{l.zode.lote.nombre}</span>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{l.operador?.nombreRazonSocial ?? "—"}</td>
                  <td className="py-3 pr-4 text-slate-600">{l.esquema.nombre}</td>
                  <td className="py-3 pr-4 text-slate-600">{formatearFecha(l.fechaTomaMuestra)}</td>
                  <td className="py-3 pr-4 text-slate-600">{l.nombreLaboratorio}</td>
                  <td className="py-3 pr-4">
                    <Badge variante={l.resultado === "FAVORABLE" ? "green" : "red"}>
                      {ETIQUETAS_RESULTADO_LABORATORIO[l.resultado as "FAVORABLE" | "DESFAVORABLE"] ?? l.resultado}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-slate-600">{formatearFecha(l.fechaResultado)}</td>
                  <td className="py-3 pr-4">
                    <a
                      href={l.archivoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                      title={l.archivoNombre}
                    >
                      <FileText className="h-4 w-4" /> Ver
                    </a>
                  </td>
                  <td className="py-3 pr-4">
                    <button
                      onClick={() => setExpandidoId(expandido ? null : l.id)}
                      disabled={detallesLlenos.length === 0}
                      className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600 disabled:text-slate-300"
                    >
                      {expandido ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      {detallesLlenos.length}/10
                    </button>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setModo({ tipo: "editar", laboratorio: l })}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => eliminar(l)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {expandido && detallesLlenos.length > 0 && (
                  <tr className="border-b border-slate-100 bg-slate-50 last:border-0">
                    <td colSpan={11} className="py-3 pr-4 pl-8">
                      <table className="w-full max-w-2xl text-left text-xs">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="py-1 pr-3 font-semibold uppercase tracking-wide">Producto</th>
                            <th className="py-1 pr-3 font-semibold uppercase tracking-wide">Examen</th>
                            <th className="py-1 pr-3 font-semibold uppercase tracking-wide">Cumplimiento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detallesLlenos.map((d) => (
                            <tr key={d.id}>
                              <td className="py-1 pr-3 text-slate-700">{d.producto ?? "—"}</td>
                              <td className="py-1 pr-3 text-slate-700">{d.examen ?? "—"}</td>
                              <td className="py-1 pr-3">
                                {d.cumplimiento ? (
                                  <Badge variante={d.cumplimiento === "CUMPLE" ? "green" : "red"}>
                                    {ETIQUETAS_CUMPLIMIENTO_MUESTRA[d.cumplimiento as "CUMPLE" | "NO_CUMPLE"] ?? d.cumplimiento}
                                  </Badge>
                                ) : (
                                  "—"
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
                </Fragment>
                );
              })}
              {laboratoriosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-sm text-slate-400">
                    {laboratorios.length === 0 ? "No hay muestras registradas todavía." : "Ninguna muestra coincide con el filtro."}
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
