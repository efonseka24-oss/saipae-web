// Lectura y escritura de todas las tablas de la base (MySQL) para las copias
// de seguridad. Cada tabla viaja como una lista de filas JSON; las fechas van
// en ISO (UTC).
//
// Restaurar también acepta las copias hechas cuando la base era SQLite
// (formato 1, con base-de-datos/saipae.db): así es como se pasan los datos
// del servidor SQLite al MySQL.
import Database from "better-sqlite3";
import { db } from "@/lib/db";

export type Fila = Record<string, unknown>;
type Columna = { nombre: string; tipo: string };
type ClienteTransaccion = Parameters<Parameters<typeof db.$transaction>[0]>[0];

// Tablas propias de Prisma que no se copian ni se restauran.
const TABLAS_EXCLUIDAS = new Set(["_prisma_migrations"]);
const excluida = (tabla: string) => TABLAS_EXCLUIDAS.has(tabla.toLowerCase());

const identificador = (nombre: string) => `\`${nombre.replace(/`/g, "``")}\``;

async function tablasMysql(cliente: ClienteTransaccion | typeof db): Promise<string[]> {
  const filas = await cliente.$queryRawUnsafe<{ nombre: string }[]>(
    "SELECT TABLE_NAME AS nombre FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
  );
  return filas.map((f) => f.nombre).filter((t) => !excluida(t));
}

async function columnasMysql(cliente: ClienteTransaccion | typeof db, tabla: string): Promise<Columna[]> {
  return cliente.$queryRawUnsafe<Columna[]>(
    "SELECT COLUMN_NAME AS nombre, DATA_TYPE AS tipo FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
    tabla
  );
}

// Valor listo para JSON (fechas en ISO, enteros grandes como número).
function aJson(valor: unknown): unknown {
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === "bigint") return Number(valor);
  if (valor instanceof Uint8Array) return Buffer.from(valor).toString("base64");
  return valor;
}

export type VolcadoTablas = { tablas: Record<string, Fila[]>; migraciones: string[] };

// Lee todas las tablas en una sola transacción: la copia queda consistente
// aunque alguien esté guardando datos al mismo tiempo.
export async function volcarTablas(): Promise<VolcadoTablas> {
  return db.$transaction(
    async (tx) => {
      const tablas: Record<string, Fila[]> = {};
      for (const tabla of await tablasMysql(tx)) {
        const filas = await tx.$queryRawUnsafe<Fila[]>(`SELECT * FROM ${identificador(tabla)}`);
        tablas[tabla] = filas.map((fila) => Object.fromEntries(Object.entries(fila).map(([c, v]) => [c, aJson(v)])));
      }
      const migraciones = (
        await tx.$queryRawUnsafe<{ migration_name: string }[]>(
          "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name"
        )
      ).map((m) => m.migration_name);
      return { tablas, migraciones };
    },
    { timeout: 10 * 60 * 1000, maxWait: 60 * 1000 }
  );
}

// Filas de una copia antigua (base SQLite dentro del ZIP).
export function leerTablasSqlite(rutaDb: string): Record<string, Fila[]> {
  const conexion = new Database(rutaDb, { readonly: true, fileMustExist: true });
  try {
    const tablas = (
      conexion.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as { name: string }[]
    )
      .map((t) => t.name)
      .filter((t) => !excluida(t));
    return Object.fromEntries(tablas.map((t) => [t, conexion.prepare(`SELECT * FROM "${t.replace(/"/g, '""')}"`).all() as Fila[]]));
  } finally {
    conexion.close();
  }
}

// Convierte un valor de la copia al tipo de la columna MySQL.
function aMysql(valor: unknown, tipo: string): unknown {
  if (valor === null || valor === undefined) return null;
  switch (tipo) {
    case "datetime":
    case "timestamp":
    case "date": {
      const fecha = new Date(typeof valor === "number" || typeof valor === "string" ? valor : String(valor));
      if (Number.isNaN(fecha.getTime())) throw new Error(`Fecha no válida en la copia: ${String(valor)}`);
      return fecha;
    }
    case "tinyint":
      return typeof valor === "boolean" ? valor : Number(valor) !== 0;
    case "int":
    case "bigint":
    case "smallint":
    case "double":
    case "float":
    case "decimal":
      return Number(valor);
    default:
      return typeof valor === "object" ? JSON.stringify(valor) : String(valor);
  }
}

export type ResultadoCarga = { tablas: number; filas: number };

// Reemplaza el contenido de la base por el de la copia, todo o nada (si algo
// falla no se cambia ninguna tabla). La auditoría no se borra: se le suman
// los registros de la copia que no tenga.
export async function cargarTablas(origen: Record<string, Fila[]>): Promise<ResultadoCarga> {
  return db.$transaction(
    async (tx) => {
      let filas = 0;
      let tablasRestauradas = 0;
      // Sin distinguir mayúsculas: MySQL en Windows guarda los nombres de tabla en minúscula.
      const origenPorTabla = new Map(Object.entries(origen).map(([t, f]) => [t.toLowerCase(), f]));
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
      try {
        for (const tabla of await tablasMysql(tx)) {
          const columnas = await columnasMysql(tx, tabla);
          const filasOrigen = origenPorTabla.get(tabla.toLowerCase());
          const esAuditoria = tabla.toLowerCase() === "auditoria";
          if (!esAuditoria) await tx.$executeRawUnsafe(`DELETE FROM ${identificador(tabla)}`);
          if (!filasOrigen?.length) continue;

          // Solo las columnas que existen en ambos lados (la copia puede ser de otra versión).
          const presentes = new Set(Object.keys(filasOrigen[0]));
          const comunes = columnas.filter((c) => presentes.has(c.nombre));
          if (comunes.length === 0) continue;

          const lote = Math.max(1, Math.min(500, Math.floor(30000 / comunes.length)));
          const listaColumnas = comunes.map((c) => identificador(c.nombre)).join(", ");
          const marcador = `(${comunes.map(() => "?").join(", ")})`;
          for (let i = 0; i < filasOrigen.length; i += lote) {
            const grupo = filasOrigen.slice(i, i + lote);
            const valores = grupo.flatMap((fila) => comunes.map((c) => aMysql(fila[c.nombre], c.tipo)));
            filas += await tx.$executeRawUnsafe(
              `INSERT ${esAuditoria ? "IGNORE " : ""}INTO ${identificador(tabla)} (${listaColumnas}) VALUES ${grupo.map(() => marcador).join(", ")}`,
              ...valores
            );
          }
          tablasRestauradas++;
        }
      } finally {
        await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
      }
      return { tablas: tablasRestauradas, filas };
    },
    { timeout: 20 * 60 * 1000, maxWait: 60 * 1000 }
  );
}

export async function migracionesServidor(): Promise<Set<string>> {
  const filas = await db.$queryRawUnsafe<{ migration_name: string }[]>(
    "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL"
  );
  return new Set(filas.map((f) => f.migration_name));
}
