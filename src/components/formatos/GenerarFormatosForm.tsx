"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileDown, FileText, Pencil, Circle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ETIQUETAS_ESTADO_VISITA } from "@/lib/visitas";
import { resolverCadenaVisita } from "@/lib/estadisticasEncuestas";
import { FiltroUbicacion, FILTRO_UBICACION_VACIO, type ValorFiltroUbicacion } from "@/components/shared/FiltroUbicacion";

type Esquema = { id: string; nombre: string };
type Visita = {
  id: string;
  fecha: string;
  operador: string | null;
  municipio: string | null;
  institucion: string | null;
  zodes: string | null;
  lote: string | null;
  estado: string;
  informeGeneradoEn: string | null;
  // Interventor que hizo la visita (unido por el correo elegido en la app).
  usuario?: { nombre: string } | null;
};
type Resultado = { nombre: string; nombreBase: string; docxUrl: string; pdfUrl: string | null };

type CadenaLote = { id: string; nombre: string; departamento: { nombre: string } };
type CadenaZode = { id: string; nombre: string; loteId: string; lote: CadenaLote };
type CadenaMunicipio = { id: string; nombre: string; zodeId: string; zode: CadenaZode };
type CadenaInstitucion = { id: string; nombre: string; municipioId: string; municipio: CadenaMunicipio };

function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString("es-CO", { dateStyle: "medium" });
}

function nombreVisitaParaConfirmar(v: Visita): string {
  const lugar = v.institucion ?? v.operador;
  return lugar ? `del ${formatearFecha(v.fecha)} (${lugar})` : `del ${formatearFecha(v.fecha)}`;
}

