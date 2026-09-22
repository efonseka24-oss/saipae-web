import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { serializarModulosPermitidos, TODOS_LOS_MODULOS_IDS } from "@/lib/permisosModulos";

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

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const usuarios = await db.usuario.findMany({
    orderBy: { usuario: "asc" },
    select: SELECCION_USUARIO,
  });
  return NextResponse.json(usuarios);
}

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { usuario, nombre, cedula, clave, cargo, modulosPermitidos } = await request.json();

  if (typeof usuario !== "string" || !usuario.trim()) {
    return NextResponse.json({ error: "El usuario es obligatorio." }, { status: 400 });
  }
  if (typeof nombre !== "string" || !nombre.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }
  if (typeof cedula !== "string" || !cedula.trim()) {
    return NextResponse.json({ error: "La cédula es obligatoria (se usa para reiniciar la clave)." }, { status: 400 });
  }
  if (typeof clave !== "string" || clave.length < 6) {
    return NextResponse.json({ error: "La clave debe tener al menos 6 caracteres." }, { status: 400 });
  }

  const claveHash = await bcrypt.hash(clave, 10);

  try {
    const nuevo = await db.usuario.create({
      data: {
        usuario: usuario.trim(),
        nombre: nombre.trim(),
        cedula: cedula.trim(),
        clave: claveHash,
        cargo: typeof cargo === "string" && cargo.trim() ? cargo.trim() : null,
        // Por defecto, un usuario nuevo parte con acceso a todos los
        // módulos; el administrador puede restringirlo después.
        modulosPermitidos: serializarModulosPermitidos(Array.isArray(modulosPermitidos) ? modulosPermitidos : TODOS_LOS_MODULOS_IDS),
      },
      select: SELECCION_USUARIO,
    });
    return NextResponse.json(nuevo, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe un usuario con ese usuario o cédula." }, { status: 409 });
  }
}
