import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { ModuloId } from "@/lib/modulos";

export const NOMBRE_COOKIE = "saipae_session";
const DURACION_SEGUNDOS = 60 * 60 * 8; // 8 horas

// Exportado para que middleware.ts (Edge runtime, sin acceso a next/headers)
// pueda verificar el mismo JWT sin duplicar el secreto.
export function obtenerSecreto(): Uint8Array {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto) throw new Error("Falta SESSION_SECRET en las variables de entorno.");
  return new TextEncoder().encode(secreto);
}

export type SesionUsuario = {
  id: string;
  usuario: string;
  nombre: string;
  // Snapshot tomado al iniciar sesión: si un administrador cambia los
  // módulos de un usuario con sesión activa, el cambio solo se ve reflejado
  // cuando esa sesión se renueve (nuevo login, o al expirar a las 8 horas).
  modulosPermitidos: ModuloId[];
};

export async function crearSesion(datos: SesionUsuario) {
  const token = await new SignJWT({ usuario: datos.usuario, nombre: datos.nombre, modulosPermitidos: datos.modulosPermitidos })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(datos.id)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SEGUNDOS}s`)
    .sign(obtenerSecreto());

  const jar = await cookies();
  jar.set(NOMBRE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SEGUNDOS,
  });
}

export async function cerrarSesion() {
  const jar = await cookies();
  jar.delete(NOMBRE_COOKIE);
}

export async function obtenerSesion(): Promise<SesionUsuario | null> {
  const jar = await cookies();
  const token = jar.get(NOMBRE_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, obtenerSecreto());
    return {
      id: payload.sub as string,
      usuario: payload.usuario as string,
      nombre: payload.nombre as string,
      modulosPermitidos: (payload.modulosPermitidos as ModuloId[]) ?? [],
    };
  } catch {
    return null;
  }
}
