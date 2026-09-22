"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function LoginForm() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const respuesta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, clave }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setError(datos.error ?? "No se pudo iniciar sesión.");
        setCargando(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
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
          <h1 className="text-xl font-bold text-slate-900">SAIPAE</h1>
          <p className="text-sm text-slate-500">Panel Administrativo</p>
        </div>

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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="clave">
              Contraseña
            </label>
            <input
              id="clave"
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              disabled={cargando}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <Button
            type="submit"
            disabled={cargando || !usuario || !clave}
            className="w-full"
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>

        <Link
          href="/login/recuperar"
          className="mt-4 block text-center text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ¿Olvidó su contraseña?
        </Link>
      </div>
    </div>
  );
}
