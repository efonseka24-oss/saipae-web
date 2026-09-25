import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { esTipoPeticionPqrs } from "@/lib/pqrs";
import { siguienteRadicadoEntrada } from "@/lib/pqrsRadicados";
import { conAuditoria } from "@/lib/auditoria";

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

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const peticiones = await db.peticionPqrs.findMany({
    orderBy: { fechaRadicado: "desc" },
    include: INCLUIR_PETICION,
  });
  return NextResponse.json(peticiones);
}

async function manejarPOST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const formData = await request.formData();
  const archivo = formData.get("archivo");

  if (!(archivo instanceof File) || archivo.size === 0) {
    return NextResponse.json({ error: "Carga el archivo de soporte." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return NextResponse.json({ error: "El archivo no puede pesar más de 20 MB." }, { status: 400 });
  }
  if (!archivoEsValido(archivo)) {
    return NextResponse.json({ error: "El archivo debe ser PDF, JPG o PNG." }, { status: 400 });
  }

  const resultadoValidacion = await validarDatosFormulario(formData);
  if ("error" in resultadoValidacion) {
    return NextResponse.json({ error: resultadoValidacion.error }, { status: 400 });
  }

  const carpeta = path.join(process.cwd(), "public", "uploads", "pqrs");
  fs.mkdirSync(carpeta, { recursive: true });

  const extension = path.extname(archivo.name) || ".pdf";
  const nombreArchivo = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const bytes = Buffer.from(await archivo.arrayBuffer());
  fs.writeFileSync(path.join(carpeta, nombreArchivo), bytes);

  const radicadoEntrada = await siguienteRadicadoEntrada(resultadoValidacion.datos.fechaRadicado);

  const peticion = await db.peticionPqrs.create({
    data: {
      ...resultadoValidacion.datos,
      radicadoEntrada,
      archivoUrl: `/uploads/pqrs/${nombreArchivo}`,
      archivoNombre: archivo.name,
    },
    include: INCLUIR_PETICION,
  });

  return NextResponse.json(peticion, { status: 201 });
}

export const POST = conAuditoria(manejarPOST);
