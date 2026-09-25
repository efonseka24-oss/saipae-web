import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import {
  esClasePregunta,
  esTipoPregunta,
  esTipoValidacion,
  esNaturalezaOpciones,
  esGenerarSubPreguntasAuto,
  esFuenteOpciones,
} from "@/lib/preguntas";
import { plantillaSubPreguntasAuto } from "@/lib/subpreguntasAuto";
import { reordenarGruposFinales } from "@/lib/reordenarGruposFinales";
import { ORDEN_PANEL_AL_FINAL, renumerarOrdenPanel } from "@/lib/ordenPanel";
import { ORDEN_SECUNDARIA_AL_FINAL, ordenarSecundarias } from "@/lib/ordenSecundarias";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/modulos/[id]/preguntas">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const preguntas = await db.pregunta.findMany({
    where: { moduloId: id },
    orderBy: [{ ordenPanel: "asc" }, { orden: "asc" }],
  });
  return NextResponse.json(
    preguntas.map((p) => ({ ...p, opciones: JSON.parse(p.opciones) as string[] }))
  );
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/modulos/[id]/preguntas">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id: moduloId } = await ctx.params;
  const cuerpo = await request.json();

  const {
    texto,
    clase,
    padreId,
    tipo,
    opciones,
    naturalezaOpciones,
    validacion,
    obligatoria,
    orden,
    generarSubPreguntasAuto,
    saltarSiRespuesta,
    saltarHastaPreguntaId,
    saltarRellenarCon,
    fuenteOpciones,
  } = cuerpo;

  if (typeof texto !== "string" || !texto.trim()) {
    return NextResponse.json({ error: "El texto de la pregunta es obligatorio." }, { status: 400 });
  }
  if (typeof clase !== "string" || !esClasePregunta(clase)) {
    return NextResponse.json({ error: "Clase de pregunta inválida." }, { status: 400 });
  }
  if (typeof tipo !== "string" || !esTipoPregunta(tipo)) {
    return NextResponse.json({ error: "Tipo de pregunta inválido." }, { status: 400 });
  }
  if (validacion !== undefined && !esTipoValidacion(validacion)) {
    return NextResponse.json({ error: "Tipo de validación inválido." }, { status: 400 });
  }
  if (naturalezaOpciones !== undefined && !esNaturalezaOpciones(naturalezaOpciones)) {
    return NextResponse.json({ error: "Naturaleza de opciones inválida." }, { status: 400 });
  }
  if (fuenteOpciones !== undefined && !esFuenteOpciones(fuenteOpciones)) {
    return NextResponse.json({ error: "Origen de opciones inválido." }, { status: 400 });
  }
  // Si las opciones salen de Registro/usuarios, la pregunta es de selección y
  // no se cuenta en estadísticas.
  const fuente = fuenteOpciones ?? "NINGUNA";
  const conFuente = fuente !== "NINGUNA";
  if (generarSubPreguntasAuto !== undefined && !esGenerarSubPreguntasAuto(generarSubPreguntasAuto)) {
    return NextResponse.json({ error: "Generación automática de subpreguntas inválida." }, { status: 400 });
  }
  if (clase === "SECUNDARIA" && !padreId) {
    return NextResponse.json(
      { error: "Una pregunta secundaria necesita una pregunta principal (padre)." },
      { status: 400 }
    );
  }
  if (
    clase === "SECUNDARIA" &&
    generarSubPreguntasAuto &&
    generarSubPreguntasAuto !== "NINGUNA"
  ) {
    return NextResponse.json(
      { error: "La generación automática de subpreguntas solo aplica a preguntas principales." },
      { status: 400 }
    );
  }
  if (saltarSiRespuesta && !saltarHastaPreguntaId) {
    return NextResponse.json(
      { error: "Si defines la respuesta que dispara el salto, debes elegir hasta qué pregunta saltar." },
      { status: 400 }
    );
  }

  const modulo = await db.moduloEsquema.findUnique({ where: { id: moduloId } });
  if (!modulo) return NextResponse.json({ error: "El módulo no existe." }, { status: 404 });

  const pregunta = await db.pregunta.create({
    data: {
      moduloId,
      texto: texto.trim(),
      clase,
      padreId: clase === "SECUNDARIA" ? padreId : null,
      tipo: conFuente ? "SELECCION_MULTIPLE" : tipo,
      opciones: JSON.stringify(!conFuente && Array.isArray(opciones) ? opciones.filter(Boolean) : []),
      naturalezaOpciones: conFuente ? "NO_APLICA" : (naturalezaOpciones ?? "CUALITATIVA"),
      validacion: conFuente ? "NINGUNA" : (validacion ?? "NINGUNA"),
      fuenteOpciones: fuente,
      obligatoria: obligatoria ?? true,
      // Las secundarias toman su orden de la principal (ver ordenarSecundarias).
      orden: clase === "SECUNDARIA" ? ORDEN_SECUNDARIA_AL_FINAL : typeof orden === "number" ? orden : 0,
      // Nueva pregunta: al final de su módulo en el panel (se renumera abajo).
      ordenPanel: ORDEN_PANEL_AL_FINAL,
      generarSubPreguntasAuto: generarSubPreguntasAuto ?? "NINGUNA",
      saltarSiRespuesta: saltarSiRespuesta?.trim() || null,
      saltarHastaPreguntaId: saltarHastaPreguntaId || null,
      saltarRellenarCon: saltarRellenarCon?.trim() || null,
    },
  });

  // Genera el grupo fijo de subpreguntas (mismo comportamiento que la app
  // móvil) una sola vez, en el momento de crear la pregunta principal.
  const plantilla =
    pregunta.generarSubPreguntasAuto !== "NINGUNA" && esGenerarSubPreguntasAuto(pregunta.generarSubPreguntasAuto)
      ? plantillaSubPreguntasAuto(pregunta.generarSubPreguntasAuto)
      : [];

  if (plantilla.length > 0) {
    await db.pregunta.createMany({
      data: plantilla.map((sub, indice) => ({
        moduloId,
        texto: sub.texto,
        clase: "SECUNDARIA",
        padreId: pregunta.id,
        tipo: sub.tipo,
        opciones: JSON.stringify(sub.opciones ?? []),
        naturalezaOpciones: "CUALITATIVA",
        validacion: sub.validacion ?? "NINGUNA",
        obligatoria: sub.obligatoria,
        orden: pregunta.orden + indice + 1,
        ordenPanel: ORDEN_PANEL_AL_FINAL + indice + 1,
      })),
    });
  }

  // Las preguntas de materia prima y organoléptico (en ese orden) siempre
  // van al final del resto de la encuesta, sin importar en qué módulo se
  // hayan creado.
  if (pregunta.generarSubPreguntasAuto === "MATERIA_PRIMA" || pregunta.generarSubPreguntasAuto === "ORGANOLEPTICO") {
    await reordenarGruposFinales(modulo.esquemaId);
  }
  await ordenarSecundarias(modulo.esquemaId);
  await renumerarOrdenPanel(modulo.esquemaId);
  const preguntaFinal = (await db.pregunta.findUnique({ where: { id: pregunta.id } })) ?? pregunta;

  return NextResponse.json({ ...preguntaFinal, opciones: JSON.parse(preguntaFinal.opciones) }, { status: 201 });
}
