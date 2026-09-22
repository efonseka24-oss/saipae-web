"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Check, X, FileText, Upload } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TIPOS_ACTA_CAES, ETIQUETAS_TIPO_ACTA_CAES, type TipoActaCaes } from "@/lib/actasCaes";
import { FiltroUbicacion, FILTRO_UBICACION_VACIO, type ValorFiltroUbicacion, type ItemLote, type ItemZode, type ItemMunicipio } from "@/components/shared/FiltroUbicacion";

type Institucion = {
  id: string;
  numeroDane: string;
  nombre: string;
  municipioId: string;
  municipio: { id: string; nombre: string; zode: { id: string; nombre: string; lote: { id: string; nombre: string; departamento: { nombre: string } } } };
};

type Acta = {
  id: string;
  tipo: string;
  fecha: string | Date;
  archivoUrl: string;
  archivoNombre: string;
  institucionId: string;
  institucion: Institucion;
};

function formatearFecha(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString("es-CO", { dateStyle: "medium" });
}

function fechaParaInput(fecha: string | Date): string {
  return new Date(fecha).toISOString().slice(0, 10);
}

function SelectTipo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      {TIPOS_ACTA_CAES.map((t) => (
        <option key={t} value={t}>
          {ETIQUETAS_TIPO_ACTA_CAES[t]}
        </option>
      ))}
    </select>
  );
}

