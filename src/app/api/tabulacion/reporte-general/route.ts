import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { generarReporteEstadisticas } from "@/lib/generarReporteEstadisticas";

const NIVELES = ["departamento", "lote", "zode", "municipio"] as const;

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const buffer = await generarReporteEstadisticas([...NIVELES]);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": 'attachment; filename="Informe_Estadistico_General.docx"',
    },
  });
}
