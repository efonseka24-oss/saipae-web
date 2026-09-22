"use client";

import { useState } from "react";
import { CalendarDays, FileDown, Layers } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Lote = { id: string; nombre: string; departamento: { nombre: string } };

const CLASE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function mesActual(): string {
  return new Date().toISOString().slice(0, 7);
}

async function descargarArchivo(respuesta: Response, nombrePorDefecto: string): Promise<string | null> {
  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => null);
    return datos?.error ?? "No se pudo generar el informe.";
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
  return null;
}

export function InformesManager({ lotes }: { lotes: Lote[] }) {
  const [loteId, setLoteId] = useState(lotes[0]?.id ?? "");
  const [mes, setMes] = useState(mesActual());
  const [generandoMensual, setGenerandoMensual] = useState(false);
  const [generandoGeneral, setGenerandoGeneral] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generarMensual() {
    if (!loteId || !mes) return;
    setGenerandoMensual(true);
    setError(null);
    const [anio, mesNum] = mes.split("-").map(Number);
    const respuesta = await fetch("/api/informes/consolidado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loteId, tipo: "MENSUAL", anio, mes: mesNum }),
    });
    const mensajeError = await descargarArchivo(respuesta, "Informe_Mensual.docx");
    setGenerandoMensual(false);
    if (mensajeError) setError(mensajeError);
  }

  async function generarGeneral() {
    if (!loteId) return;
    setGenerandoGeneral(true);
    setError(null);
    const respuesta = await fetch("/api/informes/consolidado", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loteId, tipo: "GENERAL" }),
    });
    const mensajeError = await descargarArchivo(respuesta, "Informe_General.docx");
    setGenerandoGeneral(false);
    if (mensajeError) setError(mensajeError);
  }

  if (lotes.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">
          Primero crea al menos un lote en{" "}
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
      <Card className="max-w-md">
        <label className="mb-1 block text-sm font-medium text-slate-700">Lote</label>
        <select value={loteId} onChange={(e) => setLoteId(e.target.value)} className={CLASE_CAMPO}>
          {lotes.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre} — {l.departamento.nombre}
            </option>
          ))}
        </select>
      </Card>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informe Mensual</CardTitle>
          </CardHeader>
          <p className="mb-4 text-sm text-slate-500">Toda la información generada dentro del mes seleccionado, para el lote elegido.</p>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Mes</label>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className={`${CLASE_CAMPO} pl-9`} />
            </div>
          </div>
          <Button onClick={generarMensual} disabled={generandoMensual}>
            <FileDown className="h-4 w-4" />
            {generandoMensual ? "Generando..." : "Generar informe mensual"}
          </Button>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informe General</CardTitle>
          </CardHeader>
          <p className="mb-4 text-sm text-slate-500">
            Consolida toda la información recopilada desde el inicio del proyecto hasta hoy, para el lote elegido.
          </p>
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
            <Layers className="h-4 w-4" />
            Sin límite de fecha inicial
          </div>
          <Button onClick={generarGeneral} disabled={generandoGeneral} variante="outline">
            <FileDown className="h-4 w-4" />
            {generandoGeneral ? "Generando..." : "Generar informe general"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
