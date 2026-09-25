// Pasa los datos de la base SQLite antigua a MySQL (se usa una vez, al migrar).
// Los archivos (public/uploads, public/generados) no se tocan: siguen en su
// lugar. La base SQLite tampoco se modifica, así que sirve para volver atrás.
//
// En Easypanel → saipae-web → Console:
//   npx tsx prisma/importarDesdeSqlite.ts /app/data/saipae.db
//
// Solo corre si MySQL está vacío (sin usuarios ni visitas); con --forzar
// reemplaza lo que haya.
import "dotenv/config";
import fs from "node:fs";
import { db } from "../src/lib/db";
import { cargarTablas, leerTablasSqlite } from "../src/lib/tablasRespaldo";

async function main() {
  const ruta = process.argv.find((a, i) => i >= 2 && !a.startsWith("--"));
  const forzar = process.argv.includes("--forzar");
  if (!ruta || !fs.existsSync(ruta)) {
    throw new Error(`No se encontró la base SQLite${ruta ? ` en ${ruta}` : ""}. Uso: npx tsx prisma/importarDesdeSqlite.ts <ruta.db>`);
  }

  const [usuarios, visitas] = await Promise.all([db.usuario.count(), db.visita.count()]);
  if ((usuarios > 0 || visitas > 0) && !forzar) {
    throw new Error(
      `MySQL ya tiene datos (${usuarios} usuarios, ${visitas} visitas). Para reemplazarlos por los de SQLite agregue --forzar.`
    );
  }

  const origen = leerTablasSqlite(ruta);
  const conteoOrigen = Object.fromEntries(Object.entries(origen).map(([t, f]) => [t, f.length]));
  console.log("Tablas en SQLite:", conteoOrigen);

  const resultado = await cargarTablas(origen);
  console.log(`Listo: ${resultado.filas} registros en ${resultado.tablas} tablas.`);

  const conteoDestino = {
    Usuario: await db.usuario.count(),
    Visita: await db.visita.count(),
    Respuesta: await db.respuesta.count(),
    Pregunta: await db.pregunta.count(),
    Sede: await db.sede.count(),
  };
  console.log("Ahora en MySQL:", conteoDestino);
  for (const [tabla, total] of Object.entries(conteoDestino)) {
    if ((conteoOrigen[tabla] ?? 0) !== total) console.warn(`ATENCIÓN: ${tabla} tenía ${conteoOrigen[tabla] ?? 0} en SQLite y quedó con ${total}.`);
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
