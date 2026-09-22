import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB
const EXTENSIONES_PERMITIDAS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function POST(request: NextRequest, ctx: RouteContext<"/api/usuarios/[id]/firma">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const usuario = await db.usuario.findUnique({ where: { id } });
  if (!usuario) return NextResponse.json({ error: "El usuario no existe." }, { status: 404 });

  const formData = await request.formData();
  const archivo = formData.get("firma");

  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "No se recibió ninguna imagen." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return NextResponse.json({ error: "La imagen no puede pesar más de 5 MB." }, { status: 400 });
  }
  const extension = EXTENSIONES_PERMITIDAS[archivo.type];
  if (!extension) {
    return NextResponse.json({ error: "Formato no soportado. Usa PNG, JPG o WEBP." }, { status: 400 });
  }

  const carpeta = path.join(process.cwd(), "public", "uploads", "firmas");
  fs.mkdirSync(carpeta, { recursive: true });

  if (usuario.firmaUrl) {
    fs.rm(path.join(process.cwd(), "public", usuario.firmaUrl.replace(/^\//, "")), { force: true }, () => {});
  }

  const nombreArchivo = `firma-${id}-${Date.now()}.${extension}`;
  const bytes = Buffer.from(await archivo.arrayBuffer());
  fs.writeFileSync(path.join(carpeta, nombreArchivo), bytes);

  const firmaUrl = `/uploads/firmas/${nombreArchivo}`;
  const actualizado = await db.usuario.update({
    where: { id },
    data: { firmaUrl },
    select: { id: true, usuario: true, nombre: true, cedula: true, activo: true, cargo: true, firmaUrl: true },
  });

  return NextResponse.json(actualizado);
}
