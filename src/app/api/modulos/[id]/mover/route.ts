import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { moverModulo } from "@/lib/ordenPanel";
import { conAuditoria } from "@/lib/auditoria";

// Botones subir/bajar del panel: solo cambian el orden del panel e informes,
// no el orden de la encuesta en la app móvil.
async function manejarPOST(request: NextRequest, ctx: RouteContext<"/api/modulos/[id]/mover">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const { direccion } = await request.json();
  if (direccion !== "arriba" && direccion !== "abajo") {
    return NextResponse.json({ error: "Dirección inválida." }, { status: 400 });
  }

  const movido = await moverModulo(id, direccion);
  return NextResponse.json({ movido });
}

export const POST = conAuditoria(manejarPOST);
