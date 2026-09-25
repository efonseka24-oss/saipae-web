import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { categoriaComoToken, nombrePlantilla } from "@/lib/mapasPlantillas";
import { conAuditoria } from "@/lib/auditoria";

async function manejarGET(
  _request: NextRequest,
  ctx: RouteContext<"/api/editor-formatos/[categoria]/descargar">
) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { categoria: categoriaCruda } = await ctx.params;
  const categoria = categoriaComoToken(categoriaCruda);
  if (!categoria) return NextResponse.json({ error: "Categoría inválida." }, { status: 400 });

  const archivo = nombrePlantilla(categoria);
  const ruta = path.join(process.cwd(), "templates", archivo);
  if (!fs.existsSync(ruta)) {
    return NextResponse.json({ error: "No hay plantilla cargada para esta categoría." }, { status: 404 });
  }

  const bytes = fs.readFileSync(ruta);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${archivo}"`,
    },
  });
}

export const GET = conAuditoria(manejarGET);
