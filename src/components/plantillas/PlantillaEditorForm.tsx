"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown, FlaskConical, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "@/components/plantillas/RichTextEditor";
import { EstiloPlantilla } from "@/components/plantillas/EstiloPlantilla";
import { DisenadorFormato, type ModuloDiseno } from "@/components/plantillas/DisenadorFormato";
import { parsearContenido, type Parrafo } from "@/lib/contenidoEnriquecido";
import { parsearConfig, type PlantillaConfig } from "@/lib/plantillaConfig";
import { TIPOS_PLANTILLA, ETIQUETAS_TIPO_PLANTILLA, type TipoPlantilla } from "@/lib/plantillaPreguntas";

type Esquema = { id: string; nombre: string };

type Plantilla = {
  nombre: string;
  tipo: string;
  versionFormato: string;
  descripcionVisitaJson: string;
  configJson: string;
  esquemas: Esquema[];
};

export function PlantillaEditorForm({
  plantillaId,
  plantilla,
  todosLosEsquemas,
  modulosPorEsquema,
}: {
  plantillaId: string;
  plantilla: Plantilla;
  todosLosEsquemas: Esquema[];
  modulosPorEsquema: Record<string, ModuloDiseno[]>;
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(plantilla.nombre);
  const [tipo, setTipo] = useState<TipoPlantilla>(
    TIPOS_PLANTILLA.includes(plantilla.tipo as TipoPlantilla) ? (plantilla.tipo as TipoPlantilla) : "VISITA"
  );
  const [versionFormato, setVersionFormato] = useState(plantilla.versionFormato);
  const [contenido, setContenido] = useState<Parrafo[]>(parsearContenido(plantilla.descripcionVisitaJson));
  const [config, setConfig] = useState<PlantillaConfig>(parsearConfig(plantilla.configJson));
  const [esquemaIds, setEsquemaIds] = useState<string[]>(plantilla.esquemas.map((e) => e.id));
  const [esquemaActivoId, setEsquemaActivoId] = useState<string | null>(plantilla.esquemas[0]?.id ?? null);
  const [esquemaPruebaId, setEsquemaPruebaId] = useState<string>(plantilla.esquemas[0]?.id ?? "");
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [docxUrl, setDocxUrl] = useState<string | null>(null);

  const esquemasVinculados = todosLosEsquemas.filter((e) => esquemaIds.includes(e.id));

  function alternarEsquema(id: string) {
    setEsquemaIds((prev) => {
      const nuevo = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      if (!nuevo.includes(esquemaActivoId ?? "")) setEsquemaActivoId(nuevo[0] ?? null);
      if (!nuevo.includes(esquemaPruebaId)) setEsquemaPruebaId(nuevo[0] ?? "");
      return nuevo;
    });
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    setMensaje(null);
    const respuesta = await fetch(`/api/plantillas/${plantillaId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre,
        tipo,
        versionFormato,
        descripcionVisitaJson: JSON.stringify(contenido),
        configJson: JSON.stringify(config),
        esquemaIds,
      }),
    });
    const datos = await respuesta.json();
    setGuardando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? "No se pudo guardar la plantilla.");
      return;
    }
    setMensaje("Plantilla guardada.");
    router.refresh();
  }

  async function generarPrueba() {
    if (!esquemaPruebaId) {
      setError("Vincula esta plantilla a un esquema para poder generar una prueba.");
      return;
    }
    setGenerando(true);
    setError(null);
    setDocxUrl(null);
    const respuesta = await fetch(`/api/plantillas/${plantillaId}/prueba`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ esquemaId: esquemaPruebaId }),
    });
    const datos = await respuesta.json();
    setGenerando(false);
    if (!respuesta.ok) {
      setError(datos.error ?? "No se pudo generar el documento de prueba.");
      return;
    }
    setDocxUrl(datos.docxUrl);
  }

  return (
    <div>
      <PageHeader
        titulo={`Plantilla — ${plantilla.nombre}`}
        descripcion="El membrete de la empresa va arriba automáticamente. Debajo, la línea de NIT/correo/versión y el texto que edites aquí. Vincula uno o varios esquemas: cada uno arma su tabla de módulos, personalizable abajo."
        acciones={
          <div className="flex items-center gap-2">
            {esquemasVinculados.length > 1 && (
              <select
                value={esquemaPruebaId}
                onChange={(e) => setEsquemaPruebaId(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {esquemasVinculados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre}
                  </option>
                ))}
              </select>
            )}
            <Button variante="outline" onClick={generarPrueba} disabled={generando}>
              <FlaskConical className="h-4 w-4" />
              {generando ? "Generando..." : "Generar prueba"}
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              <Save className="h-4 w-4" />
              {guardando ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      {mensaje && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          {mensaje}
        </div>
      )}
      {docxUrl && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
          <FileDown className="h-4 w-4" />
          Documento de prueba listo.{" "}
          <a href={docxUrl} download className="underline hover:text-blue-900">
            Descargar .docx
          </a>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Encabezado</CardTitle>
          </CardHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Nombre de la plantilla</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Versión del formato</label>
              <input
                value={versionFormato}
                onChange={(e) => setVersionFormato(e.target.value)}
                placeholder="Ej. FORMATO_08"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoPlantilla)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:max-w-xs"
              >
                {TIPOS_PLANTILLA.map((t) => (
                  <option key={t} value={t}>
                    {ETIQUETAS_TIPO_PLANTILLA[t]}
                  </option>
                ))}
              </select>
              {tipo !== "VISITA" && (
                <p className="mt-1 text-xs text-slate-500">
                  Junta, de los esquemas vinculados, solo las preguntas marcadas como {ETIQUETAS_TIPO_PLANTILLA[tipo].split(" (")[0].toLowerCase()}{" "}
                  (vengan del módulo que vengan) — esas preguntas quedan afuera de las plantillas de tipo Visita.
                </p>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            El NIT y el correo de la empresa se toman de Datos de la Empresa y se muestran junto a la versión en la
            misma línea, debajo del membrete.
          </p>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Esquemas vinculados</label>
            <p className="mb-2 text-xs text-slate-400">
              Esta plantilla se usa para generar el informe de las visitas de los esquemas que marques aquí.
            </p>
            <div className="grid max-h-40 grid-cols-2 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {todosLosEsquemas.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={esquemaIds.includes(e.id)}
                    onChange={() => alternarEsquema(e.id)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {e.nombre}
                </label>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Descripción de la visita</CardTitle>
          </CardHeader>
          <p className="mb-3 text-xs text-slate-400">
            Texto libre &ldquo;tipo Word&rdquo; (título del formato, objetivo, criterios de evaluación, etc.). Va
            debajo de la línea de NIT/correo/versión y antes de los módulos.
          </p>
          <RichTextEditor valorInicial={contenido} onCambiar={setContenido} />
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Estilo (aplica a todos los esquemas de esta plantilla)</CardTitle>
        </CardHeader>
        <EstiloPlantilla config={config} onCambiar={setConfig} />
      </Card>

      {tipo === "VISITA" ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Diseño del formato</CardTitle>
          </CardHeader>

          {esquemasVinculados.length === 0 ? (
            <p className="text-sm text-slate-400">
              Vincula un esquema arriba (en &quot;Esquemas vinculados&quot;) para poder diseñar su tabla de módulos y
              preguntas.
            </p>
          ) : (
            <>
              {esquemasVinculados.length > 1 && (
                <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
                  {esquemasVinculados.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setEsquemaActivoId(e.id)}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                        esquemaActivoId === e.id
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {e.nombre}
                    </button>
                  ))}
                </div>
              )}

              {esquemaActivoId && modulosPorEsquema[esquemaActivoId] ? (
                <DisenadorFormato
                  esquemaId={esquemaActivoId}
                  modulos={modulosPorEsquema[esquemaActivoId]}
                  config={config}
                  onCambiar={setConfig}
                />
              ) : (
                <p className="text-sm text-slate-400">
                  Guarda la plantilla para cargar los módulos de este esquema recién vinculado.
                </p>
              )}
            </>
          )}
        </Card>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Contenido</CardTitle>
          </CardHeader>
          <p className="text-sm text-slate-500">
            Este tipo de plantilla arma su contenido solo: junta, de cada esquema vinculado, todas las preguntas
            marcadas como {ETIQUETAS_TIPO_PLANTILLA[tipo].split(" (")[0].toLowerCase()} (un bloque por cada ítem
            registrado en la visita, con sus datos como tabla). No hay módulos que reordenar aquí.
          </p>
        </Card>
      )}
    </div>
  );
}
