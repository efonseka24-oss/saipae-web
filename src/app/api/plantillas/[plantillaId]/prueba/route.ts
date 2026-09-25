import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { generarReportePlantilla } from "@/lib/generarReportePlantilla";
import { generarReporteGrupoEspecial } from "@/lib/generarReporteGrupoEspecial";
import { esTipoGrupoEspecial } from "@/lib/plantillaPreguntas";
import { conAuditoria } from "@/lib/auditoria";

// Genera el .docx de la plantilla usando la visita más reciente de uno de
// sus esquemas vinculados, para que el administrador pueda revisar el
// resultado sin salir del editor.
async function manejarPOST(request: NextRequest, ctx: RouteContext<"/api/plantillas/[plantillaId]/prueba">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { plantillaId } = await ctx.params;

  const plantilla = await db.plantilla.findUnique({
    where: { id: plantillaId },
    include: { esquemas: { select: { id: true } } },
  });
  if (!plantilla) {
    return NextResponse.json({ error: "La plantilla no existe." }, { status: 404 });
  }
  if (plantilla.esquemas.length === 0) {
    return NextResponse.json({ error: "Vincula esta plantilla a un esquema antes de generar una prueba." }, { status: 400 });
  }

  const cuerpo = await request.json().catch(() => ({}));
  const esquemaIdSolicitado = typeof cuerpo.esquemaId === "string" ? cuerpo.esquemaId : undefined;
  const esquemaId =
    esquemaIdSolicitado && plantilla.esquemas.some((e) => e.id === esquemaIdSolicitado)
      ? esquemaIdSolicitado
      : plantilla.esquemas[0].id;

  const visita = await db.visita.findFirst({ where: { esquemaId }, orderBy: { updatedAt: "desc" } });
  if (!visita) {
    return NextResponse.json({ error: "Ese esquema todavía no tiene visitas para usar de prueba." }, { status: 404 });
  }

  const resultado = esTipoGrupoEspecial(plantilla.tipo)
    ? await generarReporteGrupoEspecial(visita.id, plantilla.tipo)
    : await generarReportePlantilla(visita.id);
  if (!resultado) {
    return NextResponse.json({ error: "No se pudo generar el documento de prueba." }, { status: 500 });
  }

  const { nombreArchivo, buffer } = resultado;
  const carpetaSalida = path.join(process.cwd(), "public", "generados", "plantillas-prueba");
  fs.mkdirSync(carpetaSalida, { recursive: true });
  fs.writeFileSync(path.join(carpetaSalida, nombreArchivo), buffer);

  return NextResponse.json({ docxUrl: `/generados/plantillas-prueba/${nombreArchivo}` });
}

export const POST = conAuditoria(manejarPOST);
