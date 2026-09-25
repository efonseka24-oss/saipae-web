import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { ORDEN_PANEL_AL_FINAL, renumerarOrdenPanel } from "@/lib/ordenPanel";
import { ORDEN_SECUNDARIA_AL_FINAL, ordenarSecundarias } from "@/lib/ordenSecundarias";
import {
  esClasePregunta,
  esTipoPregunta,
  esTipoValidacion,
  esNaturalezaOpciones,
  esGenerarSubPreguntasAuto,
  esFuenteOpciones,
} from "@/lib/preguntas";

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/preguntas/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const cuerpo = await request.json();
  const {
    texto,
    moduloId,
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
  if (padreId === id) {
    return NextResponse.json({ error: "Una pregunta no puede ser su propia pregunta padre." }, { status: 400 });
  }
  if (saltarHastaPreguntaId === id) {
    return NextResponse.json({ error: "Una pregunta no puede saltar hacia sí misma." }, { status: 400 });
  }
  if (saltarSiRespuesta && !saltarHastaPreguntaId) {
    return NextResponse.json(
      { error: "Si defines la respuesta que dispara el salto, debes elegir hasta qué pregunta saltar." },
      { status: 400 }
    );
  }

  const actual = await db.pregunta.findUnique({ where: { id }, include: { modulo: true } });
  if (!actual) {
    return NextResponse.json({ error: "La pregunta no existe." }, { status: 404 });
  }

  let moduloDestinoId = actual.moduloId;
  if (clase === "PRINCIPAL" && typeof moduloId === "string" && moduloId && moduloId !== actual.moduloId) {
    const moduloDestino = await db.moduloEsquema.findUnique({ where: { id: moduloId } });
    if (!moduloDestino || moduloDestino.esquemaId !== actual.modulo.esquemaId) {
      return NextResponse.json({ error: "El módulo de destino no es válido para este esquema." }, { status: 400 });
    }
    moduloDestinoId = moduloId;
  }

  if (moduloDestinoId !== actual.moduloId) {
    // Las subpreguntas viajan junto con su pregunta principal para que
    // sigan contando como su observación/evidencia en el mismo módulo.
    await db.pregunta.updateMany({ where: { padreId: id }, data: { moduloId: moduloDestinoId } });
  }

  const pregunta = await db.pregunta.update({
    where: { id },
    data: {
      texto: texto.trim(),
      moduloId: moduloDestinoId,
      ...(moduloDestinoId !== actual.moduloId ? { ordenPanel: ORDEN_PANEL_AL_FINAL } : {}),
      clase,
      padreId: clase === "SECUNDARIA" ? padreId : null,
      tipo: conFuente ? "SELECCION_MULTIPLE" : tipo,
      opciones: JSON.stringify(!conFuente && Array.isArray(opciones) ? opciones.filter(Boolean) : []),
      naturalezaOpciones: conFuente ? "NO_APLICA" : (naturalezaOpciones ?? "CUALITATIVA"),
      validacion: conFuente ? "NINGUNA" : (validacion ?? "NINGUNA"),
      fuenteOpciones: fuente,
      obligatoria: obligatoria ?? true,
      // Las secundarias toman su orden de la principal (ver ordenarSecundarias):
      // conservan su lugar entre las hermanas, o van de últimas si cambian de principal.
      orden:
        clase === "SECUNDARIA"
          ? actual.padreId === padreId ? actual.orden : ORDEN_SECUNDARIA_AL_FINAL
          : typeof orden === "number" ? orden : 0,
      generarSubPreguntasAuto: clase === "PRINCIPAL" ? (generarSubPreguntasAuto ?? "NINGUNA") : "NINGUNA",
      saltarSiRespuesta: saltarSiRespuesta?.trim() || null,
      saltarHastaPreguntaId: saltarHastaPreguntaId || null,
      saltarRellenarCon: saltarRellenarCon?.trim() || null,
    },
  });

  await ordenarSecundarias(actual.modulo.esquemaId);
  await renumerarOrdenPanel(actual.modulo.esquemaId);
  const preguntaFinal = (await db.pregunta.findUnique({ where: { id } })) ?? pregunta;
  return NextResponse.json({ ...preguntaFinal, opciones: JSON.parse(preguntaFinal.opciones) });
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/preguntas/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  await db.pregunta.updateMany({ where: { padreId: id }, data: { padreId: null, clase: "PRINCIPAL" } });
  await db.pregunta.updateMany({ where: { saltarHastaPreguntaId: id }, data: { saltarHastaPreguntaId: null, saltarSiRespuesta: null, saltarRellenarCon: null } });
  await db.pregunta.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
