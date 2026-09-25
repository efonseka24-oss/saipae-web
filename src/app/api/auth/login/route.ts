import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { crearSesion } from "@/lib/auth";
import { parsearModulosPermitidos } from "@/lib/permisosModulos";
import { anotarAuditoria, conAuditoria } from "@/lib/auditoria";

async function manejarPOST(request: NextRequest) {
  const { usuario, clave } = await request.json();
  // Aún no hay sesión: la auditoría toma el usuario escrito en el formulario.
  if (typeof usuario === "string" && usuario) {
    anotarAuditoria(request, { usuario: usuario.slice(0, 100), accion: "Intentó iniciar sesión", descripcion: "Inicio de sesión fallido" });
  }

  if (typeof usuario !== "string" || typeof clave !== "string" || !usuario || !clave) {
    return NextResponse.json({ error: "Usuario y clave son obligatorios." }, { status: 400 });
  }

  const usuarios = await db.usuario.findMany();
  const registro = usuarios.find((u) => u.usuario.toLowerCase() === usuario.toLowerCase());
  if (!registro) {
    anotarAuditoria(request, { descripcion: "Inicio de sesión fallido: el usuario no existe" });
    return NextResponse.json({ error: "Usuario o clave incorrectos." }, { status: 401 });
  }

  const claveValida = await bcrypt.compare(clave, registro.clave);
  if (!claveValida) {
    anotarAuditoria(request, { usuarioId: registro.id, usuario: registro.usuario, nombre: registro.nombre, descripcion: "Inicio de sesión fallido: clave incorrecta" });
    return NextResponse.json({ error: "Usuario o clave incorrectos." }, { status: 401 });
  }

  if (!registro.activo) {
    anotarAuditoria(request, { usuarioId: registro.id, usuario: registro.usuario, nombre: registro.nombre, descripcion: "Inicio de sesión rechazado: usuario inactivo" });
    return NextResponse.json(
      { error: "Tu usuario está inactivo. Contacta al administrador." },
      { status: 403 }
    );
  }

  await crearSesion({
    id: registro.id,
    usuario: registro.usuario,
    nombre: registro.nombre,
    modulosPermitidos: parsearModulosPermitidos(registro.modulosPermitidos),
  });

  anotarAuditoria(request, {
    usuarioId: registro.id,
    usuario: registro.usuario,
    nombre: registro.nombre,
    accion: "Inició sesión",
    descripcion: "Inició sesión en el panel",
  });
  return NextResponse.json({ ok: true });
}

export const POST = conAuditoria(manejarPOST);
