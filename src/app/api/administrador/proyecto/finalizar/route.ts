// Finaliza el proyecto: guarda la copia de seguridad en el servidor y deja el
// sistema en blanco. Exige la frase de confirmación en el cuerpo.
import { NextRequest, NextResponse } from "next/server";
import { sesionAdministrador } from "@/lib/sesionAdministrador";
import { origenDeSolicitud, registrarAuditoria } from "@/lib/auditoria";
import { ErrorFinalizarProyecto, FRASE_CONFIRMACION, finalizarProyecto } from "@/lib/finalizarProyecto";

export async function POST(request: NextRequest) {
  const sesion = await sesionAdministrador();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const cuerpo = await request.json().catch(() => null);
  if (cuerpo?.confirmacion !== FRASE_CONFIRMACION) {
    return NextResponse.json({ error: `Escribe "${FRASE_CONFIRMACION}" para confirmar.` }, { status: 400 });
  }

  const base = {
    tipo: "RESPALDO" as const,
    accion: "Finalizó el proyecto",
    modulo: "Administrador",
    usuarioId: sesion.id,
    usuario: sesion.usuario,
    nombre: sesion.nombre,
    metodo: "POST",
    ruta: request.nextUrl.pathname,
    ...origenDeSolicitud(request),
  };

  try {
    const { respaldo, filasBorradas } = await finalizarProyecto(`${sesion.nombre} (${sesion.usuario})`);
    await registrarAuditoria({
      ...base,
      descripcion: `Finalizó el proyecto: copia guardada como ${respaldo.nombre} y ${filasBorradas} registro(s) borrados`,
      estado: 200,
    });
    return NextResponse.json({ nombre: respaldo.nombre, bytes: respaldo.bytes, filasBorradas });
  } catch (error) {
    const mensaje = error instanceof ErrorFinalizarProyecto ? error.message : "No se pudo finalizar el proyecto.";
    if (!(error instanceof ErrorFinalizarProyecto)) console.error("Error al finalizar el proyecto:", error);
    await registrarAuditoria({ ...base, descripcion: `Falló al finalizar el proyecto: ${mensaje}`, estado: 500, exito: false });
    return NextResponse.json({ error: mensaje }, { status: error instanceof ErrorFinalizarProyecto ? 409 : 500 });
  }
}
