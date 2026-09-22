"use client";

import { useRef, useState } from "react";
import { X, FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TIPOS_PETICION_PQRS, ETIQUETAS_TIPO_PETICION_PQRS } from "@/lib/pqrs";
import type { PeticionPqrs, UsuarioResponsable } from "@/components/pqrs/tipos";

function fechaParaInput(fecha: string | Date): string {
  return new Date(fecha).toISOString().slice(0, 10);
}

const CLASE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export function PeticionFormulario({
  titulo,
  usuarios,
  valoresIniciales,
  onGuardar,
  onCancelar,
}: {
  titulo: string;
  usuarios: UsuarioResponsable[];
  valoresIniciales?: PeticionPqrs;
  onGuardar: (formData: FormData) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [fechaRadicado, setFechaRadicado] = useState(
    valoresIniciales ? fechaParaInput(valoresIniciales.fechaRadicado) : new Date().toISOString().slice(0, 10)
  );
  const [peticionario, setPeticionario] = useState(valoresIniciales?.peticionario ?? "");
  const [tipoPeticion, setTipoPeticion] = useState<string>(valoresIniciales?.tipoPeticion ?? TIPOS_PETICION_PQRS[0]);
  const [asunto, setAsunto] = useState(valoresIniciales?.asunto ?? "");
  const [responsableId, setResponsableId] = useState(valoresIniciales?.responsableId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

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
    formData.append("fechaRadicado", fechaRadicado);
    formData.append("peticionario", peticionario);
    formData.append("tipoPeticion", tipoPeticion);
    formData.append("asunto", asunto);
    formData.append("responsableId", responsableId);
    if (archivo) formData.append("archivo", archivo);

    const mensajeError = await onGuardar(formData);
    setGuardando(false);
    if (mensajeError) setError(mensajeError);
  }

  return (
    <Card className="max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
        <button onClick={onCancelar} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={manejarEnvio} className="grid gap-4">
        {valoresIniciales && (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Radicado de entrada: <span className="font-mono font-semibold text-slate-900">{valoresIniciales.radicadoEntrada}</span>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha de radicado</label>
            <input
              type="date"
              value={fechaRadicado}
              onChange={(e) => setFechaRadicado(e.target.value)}
              required
              className={CLASE_CAMPO}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tipo de petición</label>
            <select value={tipoPeticion} onChange={(e) => setTipoPeticion(e.target.value)} required className={CLASE_CAMPO}>
              {TIPOS_PETICION_PQRS.map((t) => (
                <option key={t} value={t}>
                  {ETIQUETAS_TIPO_PETICION_PQRS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Peticionario</label>
          <input value={peticionario} onChange={(e) => setPeticionario(e.target.value)} required className={CLASE_CAMPO} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Asunto</label>
          <input value={asunto} onChange={(e) => setAsunto(e.target.value)} required className={CLASE_CAMPO} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Responsable</label>
          <select value={responsableId} onChange={(e) => setResponsableId(e.target.value)} required className={CLASE_CAMPO}>
            <option value="">Selecciona...</option>
            {usuarios.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
              </option>
            ))}
          </select>
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
