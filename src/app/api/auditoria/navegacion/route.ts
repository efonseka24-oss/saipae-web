// Registra en la auditoría cada página del panel que abre un usuario (lo
// llama RegistroNavegacion desde el layout del panel). No se envuelve con
// conAuditoria: esta ruta ES el registro.
import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { MODULOS } from "@/lib/modulos";
import { moduloDeRuta } from "@/lib/permisosModulos";
import { origenDeSolicitud, registrarAuditoria } from "@/lib/auditoria";

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { ruta } = await request.json().catch(() => ({ ruta: null }));
  if (typeof ruta !== "string" || !ruta.startsWith("/")) {
    return NextResponse.json({ error: "Ruta inválida." }, { status: 400 });
  }

  const modulo = MODULOS.find((m) => m.id === moduloDeRuta(ruta));
  await registrarAuditoria({
    tipo: "NAVEGACION",
    accion: "Abrió página",
    descripcion: `Abrió ${modulo?.etiqueta ?? "el panel"}${ruta !== modulo?.href ? ` (${ruta})` : ""}`,
    modulo: modulo?.etiqueta ?? null,
    usuarioId: sesion.id,
    usuario: sesion.usuario,
    nombre: sesion.nombre,
    metodo: "GET",
    ruta: ruta.slice(0, 500),
    estado: 200,
    ...origenDeSolicitud(request),
  });
  return NextResponse.json({ ok: true });
}
