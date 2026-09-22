"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type ResultadoCarga = {
  totalFilas: number;
  municipiosCreados: number;
  institucionesCreadas: number;
  institucionesActualizadas: number;
  sedesCreadas: number;
  sedesActualizadas: number;
  errores: { fila: number; mensaje: string }[];
};

export function CargaMasivaRegistro() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCarga | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function cargar(evento: React.FormEvent) {
    evento.preventDefault();
    const archivo = inputRef.current?.files?.[0];
    if (!archivo) {
      setError("Selecciona el archivo CSV.");
      return;
    }

    setCargando(true);
    setError(null);
    setResultado(null);

    const formData = new FormData();
    formData.append("archivo", archivo);

    const respuesta = await fetch("/api/registro/carga-masiva", { method: "POST", body: formData });
    const datos = await respuesta.json();
    setCargando(false);

    if (!respuesta.ok) {
      setError(datos.error ?? "No se pudo procesar el archivo.");
      return;
    }

    setResultado(datos);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  if (!abierto) {
    return (
      <Button variante="outline" onClick={() => setAbierto(true)}>
        <Upload className="h-4 w-4" />
        Carga masiva (Zode → Institución → Sede)
      </Button>
    );
  }

  return (
    <Card className="mb-6 max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Carga masiva de Municipio, Institución y Sede</h2>
        <button
          onClick={() => {
            setAbierto(false);
            setResultado(null);
            setError(null);
          }}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mb-3 text-sm text-slate-500">
        Archivo CSV con columnas <span className="font-mono">ZODES, MUNICIPIO, INSTITUCION, DANE IE, SEDE, DANE SEDE</span>. El
        zode debe existir ya en Registro (con su lote); el municipio se crea automáticamente si hace falta. La institución y la
        sede se identifican por su número DANE: si ya existen se actualizan, si no se crean.
      </p>

      <form onSubmit={cargar} className="grid gap-4">
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" disabled={cargando}>
          {cargando ? "Procesando..." : "Cargar archivo"}
        </Button>
      </form>

      {resultado && (
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-2">
            <Badge variante="slate">{resultado.totalFilas} fila(s) procesadas</Badge>
            <Badge variante="green">{resultado.municipiosCreados} municipio(s) creados</Badge>
            <Badge variante="green">{resultado.institucionesCreadas} institución(es) creadas</Badge>
            <Badge variante="blue">{resultado.institucionesActualizadas} institución(es) actualizadas</Badge>
            <Badge variante="green">{resultado.sedesCreadas} sede(s) creadas</Badge>
            <Badge variante="blue">{resultado.sedesActualizadas} sede(s) actualizadas</Badge>
            {resultado.errores.length > 0 && <Badge variante="red">{resultado.errores.length} fila(s) con error</Badge>}
          </div>

          {resultado.errores.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-700">
                <AlertTriangle className="h-4 w-4" /> Filas con error
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-red-700">
                {resultado.errores.map((e, i) => (
                  <li key={i}>
                    Fila {e.fila}: {e.mensaje}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
