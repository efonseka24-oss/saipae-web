import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { idsVisitasDelGrupo, calcularEstadisticasVisitas } from "@/lib/estadisticasPreguntas";
import { ETIQUETAS_AGRUPACION, type AgrupacionEstadistica } from "@/lib/estadisticasEncuestas";
import { conAuditoria } from "@/lib/auditoria";

function esAgrupacionValida(valor: string): valor is AgrupacionEstadistica {
  return valor in ETIQUETAS_AGRUPACION;
}

async function manejarPOST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { agrupacion, valor } = await request.json();

  if (typeof agrupacion !== "string" || !esAgrupacionValida(agrupacion)) {
    return NextResponse.json({ error: "Agrupación inválida." }, { status: 400 });
  }
  if (typeof valor !== "string" || !valor) {
    return NextResponse.json({ error: "Falta el valor del grupo." }, { status: 400 });
  }

  const visitaIds = await idsVisitasDelGrupo(agrupacion, valor);
  const esquemas = await calcularEstadisticasVisitas(visitaIds);

  return NextResponse.json({ totalEncuestas: visitaIds.length, esquemas });
}

export const POST = conAuditoria(manejarPOST);
