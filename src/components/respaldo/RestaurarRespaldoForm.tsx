"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Resultado = {
  creadoEn: string;
  tablas: number;
  filas: number;
  archivos: number;
  archivosFaltantes: number;
  problemasRelaciones: number;
};

export function RestaurarRespaldoForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [confirmacion, setConfirmacion] = useState("");
  const [progreso, setProgreso] = useState<number | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  // XMLHttpRequest (y no fetch) para mostrar el avance de la subida. El ZIP va
  // como cuerpo de la petición, sin formulario, para que el servidor lo reciba
  // por partes.
  function restaurar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!archivo || confirmacion !== "RESTAURAR") return;
    setError(null);
    setResultado(null);
    setProgreso(0);

    const peticion = new XMLHttpRequest();
    peticion.open("POST", "/api/administrador/respaldo/restaurar");
    peticion.setRequestHeader("Content-Type", "application/zip");
    peticion.setRequestHeader("X-Confirmacion", "RESTAURAR");
    peticion.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgreso(Math.round((e.loaded / e.total) * 100));
    };
    peticion.upload.onload = () => {
      setProgreso(100);
      setProcesando(true);
    };
    peticion.onload = () => {
      setProcesando(false);
      setProgreso(null);
      let cuerpo: (Resultado & { error?: string }) | null = null;
      try {
        cuerpo = JSON.parse(peticion.responseText);
      } catch {
        cuerpo = null;
      }
      if (peticion.status >= 200 && peticion.status < 300 && cuerpo) {
        setResultado(cuerpo);
        setArchivo(null);
        setConfirmacion("");
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } else {
        setError(cuerpo?.error ?? `El servidor respondió con el código ${peticion.status}.`);
      }
    };
    peticion.onerror = () => {
      setProcesando(false);
      setProgreso(null);
      setError("Se perdió la conexión con el servidor durante la restauración.");
    };
    peticion.send(archivo);
  }

  const ocupado = progreso !== null;

  return (
    <form onSubmit={restaurar} className="space-y-4">
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        Reemplaza <strong>todos</strong> los datos actuales del sistema (visitas, usuarios, Registro, esquemas, PQRS...) por los de la
        copia, y devuelve sus archivos a su lugar. Antes de empezar se guarda en el servidor una copia de la base actual. La auditoría no
        se borra.
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Archivo de copia de seguridad (.zip)</label>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          disabled={ocupado}
          onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
        />
        {archivo && <p className="mt-1 text-xs text-slate-500">{(archivo.size / 1024 / 1024).toFixed(1)} MB</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Para confirmar, escriba <strong>RESTAURAR</strong>
        </label>
        <input
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          disabled={ocupado}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>

      <Button type="submit" variante="danger" disabled={!archivo || confirmacion !== "RESTAURAR" || ocupado}>
        <Upload className="h-4 w-4" />
        Restaurar copia de seguridad
      </Button>

      {ocupado && (
        <div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full bg-red-500 transition-all" style={{ width: `${progreso}%` }} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {procesando ? "Restaurando datos y archivos... no cierre esta página." : `Subiendo el archivo: ${progreso}%`}
          </p>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {resultado && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          <p className="font-semibold">Copia restaurada.</p>
          <p>
            Copia del {new Date(resultado.creadoEn).toLocaleString("es-CO", { timeZone: "America/Bogota" })}:{" "}
            {resultado.filas.toLocaleString("es-CO")} registros en {resultado.tablas} tablas y{" "}
            {resultado.archivos.toLocaleString("es-CO")} archivos.
          </p>
          {resultado.archivosFaltantes > 0 && (
            <p className="text-amber-700">{resultado.archivosFaltantes} archivo(s) del manifiesto no venían en el ZIP.</p>
          )}
          {resultado.problemasRelaciones > 0 && (
            <p className="text-amber-700">
              {resultado.problemasRelaciones} registro(s) apuntan a datos que no existen en la copia; revise la información.
            </p>
          )}
          <p className="mt-1">Si cambió su usuario o clave en la copia, cierre sesión y vuelva a entrar.</p>
        </div>
      )}
    </form>
  );
}
