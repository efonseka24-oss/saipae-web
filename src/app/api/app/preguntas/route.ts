// Catálogo de preguntas para la app móvil. La app lo descarga con el botón
// "Actualizar preguntas", lo guarda en el equipo y trabaja con esa copia sin
// internet. No usa la sesión del panel: se autentica con el token fijo
// APP_API_TOKEN (encabezado "Authorization: Bearer <token>").
//
// El formato replica la data class `Pregunta` de la app (Preguntas.kt): ids
// enteros, subpreguntas ya expandidas (subPreguntaDe) y saltos condicionales
// (saltarSi) apuntando a ids enteros.
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokenAppValido } from "@/lib/tokenApp";
import { cargarCatalogoRegistro } from "@/lib/catalogoRegistro";
import { plantillaSubPreguntasAuto } from "@/lib/subpreguntasAuto";
import type { GenerarSubPreguntasAuto } from "@/lib/preguntas";

type PreguntaApp = {
  id: number;
  texto: string;
  tipo: string;
  opciones: string[];
  validacion: string;
  obligatoria: boolean;
  subPreguntaDe: number | null;
  saltarSi: { respuesta: string; saltarHastaId: number; rellenarCon: string } | null;
  categoria: string;
  modulo: string;
  // "NINGUNA" o de dónde salen las opciones (ver bloque `registro` / `usuarios`).
  fuenteOpciones: string;
};

function leerOpciones(valor: string): string[] {
  try {
    const opciones = JSON.parse(valor);
    return Array.isArray(opciones) ? opciones.map(String) : [];
  } catch {
    return [];
  }
}

// Asigna idApp a las preguntas que aún no lo tienen, en el orden del flujo
// (esquema → orden de la pregunta), continuando después del mayor ya asignado.
async function asignarIdsFaltantes() {
  const sinId = await db.pregunta.findMany({
    where: { idApp: null },
    select: { id: true },
    orderBy: [
      { modulo: { esquema: { nombre: "asc" } } },
      { orden: "asc" },
      { createdAt: "asc" },
    ],
  });
  if (sinId.length === 0) return;

  await db.$transaction(async (tx) => {
    const maximo = await tx.pregunta.aggregate({ _max: { idApp: true } });
    let siguiente = (maximo._max.idApp ?? 0) + 1;
    for (const p of sinId) {
      await tx.pregunta.update({ where: { id: p.id }, data: { idApp: siguiente++ } });
    }
  });
}

export async function GET(request: NextRequest) {
  if (!tokenAppValido(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  await asignarIdsFaltantes();

  const esquemas = await db.esquema.findMany({ orderBy: { nombre: "asc" } });

  // El orden de la encuesta es el campo `orden` de cada pregunta, que es global
  // dentro del esquema (el panel lo asigna así): NO se agrupa por módulo, por
  // eso la primera y la última pregunta pueden ser del mismo módulo.
  const preguntas = await db.pregunta.findMany({
    orderBy: [{ orden: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    include: {
      modulo: { select: { esquemaId: true, nombre: true } },
      padre: { select: { idApp: true, generarSubPreguntasAuto: true } },
      saltarHastaPregunta: { select: { idApp: true } },
    },
  });
  type PreguntaConRelaciones = (typeof preguntas)[number];

  // La app muestra en la misma pantalla de una pregunta principal todas sus
  // secundarias, en el orden en que llegan, y espera que vengan justo después
  // de ella. Por eso cada principal va seguida de sus secundarias: primero las
  // creadas a mano en el panel (por su orden) y después las del grupo
  // automático (evidencias, materia prima u organoléptico).
  function esDelGrupoAutomatico(p: PreguntaConRelaciones): boolean {
    const grupo = (p.padre?.generarSubPreguntasAuto ?? "NINGUNA") as GenerarSubPreguntasAuto;
    return plantillaSubPreguntasAuto(grupo).some((plantilla) => plantilla.texto === p.texto);
  }

  function ordenarFlujo(delEsquema: PreguntaConRelaciones[]): PreguntaConRelaciones[] {
    const hijasPorPadre = new Map<string, PreguntaConRelaciones[]>();
    for (const p of delEsquema) {
      if (!p.padreId) continue;
      hijasPorPadre.set(p.padreId, [...(hijasPorPadre.get(p.padreId) ?? []), p]);
    }
    const flujo: PreguntaConRelaciones[] = [];
    const agregar = (p: PreguntaConRelaciones) => {
      flujo.push(p);
      const hijas = hijasPorPadre.get(p.id) ?? [];
      // sort es estable: dentro de cada bloque se conserva el orden del panel.
      hijas.sort((a, b) => Number(esDelGrupoAutomatico(a)) - Number(esDelGrupoAutomatico(b)));
      hijas.forEach(agregar);
    };
    delEsquema.filter((p) => !p.padreId).forEach(agregar);
    // Secundarias cuya principal no está en este esquema: al final, para no perderlas.
    const incluidas = new Set(flujo.map((p) => p.id));
    return [...flujo, ...delEsquema.filter((p) => !incluidas.has(p.id))];
  }

  const catalogo = esquemas.map((esquema) => ({
    nombre: esquema.nombre,
    preguntas: ordenarFlujo(preguntas.filter((p) => p.modulo.esquemaId === esquema.id))
      .map(
        (p): PreguntaApp => ({
          id: p.idApp!,
          texto: p.texto,
          tipo: p.tipo,
          opciones: leerOpciones(p.opciones),
          validacion: p.validacion,
          obligatoria: p.obligatoria,
          subPreguntaDe: p.padre?.idApp ?? null,
          saltarSi:
            p.saltarSiRespuesta && p.saltarHastaPregunta?.idApp
              ? {
                  respuesta: p.saltarSiRespuesta,
                  saltarHastaId: p.saltarHastaPregunta.idApp,
                  rellenarCon: p.saltarRellenarCon ?? "",
                }
              : null,
          categoria: esquema.nombre,
          modulo: p.modulo.nombre,
          fuenteOpciones: p.fuenteOpciones,
        })
      ),
  }));

  // Catálogos para las preguntas con opciones desde Registro: cada nivel trae
  // el id de su padre para que la app filtre en cascada sin internet.
  const { registro, usuarios } = await cargarCatalogoRegistro();

  // La versión cambia solo si cambia el contenido; la app la muestra para
  // saber qué catálogo tiene guardado.
  const version = createHash("sha1").update(JSON.stringify({ catalogo, registro, usuarios })).digest("hex").slice(0, 12);

  return NextResponse.json({ version, generadoEn: new Date().toISOString(), esquemas: catalogo, registro, usuarios });
}
