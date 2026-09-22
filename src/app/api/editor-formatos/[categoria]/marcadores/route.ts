import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { categoriaComoToken, mapaParaCategoria, nombrePlantilla } from "@/lib/mapasPlantillas";
import { extraerMarcadores } from "@/lib/marcadoresPlantilla";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/editor-formatos/[categoria]/marcadores">
) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { categoria: categoriaCruda } = await ctx.params;
  const categoria = categoriaComoToken(categoriaCruda);
  if (!categoria) return NextResponse.json({ error: "Categoría inválida." }, { status: 400 });

  const ruta = path.join(process.cwd(), "templates", nombrePlantilla(categoria));
  if (!fs.existsSync(ruta)) {
    return NextResponse.json({ error: "No hay plantilla cargada para esta categoría." }, { status: 404 });
  }

  const mapa = mapaParaCategoria(categoria);
  const marcadores = extraerMarcadores(fs.readFileSync(ruta));

  return NextResponse.json(
    marcadores.map((token) => ({
      token,
      mapeado: mapa ? token in mapa : false,
      indiceColumna: mapa?.[token] ?? null,
    }))
  );
}
