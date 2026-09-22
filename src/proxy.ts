// Aplica el control de acceso por módulo a nivel de ruta: si un usuario con
// sesión válida entra a la URL de un módulo que no tiene permitido, lo
// redirige en vez de dejarlo ver la página. No reemplaza el chequeo de
// "¿hay sesión?" que ya hace web/src/app/(panel)/layout.tsx — si no hay
// sesión (o el token no es válido), esto deja pasar la petición y ese layout
// se encarga de mandar a /login.
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { MODULOS, type ModuloId } from "@/lib/modulos";
import { moduloDeRuta, tieneAccesoModulo } from "@/lib/permisosModulos";

// Autocontenido a propósito (no importa de @/lib/auth): el middleware corre
// en Edge runtime, y @/lib/auth importa next/headers (pensado para Server
// Components/Route Handlers, no para middleware). El nombre de la cookie y
// el secreto se duplican aquí para no arrastrar esa dependencia.
const NOMBRE_COOKIE = "saipae_session";

function obtenerSecreto(): Uint8Array {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) throw new Error("Falta SESSION_SECRET en las variables de entorno.");
  return new TextEncoder().encode(secreto);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const moduloId = moduloDeRuta(pathname);
  if (!moduloId) return NextResponse.next();

  const token = request.cookies.get(NOMBRE_COOKIE)?.value;
  if (!token) return NextResponse.next();

  let modulosPermitidos: ModuloId[] = [];
  try {
    const { payload } = await jwtVerify(token, obtenerSecreto());
    modulosPermitidos = (payload.modulosPermitidos as ModuloId[]) ?? [];
  } catch {
    return NextResponse.next();
  }

  if (tieneAccesoModulo(modulosPermitidos, moduloId)) return NextResponse.next();

  const primerModuloPermitido = MODULOS.find((m) => modulosPermitidos.includes(m.id));
  const destino = primerModuloPermitido?.href ?? "/login";
  return NextResponse.redirect(new URL(destino, request.url));
}

export const config = {
  matcher: ["/((?!api|_next|uploads|generados|login).*)"],
};
