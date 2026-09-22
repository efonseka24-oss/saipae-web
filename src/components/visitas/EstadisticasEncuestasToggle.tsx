"use client";

import { Fragment, useMemo, useState } from "react";
import { BarChart3, X, Eye, Loader2, FileDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ETIQUETAS_AGRUPACION, type AgrupacionEstadistica, type CadenaResuelta } from "@/lib/estadisticasEncuestas";
import type { StatsEsquema } from "@/lib/estadisticasPreguntas";

const OPCIONES: AgrupacionEstadistica[] = ["departamento", "lote", "zode", "municipio", "institucion"];

type Fila = { id: string; estado: string; cadena: CadenaResuelta };

async function descargarArchivo(respuesta: Response, nombrePorDefecto: string) {
  if (!respuesta.ok) {
    alert("No se pudo generar el reporte.");
    return;
  }
  const disposicion = respuesta.headers.get("Content-Disposition") ?? "";
  const coincidencia = disposicion.match(/filename="([^"]+)"/);
  const nombre = coincidencia?.[1] ?? nombrePorDefecto;
  const blob = await respuesta.blob();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

function ReportesEstadisticas() {
  const [nivelMaximo, setNivelMaximo] = useState<AgrupacionEstadistica>("lote");
  const [generandoGeneral, setGenerandoGeneral] = useState(false);
  const [generandoEspecifico, setGenerandoEspecifico] = useState(false);

  async function generarGeneral() {
    setGenerandoGeneral(true);
    const respuesta = await fetch("/api/tabulacion/reporte-general");
    await descargarArchivo(respuesta, "Informe_Estadistico_General.docx");
    setGenerandoGeneral(false);
  }

  async function generarEspecifico() {
    setGenerandoEspecifico(true);
    const respuesta = await fetch("/api/tabulacion/reporte-especifico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nivelMaximo }),
    });
    await descargarArchivo(respuesta, "Informe_Estadistico.docx");
    setGenerandoEspecifico(false);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <Button variante="outline" onClick={generarGeneral} disabled={generandoGeneral}>
        <FileDown className="h-4 w-4" />
        {generandoGeneral ? "Generando..." : "Reporte general (Depto → Lote → Zode → Municipio)"}
      </Button>

      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Reporte específico, hasta:</span>
        <select
          value={nivelMaximo}
          onChange={(e) => setNivelMaximo(e.target.value as AgrupacionEstadistica)}
          className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {OPCIONES.map((op) => (
            <option key={op} value={op}>
              {ETIQUETAS_AGRUPACION[op]}
            </option>
          ))}
        </select>
        <Button variante="outline" onClick={generarEspecifico} disabled={generandoEspecifico}>
          <FileDown className="h-4 w-4" />
          {generandoEspecifico ? "Generando..." : "Generar"}
        </Button>
      </div>
    </div>
  );
}

