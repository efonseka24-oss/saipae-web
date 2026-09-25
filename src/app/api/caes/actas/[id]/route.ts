import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { esTipoActaCaes } from "@/lib/actasCaes";
import { conAuditoria } from "@/lib/auditoria";

const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB

const INCLUIR = {
  institucion: {
    include: {
      municipio: { include: { zode: { include: { lote: { include: { departamento: { select: { nombre: true } } } } } } } },
    },
  },
} as const;

function rutaPublica(url: string): string {
  return path.join(process.cwd(), "public", url.replace(/^\//, ""));
}

async function manejarPATCH(request: NextRequest, ctx: RouteContext<"/api/caes/actas/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const actual = await db.actaCaes.findUnique({ where: { id } });
  if (!actual) return NextResponse.json({ error: "El acta no existe." }, { status: 404 });

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

  let archivoUrl = actual.archivoUrl;
  let archivoNombre = actual.archivoNombre;

  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      return NextResponse.json({ error: "El archivo no puede pesar más de 20 MB." }, { status: 400 });
    }
    const esPdf = archivo.type === "application/pdf" || archivo.name.toLowerCase().endsWith(".pdf");
    if (!esPdf) {
      return NextResponse.json({ error: "El archivo debe ser un PDF." }, { status: 400 });
    }

    const carpeta = path.join(process.cwd(), "public", "uploads", "caes");
    fs.mkdirSync(carpeta, { recursive: true });

    const extension = path.extname(archivo.name) || ".pdf";
    const nombreArchivo = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const bytes = Buffer.from(await archivo.arrayBuffer());
    fs.writeFileSync(path.join(carpeta, nombreArchivo), bytes);

    fs.rm(rutaPublica(actual.archivoUrl), { force: true }, () => {});
    archivoUrl = `/uploads/caes/${nombreArchivo}`;
    archivoNombre = archivo.name;
  }

  const acta = await db.actaCaes.update({
    where: { id },
    data: { tipo, institucionId, fecha: new Date(fecha), archivoUrl, archivoNombre },
    include: INCLUIR,
  });

  return NextResponse.json(acta);
}

async function manejarDELETE(_request: NextRequest, ctx: RouteContext<"/api/caes/actas/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const acta = await db.actaCaes.findUnique({ where: { id } });
  if (!acta) return NextResponse.json({ error: "El acta no existe." }, { status: 404 });

  await db.actaCaes.delete({ where: { id } });
  fs.rm(rutaPublica(acta.archivoUrl), { force: true }, () => {});

  return NextResponse.json({ ok: true });
}

export const PATCH = conAuditoria(manejarPATCH);
export const DELETE = conAuditoria(manejarDELETE);
