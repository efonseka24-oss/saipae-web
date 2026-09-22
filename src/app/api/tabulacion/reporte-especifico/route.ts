import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { generarReporteEstadisticas } from "@/lib/generarReporteEstadisticas";
import { ETIQUETAS_AGRUPACION, type AgrupacionEstadistica } from "@/lib/estadisticasEncuestas";

const ORDEN_NIVELES: AgrupacionEstadistica[] = ["departamento", "lote", "zode", "municipio", "institucion"];

function esAgrupacionValida(valor: string): valor is AgrupacionEstadistica {
  return valor in ETIQUETAS_AGRUPACION;
}

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { nivelMaximo } = await request.json();
  if (typeof nivelMaximo !== "string" || !esAgrupacionValida(nivelMaximo)) {
    return NextResponse.json({ error: "Nivel inválido." }, { status: 400 });
  }

  const indice = ORDEN_NIVELES.indexOf(nivelMaximo);
  const niveles = ORDEN_NIVELES.slice(0, indice + 1);

  const buffer = await generarReporteEstadisticas(niveles);
  const nombreArchivo = `Informe_Estadistico_${niveles.map((n) => ETIQUETAS_AGRUPACION[n]).join("-")}.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  });
}
