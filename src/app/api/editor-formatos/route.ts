import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { listarPlantillas } from "@/lib/listarPlantillas";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  return NextResponse.json(listarPlantillas());
}
