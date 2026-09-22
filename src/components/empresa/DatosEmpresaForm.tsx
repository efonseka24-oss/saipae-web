"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Building2, Upload, Check, GalleryHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

export type DatosEmpresa = {
  nit: string;
  razonSocial: string;
  nombreComercial: string | null;
  direccion: string | null;
  ciudad: string | null;
  telefono: string | null;
  correo: string | null;
  sitioWeb: string | null;
  logoUrl: string | null;
  membreteUrl: string | null;
  representanteLegalNombre: string | null;
  representanteLegalCargo: string | null;
  fechaInicioInterventoria: string | Date | null;
  fechaFinInterventoria: string | Date | null;
  fechaInicioPae: string | Date | null;
  fechaFinPae: string | Date | null;
};

function fechaParaInput(fecha: string | Date | null): string {
  return fecha ? new Date(fecha).toISOString().slice(0, 10) : "";
}

function CampoImagen({
  titulo,
  descripcion,
  url,
  endpoint,
  campoFormulario,
  campoRespuesta,
  ancho,
  alto,
  anchoPreview,
  altoPreview,
  iconoVacio: IconoVacio,
  onSubido,
}: {
  titulo: string;
  descripcion: string;
  url: string | null;
  endpoint: string;
  campoFormulario: string;
  campoRespuesta: "logoUrl" | "membreteUrl";
  ancho: number;
  alto: number;
  anchoPreview: string;
  altoPreview: string;
  iconoVacio: React.ComponentType<{ className?: string }>;
  onSubido: (nuevaUrl: string) => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;

    setSubiendo(true);
    setError(null);

    const formData = new FormData();
    formData.append(campoFormulario, archivo);

    const respuesta = await fetch(endpoint, { method: "POST", body: formData });
    const datos = await respuesta.json();

    if (!respuesta.ok) {
      setError(datos.error ?? "No se pudo subir la imagen.");
      setSubiendo(false);
      return;
    }

    onSubido(datos[campoRespuesta]);
    setSubiendo(false);
    router.refresh();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <div className="flex items-center gap-6">
        <div
          className={`flex ${anchoPreview} ${altoPreview} shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50`}
        >
          {url ? (
            <Image src={url} alt={titulo} width={ancho} height={alto} className="h-full w-full object-contain" />
          ) : (
            <IconoVacio className="h-10 w-10 text-slate-300" />
          )}
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={subir}
            className="hidden"
          />
          <Button type="button" variante="outline" disabled={subiendo} onClick={() => inputRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {subiendo ? "Subiendo..." : url ? "Cambiar imagen" : "Subir imagen"}
          </Button>
          <p className="mt-2 text-xs text-slate-500">{descripcion}</p>
          {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
        </div>
      </div>
    </Card>
  );
}

export function DatosEmpresaForm({ datosIniciales }: { datosIniciales: DatosEmpresa }) {
  const router = useRouter();

  const [nit, setNit] = useState(datosIniciales.nit);
  const [razonSocial, setRazonSocial] = useState(datosIniciales.razonSocial);
  const [nombreComercial, setNombreComercial] = useState(datosIniciales.nombreComercial ?? "");
  const [direccion, setDireccion] = useState(datosIniciales.direccion ?? "");
  const [ciudad, setCiudad] = useState(datosIniciales.ciudad ?? "");
  const [telefono, setTelefono] = useState(datosIniciales.telefono ?? "");
  const [correo, setCorreo] = useState(datosIniciales.correo ?? "");
  const [sitioWeb, setSitioWeb] = useState(datosIniciales.sitioWeb ?? "");
  const [logoUrl, setLogoUrl] = useState(datosIniciales.logoUrl);
  const [membreteUrl, setMembreteUrl] = useState(datosIniciales.membreteUrl);
  const [representanteLegalNombre, setRepresentanteLegalNombre] = useState(datosIniciales.representanteLegalNombre ?? "");
  const [representanteLegalCargo, setRepresentanteLegalCargo] = useState(datosIniciales.representanteLegalCargo ?? "");
  const [fechaInicioInterventoria, setFechaInicioInterventoria] = useState(fechaParaInput(datosIniciales.fechaInicioInterventoria));
  const [fechaFinInterventoria, setFechaFinInterventoria] = useState(fechaParaInput(datosIniciales.fechaFinInterventoria));
  const [fechaInicioPae, setFechaInicioPae] = useState(fechaParaInput(datosIniciales.fechaInicioPae));
  const [fechaFinPae, setFechaFinPae] = useState(fechaParaInput(datosIniciales.fechaFinPae));

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardadoOk, setGuardadoOk] = useState(false);

  async function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    setGuardadoOk(false);

    const respuesta = await fetch("/api/empresa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nit,
        razonSocial,
        nombreComercial,
        direccion,
        ciudad,
        telefono,
        correo,
        sitioWeb,
        representanteLegalNombre,
        representanteLegalCargo,
        fechaInicioInterventoria,
        fechaFinInterventoria,
        fechaInicioPae,
        fechaFinPae,
      }),
    });

    if (!respuesta.ok) {
      const datos = await respuesta.json();
      setError(datos.error ?? "No se pudo guardar la información.");
      setGuardando(false);
      return;
    }

    setGuardando(false);
    setGuardadoOk(true);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <CampoImagen
          titulo="Logo de la empresa"
          descripcion="PNG, JPG, WEBP o SVG. Máximo 5 MB."
          url={logoUrl}
          endpoint="/api/empresa/logo"
          campoFormulario="logo"
          campoRespuesta="logoUrl"
          ancho={96}
          alto={96}
          anchoPreview="w-24"
          altoPreview="h-24"
          iconoVacio={Building2}
          onSubido={setLogoUrl}
        />
        <CampoImagen
          titulo="Membrete (encabezado de documentos)"
          descripcion="Imagen ancha para el encabezado de reportes/formatos. PNG, JPG, WEBP o SVG. Máximo 5 MB."
          url={membreteUrl}
          endpoint="/api/empresa/membrete"
          campoFormulario="membrete"
          campoRespuesta="membreteUrl"
          ancho={320}
          alto={80}
          anchoPreview="w-full"
          altoPreview="h-24"
          iconoVacio={GalleryHorizontal}
          onSubido={setMembreteUrl}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la empresa</CardTitle>
        </CardHeader>
        <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">NIT</label>
            <input
              value={nit}
              onChange={(e) => setNit(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ej. 901974314-5"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Razón social</label>
            <input
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ej. Unión Temporal InterPAE Bolívar 2025"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre comercial</label>
            <input
              value={nombreComercial}
              onChange={(e) => setNombreComercial(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Teléfono</label>
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Correo electrónico</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Sitio web</label>
            <input
              value={sitioWeb}
              onChange={(e) => setSitioWeb(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ciudad</label>
            <input
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Dirección</label>
            <input
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-4">
            <p className="mb-3 text-sm font-medium text-slate-700">Representante legal</p>
            <p className="mb-3 -mt-2 text-xs text-slate-500">
              Se usa como respaldo en las cartas de respuesta PQRS cuando el responsable de la respuesta no tiene un
              cargo cargado en su usuario.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              value={representanteLegalNombre}
              onChange={(e) => setRepresentanteLegalNombre(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Cargo</label>
            <input
              value={representanteLegalCargo}
              onChange={(e) => setRepresentanteLegalCargo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ej. Representante Legal"
            />
          </div>

          <div className="sm:col-span-2 mt-2 border-t border-slate-100 pt-4">
            <p className="mb-3 text-sm font-medium text-slate-700">Vigencia del proyecto</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Inicio de la interventoría</label>
            <input
              type="date"
              value={fechaInicioInterventoria}
              onChange={(e) => setFechaInicioInterventoria(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Finalización de la interventoría</label>
            <input
              type="date"
              value={fechaFinInterventoria}
              onChange={(e) => setFechaFinInterventoria(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Inicio del proyecto PAE</label>
            <input
              type="date"
              value={fechaInicioPae}
              onChange={(e) => setFechaInicioPae(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Finalización del proyecto PAE</label>
            <input
              type="date"
              value={fechaFinPae}
              onChange={(e) => setFechaFinPae(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {error && <p className="sm:col-span-2 text-sm font-medium text-red-600">{error}</p>}

          <div className="sm:col-span-2 flex items-center gap-3">
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar cambios"}
            </Button>
            {guardadoOk && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                <Check className="h-4 w-4" /> Guardado
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
