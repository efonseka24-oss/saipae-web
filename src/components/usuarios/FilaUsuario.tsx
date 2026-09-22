"use client";

import { Fragment, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Pencil, Trash2, Check, X, KeyRound, Power, Upload, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { SelectorModulos } from "@/components/usuarios/SelectorModulos";
import { parsearModulosPermitidos } from "@/lib/permisosModulos";
import { MODULOS } from "@/lib/modulos";

type Usuario = {
  id: string;
  usuario: string;
  nombre: string;
  cedula: string;
  activo: boolean;
  cargo: string | null;
  firmaUrl: string | null;
  modulosPermitidos: string;
};

function FirmaCelda({
  usuario,
  inputRef,
  subiendo,
  onSubir,
}: {
  usuario: Usuario;
  inputRef: React.RefObject<HTMLInputElement | null>;
  subiendo: boolean;
  onSubir: (evento: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      {usuario.firmaUrl ? (
        <Image src={usuario.firmaUrl} alt={`Firma de ${usuario.nombre}`} width={64} height={28} className="h-7 w-16 object-contain" />
      ) : (
        <PenLine className="h-5 w-5 text-slate-300" />
      )}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onSubir} className="hidden" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600"
      >
        <Upload className="h-3.5 w-3.5" /> {subiendo ? "Subiendo..." : usuario.firmaUrl ? "Cambiar" : "Subir"}
      </button>
    </div>
  );
}

export function FilaUsuario({ usuario, esUsuarioActual }: { usuario: Usuario; esUsuarioActual: boolean }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [usuarioTexto, setUsuarioTexto] = useState(usuario.usuario);
  const [nombre, setNombre] = useState(usuario.nombre);
  const [cedula, setCedula] = useState(usuario.cedula);
  const [cargo, setCargo] = useState(usuario.cargo ?? "");
  const [modulosPermitidos, setModulosPermitidos] = useState<string[]>(() => parsearModulosPermitidos(usuario.modulosPermitidos));
  const [claveNueva, setClaveNueva] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subiendoFirma, setSubiendoFirma] = useState(false);
  const inputFirmaRef = useRef<HTMLInputElement>(null);

  async function subirFirma(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    setSubiendoFirma(true);
    const formData = new FormData();
    formData.append("firma", archivo);
    const respuesta = await fetch(`/api/usuarios/${usuario.id}/firma`, { method: "POST", body: formData });
    setSubiendoFirma(false);
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      alert(datos.error ?? "No se pudo subir la firma.");
      return;
    }
    if (inputFirmaRef.current) inputFirmaRef.current.value = "";
    router.refresh();
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    const respuesta = await fetch(`/api/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario: usuarioTexto,
        nombre,
        cedula,
        cargo,
        modulosPermitidos,
        claveNueva: claveNueva || undefined,
      }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      setError(datos.error ?? "No se pudo guardar.");
      setGuardando(false);
      return;
    }
    setGuardando(false);
    setEditando(false);
    setClaveNueva("");
    router.refresh();
  }

  async function alternarActivo() {
    const respuesta = await fetch(`/api/usuarios/${usuario.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario: usuario.usuario,
        nombre: usuario.nombre,
        cedula: usuario.cedula,
        activo: !usuario.activo,
      }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      alert(datos.error ?? "No se pudo cambiar el acceso.");
      return;
    }
    router.refresh();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar al usuario "${usuario.usuario}"?`)) return;
    const respuesta = await fetch(`/api/usuarios/${usuario.id}`, { method: "DELETE" });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      alert(datos.error ?? "No se pudo eliminar.");
      return;
    }
    router.refresh();
  }

  if (editando) {
    return (
      <Fragment>
      <tr className="border-b border-slate-100 bg-slate-50">
        <td className="py-2 pr-4">
          <input
            value={usuarioTexto}
            onChange={(e) => setUsuarioTexto(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="py-2 pr-4">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
          <div className="mt-1.5 flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-slate-400" />
            <input
              value={claveNueva}
              onChange={(e) => setClaveNueva(e.target.value)}
              placeholder="Nueva clave (opcional)"
              type="password"
              minLength={6}
              className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
              autoComplete="new-password"
            />
          </div>
        </td>
        <td className="py-2 pr-4 align-top">
          <input
            value={cedula}
            onChange={(e) => setCedula(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="py-2 pr-4 align-top">
          <input
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="Opcional"
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="py-2 pr-4 align-top">
          <FirmaCelda usuario={usuario} inputRef={inputFirmaRef} subiendo={subiendoFirma} onSubir={subirFirma} />
        </td>
        <td className="py-2 pr-4 align-top">
          <Badge variante={modulosPermitidos.length === MODULOS.length ? "green" : "amber"}>
            {modulosPermitidos.length === MODULOS.length ? "Todos" : `${modulosPermitidos.length}/${MODULOS.length}`}
          </Badge>
        </td>
        <td className="py-2 pr-4 align-top">
          <Badge variante={usuario.activo ? "green" : "slate"}>{usuario.activo ? "Activo" : "Inactivo"}</Badge>
        </td>
        <td className="py-2 pr-4 align-top">
          {error && <p className="mb-1 text-xs font-medium text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={guardar}
              disabled={guardando}
              className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50"
              title="Guardar"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setEditando(false);
                setUsuarioTexto(usuario.usuario);
                setNombre(usuario.nombre);
                setCedula(usuario.cedula);
                setCargo(usuario.cargo ?? "");
                setModulosPermitidos(parsearModulosPermitidos(usuario.modulosPermitidos));
                setClaveNueva("");
                setError(null);
              }}
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              title="Cancelar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
      <tr className="border-b border-slate-100 bg-slate-50 last:border-0">
        <td colSpan={8} className="pb-3 pt-0">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Módulos con acceso</label>
          <SelectorModulos value={modulosPermitidos} onChange={setModulosPermitidos} />
        </td>
      </tr>
      </Fragment>
    );
  }

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 pr-4 font-medium text-slate-900">{usuario.usuario}</td>
      <td className="py-3 pr-4 text-slate-600">
        {usuario.nombre}
        {esUsuarioActual && (
          <Badge variante="blue" className="ml-2">
            Tú
          </Badge>
        )}
      </td>
      <td className="py-3 pr-4 text-slate-600">{usuario.cedula}</td>
      <td className="py-3 pr-4 text-slate-600">{usuario.cargo || "—"}</td>
      <td className="py-3 pr-4">
        <FirmaCelda usuario={usuario} inputRef={inputFirmaRef} subiendo={subiendoFirma} onSubir={subirFirma} />
      </td>
      <td className="py-3 pr-4">
        <Badge variante={modulosPermitidos.length === MODULOS.length ? "green" : "amber"}>
          {modulosPermitidos.length === MODULOS.length ? "Todos" : `${modulosPermitidos.length}/${MODULOS.length}`}
        </Badge>
      </td>
      <td className="py-3 pr-4">
        <Badge variante={usuario.activo ? "green" : "slate"}>{usuario.activo ? "Activo" : "Inactivo"}</Badge>
      </td>
      <td className="py-3 pr-4">
        <div className="flex gap-2">
          <button
            onClick={() => setEditando(true)}
            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={alternarActivo}
            disabled={esUsuarioActual}
            className="rounded-md p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30"
            title={
              esUsuarioActual
                ? "No puedes desactivar tu propio usuario"
                : usuario.activo
                  ? "Desactivar acceso"
                  : "Activar acceso"
            }
          >
            <Power className="h-4 w-4" />
          </button>
          <button
            onClick={eliminar}
            disabled={esUsuarioActual}
            className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
            title={esUsuarioActual ? "No puedes eliminar tu propio usuario" : "Eliminar"}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
