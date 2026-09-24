"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Upload, FileText as FileIcon, Image as ImageIcon } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ETIQUETAS_ESTADO_VISITA } from "@/lib/visitas";
import { DatosVisitaCard } from "@/components/visitas/DatosVisitaCard";
import { opcionesDesdeRegistro, type CatalogoRegistro, type UsuarioCorreo } from "@/lib/opcionesRegistro";

type Pregunta = {
  id: string;
  texto: string;
  clase: string;
  padreId: string | null;
  tipo: string;
  opciones: string[];
  validacion: string;
  obligatoria: boolean;
  orden: number;
  fuenteOpciones: string;
  saltarSiRespuesta: string | null;
  saltarHastaPreguntaId: string | null;
  saltarRellenarCon: string | null;
};

type Modulo = { id: string; nombre: string; orden: number; preguntas: Pregunta[] };

type RespuestaValor = { valor: string | null; archivoUrl: string | null };

type Visita = {
  id: string;
  fecha: string | Date;
  operador: string | null;
  municipio: string | null;
  institucion: string | null;
  sede: string | null;
  zodes: string | null;
  lote: string | null;
  nit: string | null;
  estado: string;
  esquema: { id: string; nombre: string };
};

function tipoInputHtml(validacion: string): string {
  switch (validacion) {
    case "EMAIL":
      return "email";
    case "TELEFONO":
      return "tel";
    case "FECHA":
      return "date";
    case "HORA":
      return "time";
    default:
      return "text";
  }
}

function calcularSaltos(
  todas: Pregunta[],
  respuestas: Record<string, RespuestaValor>
): { saltadas: Set<string>; relleno: Map<string, string> } {
  const saltadas = new Set<string>();
  const relleno = new Map<string, string>();
  const porId = new Map(todas.map((p) => [p.id, p]));

  for (const p of todas) {
    if (!p.saltarSiRespuesta || !p.saltarHastaPreguntaId) continue;
    const valorActual = respuestas[p.id]?.valor ?? "";
    if (valorActual !== p.saltarSiRespuesta) continue;
    const destino = porId.get(p.saltarHastaPreguntaId);
    if (!destino) continue;
    for (const q of todas) {
      if (q.orden > p.orden && q.orden < destino.orden) {
        saltadas.add(q.id);
        relleno.set(q.id, p.saltarRellenarCon ?? "");
      }
    }
  }
  return { saltadas, relleno };
}

