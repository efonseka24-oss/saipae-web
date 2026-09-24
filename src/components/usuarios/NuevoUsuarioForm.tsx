"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SelectorModulos } from "@/components/usuarios/SelectorModulos";
import { TODOS_LOS_MODULOS_IDS } from "@/lib/permisosModulos";

export function NuevoUsuarioForm() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [cargo, setCargo] = useState("");
  const [correo, setCorreo] = useState("");
  const [firma, setFirma] = useState<File | null>(null);
  const inputFirmaRef = useRef<HTMLInputElement>(null);
  const [clave, setClave] = useState("");
  const [modulosPermitidos, setModulosPermitidos] = useState<string[]>(TODOS_LOS_MODULOS_IDS);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function crear(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);

    if (!firma) {
      setError("La firma es obligatoria: carga una imagen.");
      setGuardando(false);
      return;
    }

    const datos = new FormData();
    datos.append("usuario", usuario);
    datos.append("nombre", nombre);
    datos.append("cedula", cedula);
    datos.append("cargo", cargo);
    datos.append("correo", correo);
    datos.append("clave", clave);
    datos.append("modulosPermitidos", JSON.stringify(modulosPermitidos));
    datos.append("firma", firma);
    const respuesta = await fetch("/api/usuarios", { method: "POST", body: datos });

    if (!respuesta.ok) {
      const datos = await respuesta.json();
      setError(datos.error ?? "No se pudo crear el usuario.");
      setGuardando(false);
      return;
    }

    setUsuario("");
    setNombre("");
    setCedula("");
    setCargo("");
    setCorreo("");
    setFirma(null);
    if (inputFirmaRef.current) inputFirmaRef.current.value = "";
    setClave("");
    setModulosPermitidos(TODOS_LOS_MODULOS_IDS);
    setAbierto(false);
    setGuardando(false);
    router.refresh();
  }

  if (!abierto) {
    return (
      <Button onClick={() => setAbierto(true)}>
        <Plus className="h-4 w-4" />
        Nuevo usuario
      </Button>
    );
  }

  return (
    <Card className="mb-6 w-full max-w-md">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Nuevo usuario</h2>
        <button onClick={() => setAbierto(false)} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={crear} className="grid gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Usuario</label>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nombre completo</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Cédula</label>
          <input
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Se usa como control para reiniciar la clave"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Cargo</label>
          <input
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Se imprime en las cartas PQRS si es responsable"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Correo</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Con este correo se unen sus visitas de la app"
            autoComplete="off"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Firma</label>
          <input
            ref={inputFirmaRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setFirma(e.target.files?.[0] ?? null)}
            required
            className="w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />
          <p className="mt-1 text-xs text-slate-500">Imagen PNG, JPG o WEBP, máximo 5 MB.</p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Clave</label>
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Módulos con acceso</label>
          <SelectorModulos value={modulosPermitidos} onChange={setModulosPermitidos} />
        </div>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <div>
          <Button type="submit" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar usuario"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
