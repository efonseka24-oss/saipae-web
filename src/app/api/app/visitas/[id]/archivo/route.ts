// Sube un archivo (foto, documento o firma) de una visita enviada por la app
// móvil. Campos multipart: `idPregunta` (idApp de la pregunta) y `archivo`.
// Se guarda igual que los archivos cargados desde el panel (Tabulación).
import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokenAppValido } from "@/lib/tokenApp";

const TAMANO_MAXIMO_BYTES = 25 * 1024 * 1024; // 25 MB

export async function POST(request: NextRequest, ctx: RouteContext<"/api/app/visitas/[id]/archivo">) {
  if (!tokenAppValido(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id: visitaId } = await ctx.params;
  const visita = await db.visita.findUnique({ where: { id: visitaId }, select: { esquemaId: true } });
  if (!visita) return NextResponse.json({ error: "La visita no existe." }, { status: 404 });

  const formData = await request.formData();
  const idPregunta = Number(formData.get("idPregunta"));
  const archivo = formData.get("archivo");

  if (!Number.isInteger(idPregunta)) {
    return NextResponse.json({ error: "Falta la pregunta." }, { status: 400 });
  }
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return NextResponse.json({ error: "El archivo no puede pesar más de 25 MB." }, { status: 400 });
  }

  const pregunta = await db.pregunta.findFirst({
    where: { idApp: idPregunta, modulo: { esquemaId: visita.esquemaId } },
    select: { id: true },
  });
  if (!pregunta) {
    return NextResponse.json({ error: "La pregunta no pertenece al esquema de la visita." }, { status: 400 });
  }
  const preguntaId = pregunta.id;

  const carpetaVisita = path.join(process.cwd(), "public", "uploads", "visitas", visitaId);
  fs.mkdirSync(carpetaVisita, { recursive: true });

  const respuestaActual = await db.respuesta.findUnique({
    where: { visitaId_preguntaId: { visitaId, preguntaId } },
  });
  if (respuestaActual?.archivoUrl) {
    const rutaAnterior = path.join(process.cwd(), "public", respuestaActual.archivoUrl.replace(/^\//, ""));
    fs.rm(rutaAnterior, { force: true }, () => {});
  }

  const extension = path.extname(archivo.name) || "";
  const nombreArchivo = `${preguntaId}-${Date.now()}${extension}`;
  fs.writeFileSync(path.join(carpetaVisita, nombreArchivo), Buffer.from(await archivo.arrayBuffer()));

  const url = `/uploads/visitas/${visitaId}/${nombreArchivo}`;
  await db.respuesta.upsert({
    where: { visitaId_preguntaId: { visitaId, preguntaId } },
    update: { archivoUrl: url },
    create: { visitaId, preguntaId, archivoUrl: url },
  });

  return NextResponse.json({ archivoUrl: url });
}
