import type { NextRequest } from "next/server";
import { servirArchivoPublico } from "@/lib/servirArchivoPublico";

export async function GET(_request: NextRequest, ctx: RouteContext<"/uploads/[...ruta]">) {
  const { ruta } = await ctx.params;
  return servirArchivoPublico("uploads", ruta);
}
