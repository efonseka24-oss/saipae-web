import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { configuracionMysql } from "../src/lib/conexionMysql";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb(configuracionMysql());
const db = new PrismaClient({ adapter });

const ESQUEMAS_INICIALES = [
  { nombre: "RPS", descripcion: "Visita RPS" },
  { nombre: "RI", descripcion: "Visita RI" },
  { nombre: "CCT", descripcion: "Visita CCT" },
  { nombre: "Bodega", descripcion: "Visita Bodega" },
  { nombre: "Bodega Administrativa", descripcion: "Visita Bodega Administrativa" },
];

async function main() {
  const claveHash = await bcrypt.hash("interpae2026", 10);

  await db.usuario.upsert({
    where: { usuario: "admin" },
    update: {},
    create: {
      usuario: "admin",
      clave: claveHash,
      nombre: "Administrador",
      // Placeholder: cámbiala por la cédula real desde el módulo Administrador.
      cedula: "0000000000",
      activo: true,
    },
  });

  for (const esquema of ESQUEMAS_INICIALES) {
    await db.esquema.upsert({
      where: { nombre: esquema.nombre },
      update: {},
      create: esquema,
    });
  }

  console.log("Seed completo: usuario admin + 5 esquemas base.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
