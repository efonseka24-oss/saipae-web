import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { siguienteRadicadoSalida } from "@/lib/pqrsRadicados";
import { generarRespuestaPqrs } from "@/lib/generarRespuestaPqrs";
import { convertirDocxAPdf } from "@/lib/convertirPdf";

const INCLUIR_PETICION = {
  responsable: { select: { id: true, nombre: true, cargo: true } },
  respuesta: true,
} as const;

function leerTexto(formData: FormData): { error: string } | { texto: string } {
  const texto = formData.get("texto");
  if (typeof texto !== "string" || !texto.trim()) {
    return { error: "Escribe el texto de la respuesta." };
  }
  return { texto: texto.trim() };
}

// Genera el .docx (y el PDF si LibreOffice está disponible) para la
// respuesta ya guardada, los deja en public/generados/pqrs/<peticionId>/ y
// actualiza documentoUrl/documentoPdfUrl/generadoEn.
async function generarYGuardarDocumento(peticionId: string) {
  const resultado = await generarRespuestaPqrs(peticionId);
  if (!resultado) return;

  const { nombreArchivo, buffer } = resultado;
  const nombreBase = nombreArchivo.replace(/\.docx$/, "");
  const carpetaSalida = path.join(process.cwd(), "public", "generados", "pqrs", peticionId);
  fs.mkdirSync(carpetaSalida, { recursive: true });
  fs.writeFileSync(path.join(carpetaSalida, nombreArchivo), buffer);

  let documentoPdfUrl: string | null = null;
  const pdf = await convertirDocxAPdf(buffer, nombreBase);
  if (pdf) {
    fs.writeFileSync(path.join(carpetaSalida, `${nombreBase}.pdf`), pdf);
    documentoPdfUrl = `/generados/pqrs/${peticionId}/${nombreBase}.pdf`;
  }

  await db.respuestaPqrs.update({
    where: { peticionId },
    data: {
      documentoUrl: `/generados/pqrs/${peticionId}/${nombreArchivo}`,
      documentoPdfUrl,
      generadoEn: new Date(),
    },
  });
}

export async function POST(request: NextRequest, ctx: RouteContext<"/api/pqrs/peticiones/[id]/respuesta">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const peticion = await db.peticionPqrs.findUnique({ where: { id }, include: { respuesta: true } });
  if (!peticion) return NextResponse.json({ error: "La petición no existe." }, { status: 404 });
  if (peticion.respuesta) return NextResponse.json({ error: "Esta petición ya tiene una respuesta." }, { status: 409 });

  const formData = await request.formData();
  const resultadoTexto = leerTexto(formData);
  if ("error" in resultadoTexto) return NextResponse.json({ error: resultadoTexto.error }, { status: 400 });

  const fechaRadicado = new Date();
  const radicadoSalida = await siguienteRadicadoSalida(fechaRadicado);

  await db.respuestaPqrs.create({
    data: { peticionId: id, radicadoSalida, fechaRadicado, texto: resultadoTexto.texto },
  });

  await generarYGuardarDocumento(id);

  const actualizada = await db.peticionPqrs.findUnique({ where: { id }, include: INCLUIR_PETICION });
  return NextResponse.json(actualizada, { status: 201 });
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/pqrs/peticiones/[id]/respuesta">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const peticion = await db.peticionPqrs.findUnique({ where: { id }, include: { respuesta: true } });
  if (!peticion) return NextResponse.json({ error: "La petición no existe." }, { status: 404 });
  if (!peticion.respuesta) return NextResponse.json({ error: "Esta petición todavía no tiene respuesta." }, { status: 404 });

  const formData = await request.formData();
  const resultadoTexto = leerTexto(formData);
  if ("error" in resultadoTexto) return NextResponse.json({ error: resultadoTexto.error }, { status: 400 });

  // El radicado de salida y su fecha no cambian al editar: solo se ajusta el
  // texto y se regenera el documento a partir de él.
  await db.respuestaPqrs.update({ where: { peticionId: id }, data: { texto: resultadoTexto.texto } });

  await generarYGuardarDocumento(id);

  const actualizada = await db.peticionPqrs.findUnique({ where: { id }, include: INCLUIR_PETICION });
  return NextResponse.json(actualizada);
}