function Semaforo({ informeGeneradoEn }: { informeGeneradoEn: string | null }) {
  const gestionado = !!informeGeneradoEn;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${gestionado ? "text-emerald-600" : "text-red-500"}`}
      title={gestionado ? `Informe generado el ${formatearFecha(informeGeneradoEn!)}` : "Todavía no se ha generado un informe"}
    >
      <Circle className={`h-2.5 w-2.5 ${gestionado ? "fill-emerald-500" : "fill-red-500"}`} strokeWidth={0} />
      {gestionado ? "Gestionado" : "Pendiente"}
    </span>
  );
}

export function GenerarFormatosForm({
  esquemas,
  lotes,
  zodes,
  municipios,
  instituciones,
}: {
  esquemas: Esquema[];
  lotes: CadenaLote[];
  zodes: CadenaZode[];
  municipios: CadenaMunicipio[];
  instituciones: CadenaInstitucion[];
}) {
  const [esquemaId, setEsquemaId] = useState(esquemas[0]?.id ?? "");
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [cargandoVisitas, setCargandoVisitas] = useState(false);
  const [generandoId, setGenerandoId] = useState<string | null>(null);
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultados, setResultados] = useState<Record<string, Resultado[]>>({});
  const [filtro, setFiltro] = useState<ValorFiltroUbicacion>(FILTRO_UBICACION_VACIO);

  useEffect(() => {
    if (!esquemaId) return;
    // Envuelto en una promesa para que las llamadas a setState queden dentro
    // de un callback (no directamente en el cuerpo del efecto).
    Promise.resolve().then(async () => {
      setCargandoVisitas(true);
      setResultados({});
      const respuesta = await fetch(`/api/visitas?esquemaId=${esquemaId}`);
      const datos: Visita[] = await respuesta.json();
      setVisitas(datos);
      setCargandoVisitas(false);
    });
  }, [esquemaId]);

  // Visita solo guarda texto plano (operador/municipio/institución/zodes/
  // lote), así que se resuelve su cadena completa contra el catálogo (igual
  // que en Tabulación) para poder filtrar por ubicación de forma confiable.
  const visitasConCadena = useMemo(
    () => visitas.map((v) => ({ ...v, cadena: resolverCadenaVisita(v, instituciones, municipios, zodes, lotes) })),
    [visitas, instituciones, municipios, zodes, lotes]
  );

  const nombreLote = lotes.find((l) => l.id === filtro.loteId)?.nombre;
  const nombreZode = zodes.find((z) => z.id === filtro.zodeId)?.nombre;
  const nombreMunicipio = municipios.find((m) => m.id === filtro.municipioId)?.nombre;
  const nombreInstitucion = instituciones.find((i) => i.id === filtro.institucionId)?.nombre;

  const visitasFiltradas = visitasConCadena.filter(
    (v) =>
      (!nombreLote || v.cadena.lote === nombreLote) &&
      (!nombreZode || v.cadena.zode === nombreZode) &&
      (!nombreMunicipio || v.cadena.municipio === nombreMunicipio) &&
      (!nombreInstitucion || v.cadena.institucion === nombreInstitucion)
  );

  async function generar(visitaId: string) {
    setGenerandoId(visitaId);
    setError(null);

    try {
      const respuesta = await fetch("/api/formatos/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitaId }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos.error ?? "No se pudo generar el informe.");
        setGenerandoId(null);
        return;
      }

      setResultados((prev) => ({ ...prev, [visitaId]: datos.documentos }));
      setVisitas((prev) =>
        prev.map((v) => (v.id === visitaId ? { ...v, informeGeneradoEn: new Date().toISOString() } : v))
      );
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setGenerandoId(null);
    }
  }

  async function eliminar(v: Visita) {
    if (!confirm(`¿Eliminar la visita ${nombreVisitaParaConfirmar(v)}? Se perderán sus respuestas.`)) return;
    setEliminandoId(v.id);
    setError(null);

    const respuesta = await fetch(`/api/visitas/${v.id}`, { method: "DELETE" });
    setEliminandoId(null);
    if (!respuesta.ok) {
      setError("No se pudo eliminar la visita.");
      return;
    }
    setVisitas((prev) => prev.filter((visita) => visita.id !== v.id));
  }

  if (esquemas.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">
          Todavía no hay esquemas.{" "}
          <a href="/esquemas" className="font-medium text-blue-600 hover:text-blue-700">
            Crea uno primero
          </a>
          .
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="mb-4 max-w-xs">
          <label className="mb-1 block text-sm font-medium text-slate-700">Esquema</label>
          <select
            value={esquemaId}
            onChange={(e) => setEsquemaId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {esquemas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>

        <FiltroUbicacion lotes={lotes} zodes={zodes} municipios={municipios} instituciones={instituciones} value={filtro} onChange={setFiltro} />

        {error && <p className="mb-4 text-sm font-medium text-red-600">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Operador / Institución</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4">Informe</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargandoVisitas && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    Cargando visitas...
                  </td>
                </tr>
              )}
              {!cargandoVisitas &&
                visitasFiltradas.map((v) => (
                  <tr key={v.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-3 pr-4 text-slate-600">{formatearFecha(v.fecha)}</td>
                    <td className="py-3 pr-4 text-slate-600">
                      {v.operador ?? "—"}
                      {v.institucion && <span className="text-slate-400"> · {v.institucion}</span>}
                      {v.usuario && <span className="block text-xs text-slate-400">Interventor: {v.usuario.nombre}</span>}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variante={v.estado === "FINALIZADA" ? "green" : "amber"}>
                        {ETIQUETAS_ESTADO_VISITA[v.estado as "EN_PROGRESO" | "FINALIZADA"] ?? v.estado}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <Semaforo informeGeneradoEn={v.informeGeneradoEn} />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <Button variante="outline" onClick={() => generar(v.id)} disabled={generandoId === v.id}>
                          <FileText className="h-4 w-4" />
                          {generandoId === v.id ? "Generando..." : "Generar informe"}
                        </Button>
                        <Link
                          href={`/tabulacion/${v.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil className="h-4 w-4" />
                          Editar
                        </Link>
                        <button
                          onClick={() => eliminar(v)}
                          disabled={eliminandoId === v.id}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {resultados[v.id] && (
                        <div className="mt-2 space-y-1.5">
                          {resultados[v.id].map((doc) => (
                            <div key={doc.docxUrl} className="flex items-center gap-3">
                              <span className="text-xs font-medium text-slate-500">{doc.nombre}:</span>
                              <a
                                href={doc.docxUrl}
                                download
                                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                              >
                                <FileDown className="h-4 w-4" /> .docx
                              </a>
                              {doc.pdfUrl ? (
                                <a
                                  href={doc.pdfUrl}
                                  download
                                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                                >
                                  <FileDown className="h-4 w-4" /> .pdf
                                </a>
                              ) : (
                                <Badge variante="amber">PDF no disponible</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              {!cargandoVisitas && visitasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    {visitas.length === 0 ? "Sin visitas para este esquema." : "Ninguna visita coincide con el filtro."}
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