function BarraPorcentaje({ etiqueta, cantidad, porcentaje }: { etiqueta: string; cantidad: number; porcentaje: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
        <span className="font-medium">{etiqueta}</span>
        <span>
          {porcentaje}% ({cantidad})
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-blue-500" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  );
}

function DetalleGrupo({ esquemas, totalEncuestas }: { esquemas: StatsEsquema[]; totalEncuestas: number }) {
  if (totalEncuestas === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">No hay encuestas en este grupo.</p>;
  }

  return (
    <div className="space-y-6">
      {esquemas.map((e) => (
        <div key={e.esquemaId}>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-semibold text-slate-900">{e.esquemaNombre}</h3>
            <Badge variante="blue">{e.totalEncuestas} encuesta(s)</Badge>
            {e.favorabilidadTotal !== null && (
              <Badge variante="green">Favorabilidad total: {e.favorabilidadTotal}%</Badge>
            )}
          </div>

          <div className="space-y-4">
            {e.preguntas.map((p) => (
              <div key={p.preguntaId} className="rounded-lg border border-slate-100 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">{p.texto}</p>
                  {p.favorabilidad !== null && <Badge variante="green">Favorabilidad: {p.favorabilidad}%</Badge>}
                </div>
                {p.opciones.length > 0 ? (
                  <div className="space-y-2">
                    {p.opciones.map((op) => (
                      <BarraPorcentaje key={op.opcion} etiqueta={op.opcion} cantidad={op.cantidad} porcentaje={op.porcentaje} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">{p.totalRespuestas} respuesta(s) registradas.</p>
                )}
              </div>
            ))}
            {e.preguntas.length === 0 && <p className="text-xs text-slate-400">Este esquema no tiene preguntas.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EstadisticasEncuestasToggle({ filas }: { filas: Fila[] }) {
  const [mostrar, setMostrar] = useState(false);
  const [agrupacion, setAgrupacion] = useState<AgrupacionEstadistica>("departamento");
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [detalle, setDetalle] = useState<{ totalEncuestas: number; esquemas: StatsEsquema[] } | null>(null);

  const grupos = useMemo(() => {
    const mapa = new Map<string, { total: number; finalizadas: number; enProgreso: number }>();
    for (const f of filas) {
      const clave = f.cadena[agrupacion];
      const actual = mapa.get(clave) ?? { total: 0, finalizadas: 0, enProgreso: 0 };
      actual.total += 1;
      if (f.estado === "FINALIZADA") actual.finalizadas += 1;
      else actual.enProgreso += 1;
      mapa.set(clave, actual);
    }
    return [...mapa.entries()]
      .map(([nombre, conteo]) => ({ nombre, ...conteo }))
      .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
  }, [filas, agrupacion]);

  function cambiarAgrupacion(op: AgrupacionEstadistica) {
    setAgrupacion(op);
    setGrupoAbierto(null);
    setDetalle(null);
  }

  async function verGrupo(nombre: string) {
    if (grupoAbierto === nombre) {
      setGrupoAbierto(null);
      setDetalle(null);
      return;
    }
    setGrupoAbierto(nombre);
    setDetalle(null);
    setCargando(true);
    const respuesta = await fetch("/api/tabulacion/estadisticas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agrupacion, valor: nombre }),
    });
    const datos = await respuesta.json();
    setCargando(false);
    if (respuesta.ok) setDetalle(datos);
  }

  if (!mostrar) {
    return (
      <div className="mb-6">
        <Button variante="outline" onClick={() => setMostrar(true)}>
          <BarChart3 className="h-4 w-4" />
          Ver estadísticas
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Estadísticas de encuestas</h2>
        <button
          onClick={() => {
            setMostrar(false);
            setGrupoAbierto(null);
            setDetalle(null);
          }}
          className="text-slate-400 hover:text-slate-600"
          title="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ReportesEstadisticas />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="mr-1 text-sm text-slate-500">¿Cómo quieres ver la estadística?</p>
        {OPCIONES.map((op) => (
          <Button key={op} variante={agrupacion === op ? "primary" : "outline"} onClick={() => cambiarAgrupacion(op)}>
            {ETIQUETAS_AGRUPACION[op]}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4">{ETIQUETAS_AGRUPACION[agrupacion]}</th>
              <th className="py-2 pr-4">Total encuestas</th>
              <th className="py-2 pr-4">Finalizadas</th>
              <th className="py-2 pr-4">En progreso</th>
              <th className="py-2 pr-4">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {grupos.map((g) => (
              <Fragment key={g.nombre}>
                <tr className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4 font-medium text-slate-900">{g.nombre}</td>
                  <td className="py-3 pr-4">
                    <Badge variante="blue">{g.total}</Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variante="green">{g.finalizadas}</Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variante="amber">{g.enProgreso}</Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <Button variante="outline" onClick={() => verGrupo(g.nombre)}>
                      <Eye className="h-4 w-4" />
                      {grupoAbierto === g.nombre ? "Ocultar" : "Ver"}
                    </Button>
                  </td>
                </tr>
                {grupoAbierto === g.nombre && (
                  <tr className="border-b border-slate-100 last:border-0">
                    <td colSpan={5} className="bg-slate-50 px-4 py-4">
                      {cargando ? (
                        <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Calculando...
                        </div>
                      ) : detalle ? (
                        <DetalleGrupo esquemas={detalle.esquemas} totalEncuestas={detalle.totalEncuestas} />
                      ) : null}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {grupos.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                  No hay encuestas registradas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
