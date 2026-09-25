import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { anotarAuditoria, conAuditoria } from "@/lib/auditoria";

async function manejarPOST(request: NextRequest) {
  const { usuario, cedula, claveNueva } = await request.json();

  if (typeof usuario !== "string" || !usuario.trim()) {
    return NextResponse.json({ error: "Escribe tu usuario." }, { status: 400 });
  }
  if (typeof cedula !== "string" || !cedula.trim()) {
    return NextResponse.json({ error: "Escribe tu cédula." }, { status: 400 });
  }
  if (typeof claveNueva !== "string" || claveNueva.length < 6) {
    return NextResponse.json({ error: "La nueva clave debe tener al menos 6 caracteres." }, { status: 400 });
  }

  const registro = await db.usuario.findUnique({ where: { usuario: usuario.trim() } });
  anotarAuditoria(request, {
    usuarioId: registro?.id ?? null,
    usuario: usuario.trim().slice(0, 100),
    nombre: registro?.nombre ?? null,
    descripcion: "Intentó restablecer la clave con usuario y cédula",
  });
  if (!registro || registro.cedula !== cedula.trim()) {
    return NextResponse.json({ error: "Usuario o cédula incorrectos." }, { status: 401 });
  }

  const claveHash = await bcrypt.hash(claveNueva, 10);
  await db.usuario.update({ where: { id: registro.id }, data: { clave: claveHash } });

  anotarAuditoria(request, { descripcion: "Restableció su clave con usuario y cédula" });
  return NextResponse.json({ ok: true });
}

export const POST = conAuditoria(manejarPOST);
