"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, ChevronDown, ChevronUp, FileText, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { CategoriaFormato } from "@/lib/mapasPlantillas";

export type InfoPlantilla = {
  categoria: CategoriaFormato;
  etiqueta: string;
  archivo: string;
  existe: boolean;
  tamanoBytes: number;
  actualizadoEl: string | null;
  totalMarcadores: number;
  marcadoresSinMapear: number;
};

type Marcador = { token: string; mapeado: boolean; indiceColumna: number | null };

function formatearTamano(bytes: number): string {
  if (bytes === 0) return "—";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function formatearFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

function FilaPlantilla({ plantilla }: { plantilla: InfoPlantilla }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mostrandoMarcadores, setMostrandoMarcadores] = useState(false);
  const [cargandoMarcadores, setCargandoMarcadores] = useState(false);
  const [marcadores, setMarcadores] = useState<Marcador[] | null>(null);

  async function reemplazar(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    setSubiendo(true);
    setError(null);

    const formData = new FormData();
    formData.append("plantilla", archivo);

    const respuesta = await fetch(`/api/editor-formatos/${plantilla.categoria}/reemplazar`, {
      method: "POST",
      body: formData,
    });

    if (!respuesta.ok) {
      const datos = await respuesta.json();
      setError(datos.error ?? "No se pudo reemplazar la plantilla.");
      setSubiendo(false);
      return;
    }

    setSubiendo(false);
    setMarcadores(null);
    setMostrandoMarcadores(false);
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  async function alternarMarcadores() {
    if (mostrandoMarcadores) {
      setMostrandoMarcadores(false);
      return;
    }
    setMostrandoMarcadores(true);
    if (marcadores) return;

    setCargandoMarcadores(true);
    const respuesta = await fetch(`/api/editor-formatos/${plantilla.categoria}/marcadores`);
    const datos = await respuesta.json();
    setCargandoMarcadores(false);
    if (respuesta.ok) setMarcadores(datos);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-slate-400" />
          <div>
            <CardTitle>{plantilla.etiqueta}</CardTitle>
            <p className="text-xs text-slate-500">{plantilla.archivo}</p>
          </div>
        </div>
        {plantilla.existe ? (
          <Badge variante="green">Cargada</Badge>
        ) : (
          <Badge variante="amber">Sin plantilla</Badge>
        )}
      </CardHeader>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
        <span>Tamaño: {formatearTamano(plantilla.tamanoBytes)}</span>
        <span>Actualizado: {formatearFecha(plantilla.actualizadoEl)}</span>
        {plantilla.existe && (
          <span className="inline-flex items-center gap-1.5">
            Marcadores: {plantilla.totalMarcadores}
            {plantilla.marcadoresSinMapear > 0 && (
              <Badge variante="amber" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {plantilla.marcadoresSinMapear} sin mapear
              </Badge>
            )}
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {plantilla.existe && (
          <Button variante="outline" onClick={() => window.open(`/api/editor-formatos/${plantilla.categoria}/descargar`, "_blank")}>
            <Download className="h-4 w-4" />
            Descargar
          </Button>
        )}

        <input ref={inputRef} type="file" accept=".docx" onChange={reemplazar} className="hidden" />
        <Button type="button" variante="outline" disabled={subiendo} onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          {subiendo ? "Subiendo..." : plantilla.existe ? "Reemplazar plantilla" : "Cargar plantilla"}
        </Button>

        {plantilla.existe && (
          <Button type="button" variante="ghost" onClick={alternarMarcadores}>
            {mostrandoMarcadores ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Ver marcadores
          </Button>
        )}
      </div>

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

      {mostrandoMarcadores && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {cargandoMarcadores && <p className="text-sm text-slate-500">Cargando marcadores...</p>}
          {marcadores && marcadores.length === 0 && (
            <p className="text-sm text-slate-500">Esta plantilla no tiene marcadores {"{{ }}"}.</p>
          )}
          {marcadores && marcadores.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {marcadores.map((m) => (
                <Badge key={m.token} variante={m.mapeado ? "green" : "amber"}>
                  {m.token}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export function EditorFormatosManager({ plantillasIniciales }: { plantillasIniciales: InfoPlantilla[] }) {
  return (
    <div className="space-y-4">
      {plantillasIniciales.map((p) => (
        <FilaPlantilla key={p.categoria} plantilla={p} />
      ))}
    </div>
  );
}
