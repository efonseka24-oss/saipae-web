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
      padre: { select: { idApp: true } },
      saltarHastaPregunta: { select: { idApp: true } },
    },
  });

  const catalogo = esquemas.map((esquema) => ({
    nombre: esquema.nombre,
    preguntas: preguntas
      .filter((p) => p.modulo.esquemaId === esquema.id)
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
        })
      ),
  }));

  // La versión cambia solo si cambia el contenido; la app la muestra para
  // saber qué catálogo tiene guardado.
  const version = createHash("sha1").update(JSON.stringify(catalogo)).digest("hex").slice(0, 12);

  return NextResponse.json({ version, generadoEn: new Date().toISOString(), esquemas: catalogo });
}
