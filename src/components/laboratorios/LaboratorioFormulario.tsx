"use client";

import { useRef, useState } from "react";
import { X, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  RESULTADOS_LABORATORIO,
  ETIQUETAS_RESULTADO_LABORATORIO,
  CUMPLIMIENTOS_MUESTRA,
  ETIQUETAS_CUMPLIMIENTO_MUESTRA,
  NUMERO_DETALLES_MUESTRA,
  type DetalleMuestraEntrada,
} from "@/lib/laboratorios";
import type { Zode, Municipio, Institucion, Sede, Operador, Esquema, Laboratorio } from "@/components/laboratorios/tipos";

function fechaParaInput(fecha: string | Date): string {
  return new Date(fecha).toISOString().slice(0, 10);
}

function filasDetalleIniciales(valoresIniciales: Laboratorio | undefined): DetalleMuestraEntrada[] {
  const filas: DetalleMuestraEntrada[] = Array.from({ length: NUMERO_DETALLES_MUESTRA }, () => ({
    producto: "",
    examen: "",
    cumplimiento: "",
  }));
  for (const detalle of valoresIniciales?.detalles ?? []) {
    const indice = detalle.orden - 1;
    if (indice >= 0 && indice < NUMERO_DETALLES_MUESTRA) {
      filas[indice] = { producto: detalle.producto ?? "", examen: detalle.examen ?? "", cumplimiento: detalle.cumplimiento ?? "" };
    }
  }
  return filas;
}

const CLASE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400";

