"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, AlertTriangle, Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ResultadoCargaSimat } from "@/lib/simat";

// Plantilla de ejemplo (CSV separado por ";", que Excel en español abre directo).
const PLANTILLA = "﻿ID;DOCUMENTO;NOMBRE;DANE SEDE\r\n123456789;1012345678;NOMBRE APELLIDO;123456000001\r\n";

function descargarPlantilla() {
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(new Blob([PLANTILLA], { type: "text/csv;charset=utf-8" }));
  enlace.download = "plantilla-simat.csv";
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

export function CargaMasivaSimat() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCargaSimat | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function cargar(evento: React.FormEvent) {
    evento.preventDefault();
    const archivo = inputRef.current?.files?.[0];
    if (!archivo) {
      setError("Selecciona el archivo (Excel o CSV).");
      return;
    }

    setCargando(true);
    setError(null);
    setResultado(null);

    const formData = new FormData();
    formData.append("archivo", archivo);

    const respuesta = await fetch("/api/simat/carga-masiva", { method: "POST", body: formData });
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
        Cargar archivo SIMAT (Excel o CSV)
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Carga masiva de estudiantes SIMAT</h2>
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
        Archivo de Excel (.xlsx) o CSV con columnas <span className="font-mono">ID, DOCUMENTO, NOMBRE, DANE SEDE</span> (el nombre también puede venir
        en <span className="font-mono">NOMBRE1, NOMBRE2, APELLIDO1, APELLIDO2</span>). La sede debe existir en Registro; de ella se
        toman la institución, el municipio, el zode y el lote. Si el ID ya existe, el estudiante se actualiza; si no, se crea. Se
        lee la primera hoja del Excel y la primera fila debe tener los encabezados.
      </p>
      <button
        type="button"
        onClick={descargarPlantilla}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <Download className="h-4 w-4" /> Descargar plantilla
      </button>

      <form onSubmit={cargar} className="grid gap-4">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
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
            <Badge variante="slate">{resultado.totalFilas.toLocaleString("es-CO")} fila(s) procesadas</Badge>
            <Badge variante="green">{resultado.creados.toLocaleString("es-CO")} creado(s)</Badge>
            <Badge variante="blue">{resultado.actualizados.toLocaleString("es-CO")} actualizado(s)</Badge>
            <Badge variante="slate">{resultado.sinCambios.toLocaleString("es-CO")} sin cambios</Badge>
            {resultado.errores.length > 0 && <Badge variante="red">{resultado.errores.length} fila(s) con error</Badge>}
          </div>

          {resultado.errores.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-700">
                <AlertTriangle className="h-4 w-4" /> Filas con error
              </div>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-xs text-red-700">
                {resultado.errores.slice(0, 500).map((e, i) => (
                  <li key={i}>
                    Fila {e.fila}: {e.mensaje}
                  </li>
                ))}
                {resultado.errores.length > 500 && <li>… y {resultado.errores.length - 500} más.</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
