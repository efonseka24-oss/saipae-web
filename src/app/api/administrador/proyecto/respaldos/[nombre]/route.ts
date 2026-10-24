// Descarga una copia de proyecto finalizado guardada en el servidor.
import fs from "node:fs";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { sesionAdministrador } from "@/lib/sesionAdministrador";
import { rutaRespaldoProyecto } from "@/lib/finalizarProyecto";

export async function GET(_request: NextRequest, ctx: RouteContext<"/api/administrador/proyecto/respaldos/[nombre]">) {
  const sesion = await sesionAdministrador();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { nombre } = await ctx.params;
  const ruta = rutaRespaldoProyecto(nombre);
  if (!ruta) return NextResponse.json({ error: "La copia no existe." }, { status: 404 });

  return new Response(Readable.toWeb(fs.createReadStream(ruta)) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(fs.statSync(ruta).size),
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
