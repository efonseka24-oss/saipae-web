import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { serializarModulosPermitidos } from "@/lib/permisosModulos";

const SELECCION_USUARIO = {
  id: true,
  usuario: true,
  nombre: true,
  cedula: true,
  activo: true,
  cargo: true,
  firmaUrl: true,
  modulosPermitidos: true,
} as const;

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/usuarios/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const { usuario, nombre, cedula, claveNueva, activo, cargo, modulosPermitidos } = await request.json();

  if (typeof usuario !== "string" || !usuario.trim()) {
    return NextResponse.json({ error: "El usuario es obligatorio." }, { status: 400 });
  }
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (typeof cedula !== "string" || !cedula.trim()) {
    return NextResponse.json({ error: "La cédula es obligatoria (se usa para reiniciar la clave)." }, { status: 400 });
  }
  if (claveNueva !== undefined && claveNueva !== "" && claveNueva.length < 6) {
    return NextResponse.json({ error: "La nueva clave debe tener al menos 6 caracteres." }, { status: 400 });
  }
  if (activo === false && id === sesion.id) {
    return NextResponse.json({ error: "No puedes desactivar tu propio usuario mientras tienes la sesión abierta." }, { status: 400 });
  }
  if (Array.isArray(modulosPermitidos) && id === sesion.id && !modulosPermitidos.includes("administrador")) {
    return NextResponse.json({ error: "No puedes quitarte a ti mismo el acceso a Administrador." }, { status: 400 });
  }

  try {
    const actualizado = await db.usuario.update({
      where: { id },
      data: {
        usuario: usuario.trim(),
        nombre: nombre.trim(),
        cedula: cedula.trim(),
        ...(typeof activo === "boolean" ? { activo } : {}),
        ...(claveNueva ? { clave: await bcrypt.hash(claveNueva, 10) } : {}),
        ...(typeof cargo === "string" ? { cargo: cargo.trim() || null } : {}),
        ...(Array.isArray(modulosPermitidos) ? { modulosPermitidos: serializarModulosPermitidos(modulosPermitidos) } : {}),
      },
      select: SELECCION_USUARIO,
    });
    return NextResponse.json(actualizado);
  } catch {
    return NextResponse.json({ error: "No se pudo actualizar el usuario (¿usuario o cédula repetidos?)." }, { status: 409 });
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/usuarios/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;

  if (id === sesion.id) {
    return NextResponse.json({ error: "No puedes eliminar tu propio usuario mientras tienes la sesión abierta." }, { status: 400 });
  }

  const total = await db.usuario.count();
  if (total <= 1) {
    return NextResponse.json({ error: "No puedes eliminar el único usuario del sistema." }, { status: 400 });
  }

  await db.usuario.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
