import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { manejarSubidaImagenEmpresa } from "@/lib/subirImagenEmpresa";

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  return manejarSubidaImagenEmpresa(request, "membreteUrl", "membrete");
}
