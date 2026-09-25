import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { manejarSubidaImagenEmpresa } from "@/lib/subirImagenEmpresa";
import { conAuditoria } from "@/lib/auditoria";

async function manejarPOST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  return manejarSubidaImagenEmpresa(request, "logoUrl", "logo");
}

export const POST = conAuditoria(manejarPOST);
