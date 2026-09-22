import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { crearSesion } from "@/lib/auth";
import { parsearModulosPermitidos } from "@/lib/permisosModulos";

export async function POST(request: NextRequest) {
  const { usuario, clave } = await request.json();

  if (typeof usuario !== "string" || typeof clave !== "string" || !usuario || !clave) {
    return NextResponse.json({ error: "Usuario y clave son obligatorios." }, { status: 400 });
  }

  const usuarios = await db.usuario.findMany();
  const registro = usuarios.find((u) => u.usuario.toLowerCase() === usuario.toLowerCase());
  if (!registro) {
    return NextResponse.json({ error: "Usuario o clave incorrectos." }, { status: 401 });
  }

  const claveValida = await bcrypt.compare(clave, registro.clave);
  if (!claveValida) {
    return NextResponse.json({ error: "Usuario o clave incorrectos." }, { status: 401 });
  }

  if (!registro.activo) {
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

  return NextResponse.json({ ok: true });
}
