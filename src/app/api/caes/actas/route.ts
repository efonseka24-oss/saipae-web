import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { esTipoActaCaes } from "@/lib/actasCaes";

const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB

const INCLUIR = {
  institucion: {
    include: {
      municipio: { include: { zode: { include: { lote: { include: { departamento: { select: { nombre: true } } } } } } } },
    },
  },
} as const;

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const actas = await db.actaCaes.findMany({ orderBy: { fecha: "desc" }, include: INCLUIR });
  return NextResponse.json(actas);
}

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const formData = await request.formData();
  const tipo = formData.get("tipo");
  const institucionId = formData.get("institucionId");
  const fecha = formData.get("fecha");
  const archivo = formData.get("archivo");

  if (typeof tipo !== "string" || !esTipoActaCaes(tipo)) {
    return NextResponse.json({ error: "Tipo de acta inválido." }, { status: 400 });
  }
  if (typeof institucionId !== "string" || !institucionId) {
    return NextResponse.json({ error: "Selecciona la institución." }, { status: 400 });
  }
  if (typeof fecha !== "string" || !fecha) {
    return NextResponse.json({ error: "La fecha es obligatoria." }, { status: 400 });
  }
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Carga el archivo PDF del acta." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return NextResponse.json({ error: "El archivo no puede pesar más de 20 MB." }, { status: 400 });
  }
  const esPdf = archivo.type === "application/pdf" || archivo.name.toLowerCase().endsWith(".pdf");
  if (!esPdf) {
    return NextResponse.json({ error: "El archivo debe ser un PDF." }, { status: 400 });
  }

  const institucion = await db.institucion.findUnique({ where: { id: institucionId } });
  if (!institucion) return NextResponse.json({ error: "La institución no existe." }, { status: 404 });

  const carpeta = path.join(process.cwd(), "public", "uploads", "caes");
  fs.mkdirSync(carpeta, { recursive: true });

  const extension = path.extname(archivo.name) || ".pdf";
  const nombreArchivo = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const bytes = Buffer.from(await archivo.arrayBuffer());
  fs.writeFileSync(path.join(carpeta, nombreArchivo), bytes);

  const acta = await db.actaCaes.create({
    data: {
      tipo,
      institucionId,
      fecha: new Date(fecha),
      archivoUrl: `/uploads/caes/${nombreArchivo}`,
      archivoNombre: archivo.name,
    },
    include: INCLUIR,
  });

  return NextResponse.json(acta, { status: 201 });
}