export function LaboratorioFormulario({
  titulo,
  zodes,
  municipios,
  instituciones,
  sedes,
  operadores,
  esquemas,
  valoresIniciales,
  onGuardar,
  onCancelar,
}: {
  titulo: string;
  zodes: Zode[];
  municipios: Municipio[];
  instituciones: Institucion[];
  sedes: Sede[];
  operadores: Operador[];
  esquemas: Esquema[];
  valoresIniciales?: Laboratorio;
  onGuardar: (formData: FormData) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [zodeId, setZodeId] = useState(valoresIniciales?.zodeId ?? "");
  const [municipioId, setMunicipioId] = useState(valoresIniciales?.municipioId ?? "");
  const [institucionId, setInstitucionId] = useState(valoresIniciales?.institucionId ?? "");
  const [sedeId, setSedeId] = useState(valoresIniciales?.sedeId ?? "");
  const [operadorId, setOperadorId] = useState(valoresIniciales?.operadorId ?? "");
  const [esquemaId, setEsquemaId] = useState(valoresIniciales?.esquemaId ?? "");
  const [fechaTomaMuestra, setFechaTomaMuestra] = useState(
    valoresIniciales ? fechaParaInput(valoresIniciales.fechaTomaMuestra) : ""
  );
  const [nombreLaboratorio, setNombreLaboratorio] = useState(valoresIniciales?.nombreLaboratorio ?? "");
  const [resultado, setResultado] = useState<string>(valoresIniciales?.resultado ?? RESULTADOS_LABORATORIO[0]);
  const [fechaResultado, setFechaResultado] = useState(
    valoresIniciales ? fechaParaInput(valoresIniciales.fechaResultado) : ""
  );
  const [observaciones, setObservaciones] = useState(valoresIniciales?.observaciones ?? "");
  const [detalles, setDetalles] = useState<DetalleMuestraEntrada[]>(() => filasDetalleIniciales(valoresIniciales));
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  const municipiosFiltrados = municipios.filter((m) => m.zodeId === zodeId);
  const institucionesFiltradas = instituciones.filter((i) => i.municipioId === municipioId);
  const sedesFiltradas = sedes.filter((s) => s.institucionId === institucionId);
  const operadoresDelZode = operadores.filter((o) => o.zodeId === zodeId);
  const zodeSeleccionado = zodes.find((z) => z.id === zodeId);

  function manejarCambioZode(valor: string) {
    setZodeId(valor);
    setMunicipioId("");
    setInstitucionId("");
    setSedeId("");
    const delZode = operadores.filter((o) => o.zodeId === valor);
    setOperadorId(delZode.length === 1 ? delZode[0].id : "");
  }

  function manejarCambioMunicipio(valor: string) {
    setMunicipioId(valor);
    setInstitucionId("");
    setSedeId("");
  }

  function manejarCambioInstitucion(valor: string) {
    setInstitucionId(valor);
    setSedeId("");
  }

  function actualizarDetalle(indice: number, campo: keyof DetalleMuestraEntrada, valor: string) {
    setDetalles((anterior) => anterior.map((fila, i) => (i === indice ? { ...fila, [campo]: valor } : fila)));
  }

  async function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault();
    const archivo = inputArchivoRef.current?.files?.[0];
    if (!valoresIniciales && !archivo) {
      setError("Carga el archivo de soporte.");
      return;
    }

    setGuardando(true);
    setError(null);

    const formData = new FormData();
    formData.append("zodeId", zodeId);
    formData.append("municipioId", municipioId);
    formData.append("institucionId", institucionId);
    formData.append("sedeId", sedeId);
    formData.append("operadorId", operadorId);
    formData.append("esquemaId", esquemaId);
    formData.append("fechaTomaMuestra", fechaTomaMuestra);
    formData.append("nombreLaboratorio", nombreLaboratorio);
    formData.append("resultado", resultado);
    formData.append("fechaResultado", fechaResultado);
    formData.append("observaciones", observaciones);
    formData.append("detalles", JSON.stringify(detalles));
    if (archivo) formData.append("archivo", archivo);

    const mensajeError = await onGuardar(formData);
    setGuardando(false);
    if (mensajeError) {
      setError(mensajeError);
      return;
    }
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Zode</label>
            <select
              value={zodeId}
              onChange={(e) => manejarCambioZode(e.target.value)}
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
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Municipio</label>
            <select
              value={municipioId}
              onChange={(e) => manejarCambioMunicipio(e.target.value)}
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
              onChange={(e) => manejarCambioInstitucion(e.target.value)}
              required
              disabled={!municipioId}
              className={CLASE_CAMPO}
            >
              <option value="">Selecciona...</option>
              {institucionesFiltradas.map((i) => (
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
              required
              disabled={!institucionId}
              className={CLASE_CAMPO}
            >
              <option value="">Selecciona...</option>
              {sedesFiltradas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Lote</label>
            <input
              value={zodeSeleccionado ? zodeSeleccionado.lote.nombre : ""}
              disabled
              className={CLASE_CAMPO}
              placeholder="Se asigna según el zode"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Operador</label>
            {operadoresDelZode.length > 1 ? (
              <select value={operadorId} onChange={(e) => setOperadorId(e.target.value)} className={CLASE_CAMPO}>
                <option value="">Selecciona...</option>
                {operadoresDelZode.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nombreRazonSocial}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={
                  operadoresDelZode.length === 1
                    ? operadoresDelZode[0].nombreRazonSocial
                    : zodeId
                      ? "Sin operador registrado para este zode"
                      : ""
                }
                disabled
                className={CLASE_CAMPO}
                placeholder="Se asigna según el zode"
              />
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tipo de visita</label>
            <select value={esquemaId} onChange={(e) => setEsquemaId(e.target.value)} required className={CLASE_CAMPO}>
              <option value="">Selecciona...</option>
              {esquemas.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha de toma de muestra</label>
            <input
              type="date"
              value={fechaTomaMuestra}
              onChange={(e) => setFechaTomaMuestra(e.target.value)}
              required
              className={CLASE_CAMPO}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre del laboratorio</label>
            <input
              value={nombreLaboratorio}
              onChange={(e) => setNombreLaboratorio(e.target.value)}
              required
              className={CLASE_CAMPO}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Resultado del laboratorio</label>
            <select value={resultado} onChange={(e) => setResultado(e.target.value)} required className={CLASE_CAMPO}>
              {RESULTADOS_LABORATORIO.map((r) => (
                <option key={r} value={r}>
                  {ETIQUETAS_RESULTADO_LABORATORIO[r]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha del resultado</label>
            <input
              type="date"
              value={fechaResultado}
              onChange={(e) => setFechaResultado(e.target.value)}
              required
              className={CLASE_CAMPO}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Observaciones</label>
          <textarea
            value={observaciones ?? ""}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            className={CLASE_CAMPO}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Detalle de la muestra <span className="font-normal text-slate-400">(ninguna línea es obligatoria)</span>
          </label>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="w-8 py-2 pl-3 pr-2">#</th>
                  <th className="py-2 pr-2">Producto</th>
                  <th className="py-2 pr-2">Examen</th>
                  <th className="w-40 py-2 pr-3">Cumplimiento</th>
                </tr>
              </thead>
              <tbody>
                {detalles.map((fila, indice) => (
                  <tr key={indice} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5 pl-3 pr-2 text-xs text-slate-400">{indice + 1}</td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={fila.producto}
                        onChange={(e) => actualizarDetalle(indice, "producto", e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={fila.examen}
                        onChange={(e) => actualizarDetalle(indice, "examen", e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </td>
                    <td className="py-1.5 pr-3">
                      <select
                        value={fila.cumplimiento}
                        onChange={(e) => actualizarDetalle(indice, "cumplimiento", e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">—</option>
                        {CUMPLIMIENTOS_MUESTRA.map((c) => (
                          <option key={c} value={c}>
                            {ETIQUETAS_CUMPLIMIENTO_MUESTRA[c]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Archivo de soporte</label>
          {valoresIniciales && (
            <a
              href={valoresIniciales.archivoUrl}
              target="_blank"
              rel="noreferrer"
              className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <FileText className="h-4 w-4" /> Ver archivo actual ({valoresIniciales.archivoNombre})
            </a>
          )}
          <input
            ref={inputArchivoRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            required={!valoresIniciales}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
          {valoresIniciales && <p className="mt-1 text-xs text-slate-500">Déjalo vacío para conservar el archivo actual.</p>}
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar"}
        </Button>
      </form>
    </Card>
  );
}
