import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@prisma/client";
import { configuracionMysql } from "@/lib/conexionMysql";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function crearCliente() {
  return new PrismaClient({ adapter: new PrismaMariaDb(configuracionMysql()) });
}

export const db = globalForPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