function CampoPregunta({
  pregunta,
  opciones,
  respuesta,
  saltada,
  visitaId,
  onCambiarValor,
  onSubidoArchivo,
}: {
  pregunta: Pregunta;
  // Opciones a mostrar: las de la pregunta o las de Registro ya filtradas.
  opciones: string[];
  respuesta: RespuestaValor | undefined;
  saltada: boolean;
  visitaId: string;
  onCambiarValor: (preguntaId: string, valor: string) => void;
  onSubidoArchivo: (preguntaId: string, archivoUrl: string) => void;
}) {
  const [valorLocal, setValorLocal] = useState(() => respuesta?.valor ?? "");
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function subirArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    const formData = new FormData();
    formData.append("preguntaId", pregunta.id);
    formData.append("archivo", archivo);
    const resp = await fetch(`/api/visitas/${visitaId}/respuestas/archivo`, { method: "POST", body: formData });
    const datos = await resp.json();
    setSubiendo(false);
    if (resp.ok) onSubidoArchivo(pregunta.id, datos.archivoUrl);
    if (inputRef.current) inputRef.current.value = "";
  }

  const esSub = pregunta.clase === "SECUNDARIA";

  return (
    <div className={`py-3 ${esSub ? "ml-6 border-l-2 border-slate-100 pl-4" : ""}`}>
      <div className="mb-1.5 flex items-start justify-between gap-3">
        <label className={`text-sm ${esSub ? "text-slate-600" : "font-medium text-slate-800"}`}>
          {pregunta.texto}
          {pregunta.obligatoria && !saltada && <span className="ml-1 text-red-500">*</span>}
        </label>
        {saltada && <Badge variante="slate">Omitida por salto condicional</Badge>}
      </div>

      {saltada ? (
        <p className="text-sm italic text-slate-400">
          Se registrará automáticamente como: {pregunta.saltarRellenarCon || respuesta?.valor || "(en blanco)"}
        </p>
      ) : pregunta.tipo === "SELECCION_MULTIPLE" ? (
        <select
          value={valorLocal}
          onChange={(e) => {
            setValorLocal(e.target.value);
            onCambiarValor(pregunta.id, e.target.value);
          }}
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">Selecciona...</option>
          {valorLocal && !opciones.includes(valorLocal) && <option value={valorLocal}>{valorLocal}</option>}
          {opciones.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
      ) : pregunta.tipo === "NUMERO" ? (
        <input
          type="number"
          value={valorLocal}
          onChange={(e) => setValorLocal(e.target.value)}
          onBlur={() => onCambiarValor(pregunta.id, valorLocal)}
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      ) : pregunta.tipo === "TEXTO_LIBRE" ? (
        <input
          type={tipoInputHtml(pregunta.validacion)}
          value={valorLocal}
          onChange={(e) => setValorLocal(e.target.value)}
          onBlur={() => onCambiarValor(pregunta.id, valorLocal)}
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      ) : (
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="file"
            accept={pregunta.tipo === "ARCHIVO" ? undefined : "image/*"}
            onChange={subirArchivo}
            className="hidden"
            id={`archivo-${pregunta.id}`}
          />
          <Button
            type="button"
            variante="outline"
            disabled={subiendo}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            {subiendo ? "Subiendo..." : respuesta?.archivoUrl ? "Reemplazar" : "Subir"}
          </Button>
          {respuesta?.archivoUrl && (
            <a
              href={respuesta.archivoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {pregunta.tipo === "ARCHIVO" ? <FileIcon className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
              Ver archivo cargado
            </a>
          )}
        </div>
      )}
    </div>
  );
}

type Operador = {
  id: string;
  nit: string;
  nombreRazonSocial: string;
  zodeId: string;
  zode: { id: string; nombre: string; lote: { id: string; nombre: string; departamento: { nombre: string } } };
};
type MunicipioRegistro = { id: string; nombre: string; zodeId: string };
type InstitucionRegistro = { id: string; nombre: string; numeroDane: string; municipioId: string };
type SedeRegistro = { id: string; nombre: string; numeroDane: string; institucionId: string };

export function DiligenciarVisitaForm({
  visita,
  modulos,
  respuestasIniciales,
  operadores,
  municipios,
  instituciones,
  sedes,
  catalogoRegistro,
  usuariosCorreo,
}: {
  visita: Visita;
  modulos: Modulo[];
  respuestasIniciales: { preguntaId: string; valor: string | null; archivoUrl: string | null }[];
  operadores: Operador[];
  municipios: MunicipioRegistro[];
  instituciones: InstitucionRegistro[];
  sedes: SedeRegistro[];
  catalogoRegistro: CatalogoRegistro;
  usuariosCorreo: UsuarioCorreo[];
}) {
  const router = useRouter();
  const [respuestas, setRespuestas] = useState<Record<string, RespuestaValor>>(() =>
    Object.fromEntries(respuestasIniciales.map((r) => [r.preguntaId, { valor: r.valor, archivoUrl: r.archivoUrl }]))
  );
  const [finalizando, setFinalizando] = useState(false);

  const todasLasPreguntas = useMemo(() => modulos.flatMap((m) => m.preguntas), [modulos]);

  // Orden real de la encuesta (campo orden), para filtrar en cascada las
  // preguntas con opciones desde Registro según lo ya respondido.
  const flujo = useMemo(
    () =>
      [...todasLasPreguntas]
        .sort((a, b) => a.orden - b.orden)
        .map((p) => ({ id: p.id, fuenteOpciones: p.fuenteOpciones, valor: respuestas[p.id]?.valor })),
    [todasLasPreguntas, respuestas]
  );

  const { saltadas, relleno } = useMemo(
    () => calcularSaltos(todasLasPreguntas, respuestas),
    [todasLasPreguntas, respuestas]
  );

  const firmaSaltos = useMemo(
    () => [...saltadas].map((id) => `${id}:${relleno.get(id) ?? ""}`).sort().join("|"),
    [saltadas, relleno]
  );

  async function guardarValor(preguntaId: string, valor: string) {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: { valor, archivoUrl: prev[preguntaId]?.archivoUrl ?? null } }));
    await fetch(`/api/visitas/${visita.id}/respuestas`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preguntaId, valor }),
    });
  }

  function marcarArchivoSubido(preguntaId: string, archivoUrl: string) {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: { valor: prev[preguntaId]?.valor ?? null, archivoUrl } }));
  }

  // Sincroniza el relleno automático de las preguntas omitidas por salto
  // condicional. Envuelto en una promesa para que la escritura de estado
  // quede dentro de un callback (no directamente en el cuerpo del efecto).
  useEffect(() => {
    Promise.resolve().then(() => {
      for (const id of saltadas) {
        const esperado = relleno.get(id) ?? "";
        const actual = respuestas[id]?.valor ?? "";
        if (actual !== esperado) {
          guardarValor(id, esperado);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaSaltos]);

  const totalObligatorias = todasLasPreguntas.filter((p) => p.obligatoria && !saltadas.has(p.id)).length;
  const respondidas = todasLasPreguntas.filter((p) => {
    if (!p.obligatoria || saltadas.has(p.id)) return false;
    const r = respuestas[p.id];
    return !!(r?.valor?.trim() || r?.archivoUrl);
  }).length;

  async function finalizar() {
    setFinalizando(true);
    await fetch(`/api/visitas/${visita.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "FINALIZADA" }),
    });
    setFinalizando(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/tabulacion" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" />
          Volver a Tabulación
        </Link>
        <div className="flex items-center gap-3">
          <Badge variante={visita.estado === "FINALIZADA" ? "green" : "amber"}>
            {ETIQUETAS_ESTADO_VISITA[visita.estado as "EN_PROGRESO" | "FINALIZADA"] ?? visita.estado}
          </Badge>
          <span className="text-sm text-slate-500">
            {respondidas}/{totalObligatorias} obligatorias respondidas
          </span>
          {visita.estado !== "FINALIZADA" && (
            <Button onClick={finalizar} disabled={finalizando}>
              <Check className="h-4 w-4" />
              {finalizando ? "Guardando..." : "Finalizar visita"}
            </Button>
          )}
        </div>
      </div>

      <DatosVisitaCard
        visita={visita}
        operadores={operadores}
        municipios={municipios}
        instituciones={instituciones}
        sedes={sedes}
      />

      {modulos.map((modulo) => (
        <Card key={modulo.id}>
          <CardHeader>
            <CardTitle>{modulo.nombre}</CardTitle>
            <Badge variante="slate">{modulo.preguntas.length} pregunta(s)</Badge>
          </CardHeader>
          <div className="divide-y divide-slate-100">
            {modulo.preguntas.map((pregunta) => (
              <CampoPregunta
                key={pregunta.id}
                pregunta={pregunta}
                opciones={opcionesDesdeRegistro(pregunta.id, flujo, catalogoRegistro, usuariosCorreo) ?? pregunta.opciones}
                respuesta={respuestas[pregunta.id]}
                saltada={saltadas.has(pregunta.id)}
                visitaId={visita.id}
                onCambiarValor={guardarValor}
                onSubidoArchivo={marcarArchivoSubido}
              />
            ))}
            {modulo.preguntas.length === 0 && (
              <p className="py-4 text-sm text-slate-400">Este módulo no tiene preguntas.</p>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
