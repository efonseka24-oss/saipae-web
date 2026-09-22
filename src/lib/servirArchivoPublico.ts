// Sirve archivos de public/uploads y public/generados creados DESPUÉS de que
// arrancó el servidor. `next start` solo publica los archivos de public/ que
// existían al iniciar; los que se suben en producción (fotos, firmas, actas,
// documentos generados) daban 404. Estas rutas los leen directamente del disco.
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

const TIPOS: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain; charset=utf-8",
};

export async function servirArchivoPublico(carpeta: "uploads" | "generados", partes: string[]) {
  const raiz = path.join(process.cwd(), "public", carpeta);
  const ruta = path.resolve(raiz, ...partes.map((p) => decodeURIComponent(p)));

  // Impide salir de la carpeta con "../".
  if (ruta !== raiz && !ruta.startsWith(raiz + path.sep)) {
    return new NextResponse("No encontrado", { status: 404 });
  }

  let datos: Buffer;
  try {
    const info = await fs.promises.stat(ruta);
    if (!info.isFile()) return new NextResponse("No encontrado", { status: 404 });
    datos = await fs.promises.readFile(ruta);
  } catch {
    return new NextResponse("No encontrado", { status: 404 });
  }

  return new NextResponse(new Uint8Array(datos), {
    headers: {
      "Content-Type": TIPOS[path.extname(ruta).toLowerCase()] ?? "application/octet-stream",
      "Cache-Control": "public, max-age=0",
    },
  });
}
