"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Flag } from "lucide-react";
import { Button } from "@/components/ui/Button";

const FRASE = "FINALIZAR PROYECTO";

export function FinalizarProyectoForm() {
  const router = useRouter();
  const [confirmacion, setConfirmacion] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ nombre: string; bytes: number; filasBorradas: number } | null>(null);

  async function finalizar(evento: React.FormEvent) {
    evento.preventDefault();
    if (confirmacion !== FRASE) return;
    setProcesando(true);
    setError(null);

    try {
      const respuesta = await fetch("/api/administrador/proyecto/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmacion }),
      });
      const cuerpo = await respuesta.json();
      if (!respuesta.ok) {
        setError(cuerpo.error ?? "No se pudo finalizar el proyecto.");
        return;
      }
      setResultado(cuerpo);
      setConfirmacion("");
      // La copia ya está guardada en el servidor: se descarga de una vez.
      const enlace = document.createElement("a");
      enlace.href = `/api/administrador/proyecto/respaldos/${encodeURIComponent(cuerpo.nombre)}`;
      enlace.click();
      router.refresh();
    } catch {
      setError("Se perdió la conexión con el servidor. Revisa la lista de copias guardadas antes de volver a intentarlo.");
    } finally {
      setProcesando(false);
    }
  }

  if (resultado) {
    return (
      <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        <p className="font-semibold">Proyecto finalizado. El sistema quedó listo para empezar uno nuevo.</p>
        <p>
          Copia guardada en el servidor: <span className="font-mono">{resultado.nombre}</span> ({(resultado.bytes / 1024 / 1024).toFixed(1)} MB).{" "}
          {resultado.filasBorradas.toLocaleString("es-CO")} registro(s) borrados.
        </p>
        <a
          href={`/api/administrador/proyecto/respaldos/${encodeURIComponent(resultado.nombre)}`}
          className="inline-flex items-center gap-1.5 font-medium text-green-900 underline"
        >
          <Download className="h-4 w-4" /> Descargar de nuevo
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={finalizar} className="space-y-3">
      <label className="block text-sm text-slate-600">
        Para confirmar, escribe <span className="font-mono font-semibold">{FRASE}</span>
        <input
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
          disabled={procesando}
          autoComplete="off"
          className="mt-1 block w-full max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </label>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      <Button type="submit" variante="danger" disabled={procesando || confirmacion !== FRASE}>
        <Flag className="h-4 w-4" />
        {procesando ? "Guardando copia y borrando…" : "Finalizar proyecto"}
      </Button>
      {procesando && <p className="text-xs text-slate-500">No cierres esta ventana. Con muchas fotos puede tardar varios minutos.</p>}
    </form>
  );
}
