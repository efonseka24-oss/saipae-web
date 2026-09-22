import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { esTipoPeticionPqrs } from "@/lib/pqrs";

const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB
const TIPOS_ARCHIVO_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png"];
const EXTENSIONES_PERMITIDAS = [".pdf", ".jpg", ".jpeg", ".png"];

const INCLUIR_PETICION = {
  responsable: { select: { id: true, nombre: true, cargo: true } },
  respuesta: true,
} as const;

function archivoEsValido(archivo: File): boolean {
  if (TIPOS_ARCHIVO_PERMITIDOS.includes(archivo.type)) return true;
  const extension = path.extname(archivo.name).toLowerCase();
  return EXTENSIONES_PERMITIDAS.includes(extension);
}

function rutaPublica(url: string): string {
  return path.join(process.cwd(), "public", url.replace(/^\//, ""));
}

async function validarDatosFormulario(formData: FormData) {
  const fechaRadicado = formData.get("fechaRadicado");
  const peticionario = formData.get("peticionario");
  const tipoPeticion = formData.get("tipoPeticion");
  const asunto = formData.get("asunto");
  const responsableId = formData.get("responsableId");

  if (typeof fechaRadicado !== "string" || !fechaRadicado) {
    return { error: "La fecha de radicado es obligatoria." };
  }
  if (typeof peticionario !== "string" || !peticionario.trim()) {
    return { error: "El peticionario es obligatorio." };
  }
  if (typeof tipoPeticion !== "string" || !esTipoPeticionPqrs(tipoPeticion)) {
    return { error: "Selecciona un tipo de petición válido." };
  }
  if (typeof asunto !== "string" || !asunto.trim()) {
    return { error: "El asunto es obligatorio." };
  }
  if (typeof responsableId !== "string" || !responsableId) {
    return { error: "Selecciona el responsable." };
  }
  const responsable = await db.usuario.findUnique({ where: { id: responsableId } });
  if (!responsable) return { error: "El responsable seleccionado no existe." };

  return {
    datos: {
      fechaRadicado: new Date(fechaRadicado),
      peticionario: peticionario.trim(),
      tipoPeticion,
      asunto: asunto.trim(),
      responsableId,
    },
  };
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/pqrs/peticiones/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const actual = await db.peticionPqrs.findUnique({ where: { id } });
  if (!actual) return NextResponse.json({ error: "La petición no existe." }, { status: 404 });

  const formData = await request.formData();
  const resultadoValidacion = await validarDatosFormulario(formData);
  if ("error" in resultadoValidacion) {
    return NextResponse.json({ error: resultadoValidacion.error }, { status: 400 });
  }

  let archivoUrl = actual.archivoUrl;
  let archivoNombre = actual.archivoNombre;

  const archivo = formData.get("archivo");
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      return NextResponse.json({ error: "El archivo no puede pesar más de 20 MB." }, { status: 400 });
    }
    if (!archivoEsValido(archivo)) {
      return NextResponse.json({ error: "El archivo debe ser PDF, JPG o PNG." }, { status: 400 });
    }

    const carpeta = path.join(process.cwd(), "public", "uploads", "pqrs");
    fs.mkdirSync(carpeta, { recursive: true });

    const extension = path.extname(archivo.name) || ".pdf";
    const nombreArchivo = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const bytes = Buffer.from(await archivo.arrayBuffer());
    fs.writeFileSync(path.join(carpeta, nombreArchivo), bytes);

    fs.rm(rutaPublica(actual.archivoUrl), { force: true }, () => {});
    archivoUrl = `/uploads/pqrs/${nombreArchivo}`;
    archivoNombre = archivo.name;
  }

  const peticion = await db.peticionPqrs.update({
    where: { id },
    // El radicado de entrada nunca se toca aquí: se asigna una sola vez, al crear.
    data: { ...resultadoValidacion.datos, archivoUrl, archivoNombre },
    include: INCLUIR_PETICION,
  });

  return NextResponse.json(peticion);
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/pqrs/peticiones/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const peticion = await db.peticionPqrs.findUnique({ where: { id }, include: { respuesta: true } });
  if (!peticion) return NextResponse.json({ error: "La petición no existe." }, { status: 404 });

  await db.peticionPqrs.delete({ where: { id } });
  fs.rm(rutaPublica(peticion.archivoUrl), { force: true }, () => {});
  if (peticion.respuesta?.documentoUrl) fs.rm(rutaPublica(peticion.respuesta.documentoUrl), { force: true }, () => {});
  if (peticion.respuesta?.documentoPdfUrl) fs.rm(rutaPublica(peticion.respuesta.documentoPdfUrl), { force: true }, () => {});

  return NextResponse.json({ ok: true });
}
