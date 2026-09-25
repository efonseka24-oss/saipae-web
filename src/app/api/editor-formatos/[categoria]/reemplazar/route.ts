import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { categoriaComoToken, nombrePlantilla } from "@/lib/mapasPlantillas";
import { conAuditoria } from "@/lib/auditoria";

const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB
const MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function manejarPOST(
  request: NextRequest,
  ctx: RouteContext<"/api/editor-formatos/[categoria]/reemplazar">
) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { categoria: categoriaCruda } = await ctx.params;
  const categoria = categoriaComoToken(categoriaCruda);
  if (!categoria) return NextResponse.json({ error: "Categoría inválida." }, { status: 400 });

  const formData = await request.formData();
  const archivo = formData.get("plantilla");

  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return NextResponse.json({ error: "El archivo no puede pesar más de 20 MB." }, { status: 400 });
  }
  const esDocx = archivo.type === MIME_DOCX || archivo.name.toLowerCase().endsWith(".docx");
  if (!esDocx) {
    return NextResponse.json({ error: "El archivo debe ser un .docx de Word." }, { status: 400 });
  }

  const nombreArchivo = nombrePlantilla(categoria);
  const carpetaTemplates = path.join(process.cwd(), "templates");
  const carpetaRespaldos = path.join(carpetaTemplates, "respaldos");
  fs.mkdirSync(carpetaRespaldos, { recursive: true });

  const rutaActual = path.join(carpetaTemplates, nombreArchivo);
  if (fs.existsSync(rutaActual)) {
    const marcaTiempo = new Date().toISOString().replace(/[:.]/g, "-");
    const rutaRespaldo = path.join(carpetaRespaldos, `${marcaTiempo}-${nombreArchivo}`);
    fs.copyFileSync(rutaActual, rutaRespaldo);
  }

  const bytes = Buffer.from(await archivo.arrayBuffer());
  fs.writeFileSync(rutaActual, bytes);

  return NextResponse.json({ ok: true });
}

export const POST = conAuditoria(manejarPOST);
