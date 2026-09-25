// Configuración del conector MySQL de Prisma a partir de DATABASE_URL
// (mysql://usuario:clave@host:puerto/base). La comparten el panel, el seed y
// los scripts. `allowPublicKeyRetrieval` hace falta con la autenticación por
// defecto de MySQL 8 cuando la conexión no usa SSL (red interna de Easypanel).
import type { PoolConfig } from "mariadb";

export function configuracionMysql(url = process.env.DATABASE_URL): PoolConfig {
  if (!url || !/^mysql:\/\//.test(url)) {
    throw new Error("DATABASE_URL debe ser una URL de MySQL (mysql://usuario:clave@host:3306/base).");
  }
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, "")),
    connectionLimit: Number(u.searchParams.get("connection_limit")) || 10,
    allowPublicKeyRetrieval: true,
    // Fechas siempre en UTC, igual que las guarda Prisma.
    timezone: "Z",
  };
}
