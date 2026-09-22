import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const ID_EMPRESA = "empresa";
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB
const EXTENSIONES_PERMITIDAS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

// Maneja la subida de una imagen de empresa (logo o membrete): valida el
// archivo, lo guarda en public/uploads con nombre único, borra la imagen
// anterior de ese mismo campo si existía, y actualiza DatosEmpresa.
export async function manejarSubidaImagenEmpresa(
  request: NextRequest,
  campo: "logoUrl" | "membreteUrl",
  prefijoArchivo: string
) {
  const formData = await request.formData();
  const archivo = formData.get(prefijoArchivo);

  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return NextResponse.json({ error: "La imagen no puede pesar más de 5 MB." }, { status: 400 });
  }
  const extension = EXTENSIONES_PERMITIDAS[archivo.type];
  if (!extension) {
    return NextResponse.json({ error: "Formato no soportado. Usa PNG, JPG, WEBP o SVG." }, { status: 400 });
  }

  const carpetaUploads = path.join(process.cwd(), "public", "uploads");
  fs.mkdirSync(carpetaUploads, { recursive: true });

  const empresaActual = await db.datosEmpresa.findUnique({ where: { id: ID_EMPRESA } });
  const urlAnterior = empresaActual?.[campo];
  if (urlAnterior) {
    const rutaAnterior = path.join(process.cwd(), "public", urlAnterior.replace(/^\//, ""));
    fs.rm(rutaAnterior, { force: true }, () => {});
  }

  const nombreArchivo = `${prefijoArchivo}-${Date.now()}.${extension}`;
  const bytes = Buffer.from(await archivo.arrayBuffer());
  fs.writeFileSync(path.join(carpetaUploads, nombreArchivo), bytes);

  const url = `/uploads/${nombreArchivo}`;
  const datos = await db.datosEmpresa.upsert({
    where: { id: ID_EMPRESA },
    update: { [campo]: url },
    create: { id: ID_EMPRESA, [campo]: url },
  });

  return NextResponse.json(datos);
}
