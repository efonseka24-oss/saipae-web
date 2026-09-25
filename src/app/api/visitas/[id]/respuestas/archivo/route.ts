import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";

const TAMANO_MAXIMO_BYTES = 15 * 1024 * 1024; // 15 MB

async function manejarPOST(request: NextRequest, ctx: RouteContext<"/api/visitas/[id]/respuestas/archivo">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id: visitaId } = await ctx.params;
  const formData = await request.formData();
  const preguntaId = formData.get("preguntaId");
  const archivo = formData.get("archivo");

  if (typeof preguntaId !== "string" || !preguntaId) {
    return NextResponse.json({ error: "Falta la pregunta." }, { status: 400 });
  }
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return NextResponse.json({ error: "El archivo no puede pesar más de 15 MB." }, { status: 400 });
  }

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
  const bytes = Buffer.from(await archivo.arrayBuffer());
  fs.writeFileSync(path.join(carpetaVisita, nombreArchivo), bytes);

  const url = `/uploads/visitas/${visitaId}/${nombreArchivo}`;
  const respuesta = await db.respuesta.upsert({
    where: { visitaId_preguntaId: { visitaId, preguntaId } },
    update: { archivoUrl: url },
    create: { visitaId, preguntaId, archivoUrl: url },
  });

  return NextResponse.json(respuesta);
}

export const POST = conAuditoria(manejarPOST);