function SelectInstitucion({
  value,
  onChange,
  instituciones,
}: {
  value: string;
  onChange: (v: string) => void;
  instituciones: Institucion[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
    >
      <option value="">Selecciona...</option>
      {instituciones.map((i) => (
        <option key={i.id} value={i.id}>
          {i.nombre} — {i.municipio.nombre}
        </option>
      ))}
    </select>
  );
}

function FilaActa({ acta, instituciones }: { acta: Acta; instituciones: Institucion[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [tipo, setTipo] = useState(acta.tipo);
  const [institucionId, setInstitucionId] = useState(acta.institucionId);
  const [fecha, setFecha] = useState(fechaParaInput(acta.fecha));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [reemplazando, setReemplazando] = useState(false);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    const formData = new FormData();
    formData.append("tipo", tipo);
    formData.append("institucionId", institucionId);
    formData.append("fecha", fecha);
    const respuesta = await fetch(`/api/caes/actas/${acta.id}`, { method: "PATCH", body: formData });
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

  async function reemplazarArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    setReemplazando(true);
    const formData = new FormData();
    formData.append("tipo", acta.tipo);
    formData.append("institucionId", acta.institucionId);
    formData.append("fecha", fechaParaInput(acta.fecha));
    formData.append("archivo", archivo);
    const respuesta = await fetch(`/api/caes/actas/${acta.id}`, { method: "PATCH", body: formData });
    setReemplazando(false);
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      alert(datos.error ?? "No se pudo reemplazar el archivo.");
      return;
    }
    if (inputArchivoRef.current) inputArchivoRef.current.value = "";
    router.refresh();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar esta acta de ${acta.institucion.nombre}?`)) return;
    const respuesta = await fetch(`/api/caes/actas/${acta.id}`, { method: "DELETE" });
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
          <SelectTipo value={tipo} onChange={setTipo} />
        </td>
        <td className="py-2 pr-4">
          <SelectInstitucion value={institucionId} onChange={setInstitucionId} instituciones={instituciones} />
        </td>
        <td className="py-2 pr-4">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="py-2 pr-4" />
        <td className="py-2 pr-4">
          {error && <p className="mb-1 text-xs font-medium text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={guardar} disabled={guardando} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50">
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setEditando(false);
                setTipo(acta.tipo);
                setInstitucionId(acta.institucionId);
                setFecha(fechaParaInput(acta.fecha));
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
      <td className="py-3 pr-4">
        <Badge variante={acta.tipo === "CONFORMACION" ? "blue" : "green"}>
          {ETIQUETAS_TIPO_ACTA_CAES[acta.tipo as TipoActaCaes] ?? acta.tipo}
        </Badge>
      </td>
      <td className="py-3 pr-4">
        <p className="font-medium text-slate-900">{acta.institucion.nombre}</p>
        <p className="text-xs text-slate-500">{acta.institucion.municipio.nombre}</p>
      </td>
      <td className="py-3 pr-4 text-slate-600">{formatearFecha(acta.fecha)}</td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-3">
          <a
            href={acta.archivoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            title={acta.archivoNombre}
          >
            <FileText className="h-4 w-4" /> Ver PDF
          </a>
          <input ref={inputArchivoRef} type="file" accept="application/pdf" onChange={reemplazarArchivo} className="hidden" />
          <button
            onClick={() => inputArchivoRef.current?.click()}
            disabled={reemplazando}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
          >
            <Upload className="h-3.5 w-3.5" /> {reemplazando ? "Subiendo..." : "Reemplazar"}
          </button>
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

export function ActasCaesManager({
  actas,
  instituciones,
  lotes,
  zodes,
  municipios,
}: {
  actas: Acta[];
  instituciones: Institucion[];
  lotes: ItemLote[];
  zodes: ItemZode[];
  municipios: ItemMunicipio[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<string>(TIPOS_ACTA_CAES[0]);
  const [institucionId, setInstitucionId] = useState("");
  const [fecha, setFecha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const inputArchivoRef = useRef<HTMLInputElement>(null);
  const [filtro, setFiltro] = useState<ValorFiltroUbicacion>(FILTRO_UBICACION_VACIO);

  const actasFiltradas = actas.filter(
    (a) =>
      (!filtro.loteId || a.institucion.municipio.zode.lote.id === filtro.loteId) &&
      (!filtro.zodeId || a.institucion.municipio.zode.id === filtro.zodeId) &&
      (!filtro.municipioId || a.institucion.municipio.id === filtro.municipioId) &&
      (!filtro.institucionId || a.institucionId === filtro.institucionId)
  );

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    const archivo = inputArchivoRef.current?.files?.[0];
    if (!archivo) {
      setError("Carga el archivo PDF del acta.");
      return;
    }

    setGuardando(true);
    setError(null);

    const formData = new FormData();
    formData.append("tipo", tipo);
    formData.append("institucionId", institucionId);
    formData.append("fecha", fecha);
    formData.append("archivo", archivo);

    const respuesta = await fetch("/api/caes/actas", { method: "POST", body: formData });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      setError(datos.error ?? "No se pudo crear el acta.");
      setGuardando(false);
      return;
    }

    setTipo(TIPOS_ACTA_CAES[0]);
    setInstitucionId("");
    setFecha("");
    if (inputArchivoRef.current) inputArchivoRef.current.value = "";
    setAbierto(false);
    setGuardando(false);
    router.refresh();
  }

  if (instituciones.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">
          Primero crea al menos una institución en{" "}
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
      {abierto ? (
        <Card className="max-w-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Nueva acta CAES</h2>
            <button onClick={() => setAbierto(false)} className="text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={crear} className="grid gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tipo de acta</label>
              <SelectTipo value={tipo} onChange={setTipo} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Institución</label>
              <SelectInstitucion value={institucionId} onChange={setInstitucionId} instituciones={instituciones} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Archivo PDF</label>
              <input
                ref={inputArchivoRef}
                type="file"
                accept="application/pdf"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
              />
            </div>
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar acta"}
            </Button>
          </form>
        </Card>
      ) : (
        <Button onClick={() => setAbierto(true)}>
          <Plus className="h-4 w-4" />
          Nueva acta
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Actas registradas</CardTitle>
          <Badge variante="slate">{actasFiltradas.length} acta(s)</Badge>
        </CardHeader>
        <FiltroUbicacion lotes={lotes} zodes={zodes} municipios={municipios} instituciones={instituciones} value={filtro} onChange={setFiltro} />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Institución</th>
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Archivo</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {actasFiltradas.map((a) => (
                <FilaActa key={a.id} acta={a} instituciones={instituciones} />
              ))}
              {actasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    {actas.length === 0 ? "No hay actas registradas todavía." : "Ninguna acta coincide con el filtro."}
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
