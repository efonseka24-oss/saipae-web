"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, AlertTriangle, Download } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { ResultadoCargaPae } from "@/lib/simat";

// Las plantillas son CSV separados por ";" (Excel en español los abre directo).
const TIPOS = {
  beneficiarios: {
    boton: "Cargar beneficiarios PAE (Excel o CSV)",
    titulo: "Carga de beneficiarios del PAE",
    descripcion: (
      <>
        Archivo de Excel (.xlsx) o CSV con la columna <span className="font-mono">ID</span> o <span className="font-mono">DOCUMENTO</span> de
        cada estudiante beneficiario. Los estudiantes deben estar cargados antes en el SIMAT.
      </>
    ),
    plantilla: "﻿ID;DOCUMENTO\r\n123456789;1012345678\r\n",
    archivoPlantilla: "plantilla-beneficiarios-pae.csv",
    procesados: "marcado(s) como beneficiario",
  },
  entregas: {
    boton: "Cargar entregas PAE (Excel o CSV)",
    titulo: "Carga de entregas del PAE",
    descripcion: (
      <>
        Archivo de Excel (.xlsx) o CSV con una fila por entrega, con las columnas <span className="font-mono">ID</span> o{" "}
        <span className="font-mono">DOCUMENTO</span> y <span className="font-mono">FECHA</span> (AAAA-MM-DD o DD/MM/AAAA). Solo se
        aceptan beneficiarios del PAE y días de lunes a viernes.
      </>
    ),
    plantilla: "﻿ID;DOCUMENTO;FECHA\r\n123456789;1012345678;2026-10-26\r\n123456789;1012345678;2026-10-27\r\n",
    archivoPlantilla: "plantilla-entregas-pae.csv",
    procesados: "entrega(s) registrada(s)",
  },
} as const;

export function CargaPae({ tipo }: { tipo: keyof typeof TIPOS }) {
  const config = TIPOS[tipo];
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [reemplazar, setReemplazar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCargaPae | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function descargarPlantilla() {
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob([config.plantilla], { type: "text/csv;charset=utf-8" }));
    enlace.download = config.archivoPlantilla;
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

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
    formData.append("tipo", tipo);
    if (tipo === "beneficiarios" && reemplazar) formData.append("reemplazar", "true");

    const respuesta = await fetch("/api/simat/carga-pae", { method: "POST", body: formData });
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
        {config.boton}
      </Button>
    );
  }

  return (
    <Card className="w-full max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{config.titulo}</h2>
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

      <p className="mb-3 text-sm text-slate-500">{config.descripcion} Se lee la primera hoja y la primera fila debe tener los encabezados.</p>
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
        {tipo === "beneficiarios" && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={reemplazar} onChange={(e) => setReemplazar(e.target.checked)} />
            Desmarcar a los beneficiarios que no estén en el archivo
          </label>
        )}
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" disabled={cargando}>
          {cargando ? "Procesando..." : "Cargar archivo"}
        </Button>
      </form>

      {resultado && (
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap gap-2">
            <Badge variante="slate">{resultado.totalFilas.toLocaleString("es-CO")} fila(s) procesadas</Badge>
            <Badge variante="green">
              {resultado.procesados.toLocaleString("es-CO")} {config.procesados}
            </Badge>
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
