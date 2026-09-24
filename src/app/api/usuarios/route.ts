import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { serializarModulosPermitidos, TODOS_LOS_MODULOS_IDS } from "@/lib/permisosModulos";
import { esCorreoValido, guardarFirma, validarFirma } from "@/lib/firmaUsuario";

const SELECCION_USUARIO = {
  id: true,
  usuario: true,
  nombre: true,
  cedula: true,
  activo: true,
  cargo: true,
  correo: true,
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

// Crea un usuario. Llega como multipart (FormData) porque la firma es
// obligatoria y se sube junto con los datos: cédula, nombre, cargo, correo y
// firma son requeridos (el correo une las visitas de la app con el usuario).
export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const formData = await request.formData();
  const texto = (clave: string) => {
    const valor = formData.get(clave);
    return typeof valor === "string" ? valor.trim() : "";
  };
  const usuario = texto("usuario");
  const nombre = texto("nombre");
  const cedula = texto("cedula");
  const cargo = texto("cargo");
  const correo = texto("correo").toLowerCase();
  const clave = typeof formData.get("clave") === "string" ? (formData.get("clave") as string) : "";
  const firma = formData.get("firma");
  let modulosPermitidos: unknown = TODOS_LOS_MODULOS_IDS;
  try {
    modulosPermitidos = JSON.parse(texto("modulosPermitidos") || "null") ?? TODOS_LOS_MODULOS_IDS;
  } catch {}

  if (!usuario) return NextResponse.json({ error: "El usuario es obligatorio." }, { status: 400 });
  if (!nombre) return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  if (!cedula) return NextResponse.json({ error: "La cédula es obligatoria." }, { status: 400 });
  if (!cargo) return NextResponse.json({ error: "El cargo es obligatorio." }, { status: 400 });
  if (!esCorreoValido(correo)) return NextResponse.json({ error: "Escribe un correo válido." }, { status: 400 });
  if (clave.length < 6) return NextResponse.json({ error: "La clave debe tener al menos 6 caracteres." }, { status: 400 });
  const errorFirma = validarFirma(firma);
  if (errorFirma) return NextResponse.json({ error: errorFirma }, { status: 400 });

  const repetido = await db.usuario.findFirst({
    where: { OR: [{ usuario }, { cedula }, { correo }] },
    select: { usuario: true, cedula: true, correo: true },
  });
  if (repetido) {
    const campo = repetido.usuario === usuario ? "usuario" : repetido.cedula === cedula ? "cédula" : "correo";
    return NextResponse.json({ error: `Ya existe un usuario con ese ${campo}.` }, { status: 409 });
  }

  const nuevo = await db.usuario.create({
    data: {
      usuario,
      nombre,
      cedula,
      cargo,
      correo,
      clave: await bcrypt.hash(clave, 10),
      modulosPermitidos: serializarModulosPermitidos(Array.isArray(modulosPermitidos) ? modulosPermitidos : TODOS_LOS_MODULOS_IDS),
    },
  });

  try {
    const firmaUrl = await guardarFirma(nuevo.id, firma as File, null);
    const conFirma = await db.usuario.update({ where: { id: nuevo.id }, data: { firmaUrl }, select: SELECCION_USUARIO });
    return NextResponse.json(conFirma, { status: 201 });
  } catch {
    // Sin firma el usuario queda incompleto: se deshace la creación.
    await db.usuario.delete({ where: { id: nuevo.id } });
    return NextResponse.json({ error: "No se pudo guardar la firma. Intenta de nuevo." }, { status: 500 });
  }
}
