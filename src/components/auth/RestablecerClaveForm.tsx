"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function RestablecerClaveForm() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [cedula, setCedula] = useState("");
  const [claveNueva, setClaveNueva] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState(false);

  async function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);

    if (claveNueva !== confirmarClave) {
      setError("Las claves no coinciden.");
      return;
    }

    setCargando(true);
    try {
      const respuesta = await fetch("/api/auth/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, cedula, claveNueva }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos.error ?? "No se pudo restablecer la clave.");
        setCargando(false);
        return;
      }

      setListo(true);
      setCargando(false);
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("No se pudo conectar con el servidor.");
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Reiniciar clave</h1>
          <p className="text-sm text-slate-500">
            Escribe tu usuario, tu cédula (como control de seguridad) y define una nueva contraseña.
          </p>
        </div>

        {listo ? (
          <p className="flex items-center justify-center gap-1.5 text-sm font-medium text-emerald-600">
            <Check className="h-4 w-4" /> Clave actualizada. Redirigiendo al inicio de sesión...
          </p>
        ) : (
          <form onSubmit={manejarEnvio} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="usuario">
                Usuario
              </label>
              <input
                id="usuario"
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                disabled={cargando}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="cedula">
                Cédula
              </label>
              <input
                id="cedula"
                type="text"
                inputMode="numeric"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                disabled={cargando}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Número de cédula registrado por el administrador"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="claveNueva">
                Nueva clave
              </label>
              <input
                id="claveNueva"
                type="password"
                value={claveNueva}
                onChange={(e) => setClaveNueva(e.target.value)}
                disabled={cargando}
                required
                minLength={6}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="confirmarClave">
                Confirmar nueva clave
              </label>
              <input
                id="confirmarClave"
                type="password"
                value={confirmarClave}
                onChange={(e) => setConfirmarClave(e.target.value)}
                disabled={cargando}
                required
                minLength={6}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoComplete="new-password"
              />
            </div>

            {error && <p className="text-sm font-medium text-red-600">{error}</p>}

            <Button type="submit" disabled={cargando} className="w-full">
              {cargando ? "Guardando..." : "Reiniciar clave"}
            </Button>
          </form>
        )}

        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a iniciar sesión
        </Link>
      </div>
    </div>
  );
}
