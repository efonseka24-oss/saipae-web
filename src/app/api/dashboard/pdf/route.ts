import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { generarDashboardPdf } from "@/lib/generarDashboardPdf";

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const buffer = await generarDashboardPdf();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="Informe_Estado_General.pdf"',
    },
  });
}
