// Descarga la copia de seguridad completa (ZIP). Se arma mientras se descarga.
import { NextRequest, NextResponse } from "next/server";
import { sesionAdministrador } from "@/lib/sesionAdministrador";
import { crearStreamRespaldo, nombreArchivoRespaldo } from "@/lib/respaldo";
import { origenDeSolicitud, registrarAuditoria } from "@/lib/auditoria";

export async function GET(request: NextRequest) {
  const sesion = await sesionAdministrador();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const nombre = nombreArchivoRespaldo();
  await registrarAuditoria({
    tipo: "RESPALDO",
    accion: "Descargó copia de seguridad",
    descripcion: `Descargó la copia de seguridad ${nombre}`,
    modulo: "Administrador",
    usuarioId: sesion.id,
    usuario: sesion.usuario,
    nombre: sesion.nombre,
    metodo: "GET",
    ruta: request.nextUrl.pathname,
    estado: 200,
    ...origenDeSolicitud(request),
  });

  return new Response(crearStreamRespaldo(`${sesion.nombre} (${sesion.usuario})`), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
