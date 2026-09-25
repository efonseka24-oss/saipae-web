// Copia de seguridad completa del sistema en un ZIP, y su restauración.
//
// El ZIP trae todo lo necesario para reconstruir el servidor:
//   base-de-datos/saipae.db       copia exacta de la base SQLite (la que se restaura)
//   datos/<Tabla>.json            cada tabla en JSON, para revisarla sin programas
//   visitas/<esquema>/<visita>/   cada visita con sus respuestas (JSON y CSV para
//                                 Excel), sus archivos cargados y sus documentos
//                                 generados
//   archivos-cargados/...         el resto de public/uploads (firmas, CAES, PQRS,
//                                 laboratorios, logos, ...)
//   documentos-generados/...      el resto de public/generados (PQRS, pruebas, ...)
//   manifiesto.json               versión, conteos y, para cada archivo del ZIP,
//                                 su ruta original en el servidor (así se restaura)
//   LEEME.txt                     explicación para quien lo abra
//
// Los archivos no se duplican: cada uno está una sola vez en el ZIP, en la
// carpeta más fácil de revisar, y el manifiesto dice a dónde vuelve.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { Unzip, UnzipInflate, Zip, ZipDeflate, ZipPassThrough } from "fflate";
import { db } from "@/lib/db";

export const FORMATO_RESPALDO = "saipae-respaldo";
export const VERSION_FORMATO = 1;

const CARPETA_PUBLICA = path.join(process.cwd(), "public");
// Extensiones que ya vienen comprimidas: se guardan tal cual (más rápido).
const SIN_COMPRIMIR = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".docx", ".xlsx", ".pptx", ".zip", ".mp4", ".mov", ".heic"]);

export function rutaBaseDatos(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const ruta = url.replace(/^file:/, "");
  return path.isAbsolute(ruta) ? ruta : path.resolve(/*turbopackIgnore: true*/ process.cwd(), ruta);
}

type ArchivoManifiesto = { zip: string; original: string };

export type Manifiesto = {
  formato: string;
  version: number;
  creadoEn: string;
  creadoPor: string;
  migraciones: string[];
  conteos: Record<string, number>;
  archivos: ArchivoManifiesto[];
};

// --- utilidades ------------------------------------------------------------

function limpiarNombre(texto: string, maximo = 80): string {
  const limpio = texto
    .normalize("NFC")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "");
  return (limpio || "sin-nombre").slice(0, maximo).trim();
}

function fechaColombia(fecha: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(fecha);
}

export function nombreArchivoRespaldo(fecha = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const p = (tipo: string) => partes.find((x) => x.type === tipo)?.value ?? "";
  return `saipae-respaldo-${p("year")}-${p("month")}-${p("day")}_${p("hour")}${p("minute")}.zip`;
}

// Todos los archivos bajo `raiz`, como rutas relativas con "/".
function listarArchivos(raiz: string): string[] {
  if (!fs.existsSync(raiz)) return [];
  const salida: string[] = [];
  const recorrer = (carpeta: string) => {
    for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
      const completa = path.join(carpeta, entrada.name);
      if (entrada.isDirectory()) recorrer(completa);
      else if (entrada.isFile() && entrada.name !== ".gitkeep") salida.push(path.relative(raiz, completa).split(path.sep).join("/"));
    }
  };
  recorrer(raiz);
  return salida;
}

function csv(filas: (string | number | null | undefined)[][]): string {
  const celda = (v: string | number | null | undefined) => {
    const texto = v == null ? "" : String(v);
    return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
  };
  // BOM + punto y coma: Excel en español lo abre con tildes y columnas bien.
  return "﻿" + filas.map((fila) => fila.map(celda).join(";")).join("\r\n");
}

// Nombres únicos dentro de una misma carpeta del ZIP.
function nombreUnico(usados: Set<string>, nombre: string): string {
  if (!usados.has(nombre)) {
    usados.add(nombre);
    return nombre;
  }
  const ext = path.extname(nombre);
  const base = nombre.slice(0, nombre.length - ext.length);
  for (let i = 2; ; i++) {
    const candidato = `${base} (${i})${ext}`;
    if (!usados.has(candidato)) {
      usados.add(candidato);
      return candidato;
    }
  }
}

// Copia consistente de la base (aunque haya escrituras en curso).
async function copiarBaseDatos(destino: string): Promise<void> {
  const origen = new Database(rutaBaseDatos(), { readonly: true, fileMustExist: true });
  try {
    await origen.backup(destino);
  } finally {
    origen.close();
  }
}

function tablasDe(conexion: Database.Database, esquema = "main"): string[] {
  return (
    conexion
      .prepare(`SELECT name FROM "${esquema}".sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
      .all() as { name: string }[]
  ).map((t) => t.name);
}

function columnasDe(conexion: Database.Database, tabla: string, esquema = "main"): { name: string; type: string }[] {
  return conexion.prepare(`PRAGMA "${esquema}".table_info("${tabla.replace(/"/g, '""')}")`).all() as { name: string; type: string }[];
}

// --- crear el respaldo -----------------------------------------------------

// Genera el ZIP como un stream que el navegador descarga mientras se arma
// (no se guarda entero en memoria ni en disco).
export function crearStreamRespaldo(creadoPor: string): ReadableStream<Uint8Array> {
  let controlador!: ReadableStreamDefaultController<Uint8Array>;
  let despertar: (() => void) | null = null;
  let cancelado = false;

  const stream = new ReadableStream<Uint8Array>(
    {
      start(c) {
        controlador = c;
      },
      pull() {
        despertar?.();
        despertar = null;
      },
      cancel() {
        cancelado = true;
        despertar?.();
      },
    },
    { highWaterMark: 8 * 1024 * 1024, size: (trozo) => trozo.byteLength }
  );

  // Espera a que el navegador consuma lo ya enviado (control de flujo).
  const hayEspacio = async () => {
    while (!cancelado && (controlador.desiredSize ?? 1) <= 0) {
      await new Promise<void>((resolver) => (despertar = resolver));
    }
  };

  const zip = new Zip((error, trozo, final) => {
    if (cancelado) return;
    if (error) {
      controlador.error(error);
      return;
    }
    controlador.enqueue(trozo);
    if (final) controlador.close();
  });

  const agregarTexto = async (ruta: string, contenido: string) => {
    const entrada = new ZipDeflate(ruta, { level: 6 });
    zip.add(entrada);
    entrada.push(new TextEncoder().encode(contenido), true);
    await hayEspacio();
  };

  const agregarArchivo = async (ruta: string, origen: string) => {
    const entrada = SIN_COMPRIMIR.has(path.extname(origen).toLowerCase()) ? new ZipPassThrough(ruta) : new ZipDeflate(ruta, { level: 6 });
    zip.add(entrada);
    const lector = fs.createReadStream(origen, { highWaterMark: 1024 * 1024 });
    for await (const trozo of lector) {
      if (cancelado) {
        lector.destroy();
        return;
      }
      entrada.push(trozo as Buffer);
      await hayEspacio();
    }
    entrada.push(new Uint8Array(0), true);
    await hayEspacio();
  };

  (async () => {
    const temporal = fs.mkdtempSync(path.join(os.tmpdir(), "saipae-respaldo-"));
    try {
      const archivosManifiesto: ArchivoManifiesto[] = [];
      const archivoEnZip = async (rutaZip: string, original: string) => {
        await agregarArchivo(rutaZip, path.join(CARPETA_PUBLICA, original));
        archivosManifiesto.push({ zip: rutaZip, original });
      };

      // 1. Base de datos (copia exacta) y cada tabla en JSON.
      const copiaDb = path.join(temporal, "saipae.db");
      await copiarBaseDatos(copiaDb);
      const conexion = new Database(copiaDb, { readonly: true });
      const conteos: Record<string, number> = {};
      let migraciones: string[] = [];
      try {
        migraciones = (
          conexion.prepare(`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name`).all() as {
            migration_name: string;
          }[]
        ).map((m) => m.migration_name);
        for (const tabla of tablasDe(conexion).filter((t) => t !== "_prisma_migrations")) {
          const fechas = columnasDe(conexion, tabla)
            .filter((c) => c.type.toUpperCase() === "DATETIME")
            .map((c) => c.name);
          const filas = (conexion.prepare(`SELECT * FROM "${tabla}"`).all() as Record<string, unknown>[]).map((fila) => {
            for (const columna of fechas) {
              const valor = fila[columna];
              if (typeof valor === "number") fila[columna] = new Date(valor).toISOString();
            }
            return fila;
          });
          conteos[tabla] = filas.length;
          await agregarTexto(`datos/${tabla}.json`, JSON.stringify(filas, null, 2));
        }
      } finally {
        conexion.close();
      }
      await agregarArchivo("base-de-datos/saipae.db", copiaDb);

      // 2. Visitas, cada una en su carpeta con respuestas, archivos y documentos.
      const incluidos = new Set<string>();
      const visitas = await db.visita.findMany({
        orderBy: { fecha: "asc" },
        include: {
          esquema: { select: { nombre: true } },
          usuario: { select: { usuario: true, nombre: true, correo: true } },
          respuestas: {
            include: {
              pregunta: {
                select: { texto: true, clase: true, orden: true, idApp: true, modulo: { select: { nombre: true, orden: true } } },
              },
            },
          },
        },
      });
      const carpetasUsadas = new Set<string>();
      for (const visita of visitas) {
        const lugar = [visita.municipio, visita.sede ?? visita.institucion].filter(Boolean).join(" - ");
        const carpeta = nombreUnico(
          carpetasUsadas,
          `visitas/${limpiarNombre(visita.esquema.nombre, 40)}/${limpiarNombre(
            `${fechaColombia(visita.fecha)} ${lugar || "sin lugar"} [${visita.id.slice(-8)}]`,
            110
          )}`
        );
        const respuestas = [...visita.respuestas].sort(
          (a, b) => a.pregunta.modulo.orden - b.pregunta.modulo.orden || a.pregunta.orden - b.pregunta.orden
        );

        // Archivos cargados de la visita: con el texto de su pregunta en el nombre.
        const usados = new Set<string>();
        const archivoDeRespuesta = new Map<string, string>();
        const carpetaUploads = `uploads/visitas/${visita.id}`;
        for (const r of respuestas) {
          const original = r.archivoUrl?.replace(/^\//, "");
          if (!original || !fs.existsSync(path.join(CARPETA_PUBLICA, original))) continue;
          const nombre = nombreUnico(usados, `${limpiarNombre(r.pregunta.texto, 60)}${path.extname(original)}`);
          const rutaZip = `${carpeta}/archivos/${nombre}`;
          await archivoEnZip(rutaZip, original);
          incluidos.add(original);
          archivoDeRespuesta.set(r.id, `archivos/${nombre}`);
        }
        for (const relativo of listarArchivos(path.join(CARPETA_PUBLICA, carpetaUploads))) {
          const original = `${carpetaUploads}/${relativo}`;
          if (incluidos.has(original)) continue;
          await archivoEnZip(`${carpeta}/archivos/${nombreUnico(usados, limpiarNombre(relativo.replace(/\//g, " - "), 100))}`, original);
          incluidos.add(original);
        }

        // Documentos generados de la visita (informes, formatos).
        const carpetaGenerados = `generados/${visita.id}`;
        for (const relativo of listarArchivos(path.join(CARPETA_PUBLICA, carpetaGenerados))) {
          const original = `${carpetaGenerados}/${relativo}`;
          await archivoEnZip(`${carpeta}/documentos-generados/${relativo}`, original);
          incluidos.add(original);
        }

        const detalle = {
          id: visita.id,
          esquema: visita.esquema.nombre,
          fecha: visita.fecha.toISOString(),
          estado: visita.estado,
          municipio: visita.municipio,
          institucion: visita.institucion,
          sede: visita.sede,
          operador: visita.operador,
          nit: visita.nit,
          zodes: visita.zodes,
          lote: visita.lote,
          interventor: visita.usuario ? { usuario: visita.usuario.usuario, nombre: visita.usuario.nombre, correo: visita.usuario.correo } : null,
          idEnvioApp: visita.idEnvioApp,
          informeGeneradoEn: visita.informeGeneradoEn?.toISOString() ?? null,
          respuestas: respuestas.map((r) => ({
            modulo: r.pregunta.modulo.nombre,
            item: r.pregunta.idApp,
            clase: r.pregunta.clase,
            pregunta: r.pregunta.texto,
            respuesta: r.valor,
            archivo: archivoDeRespuesta.get(r.id) ?? null,
          })),
        };
        await agregarTexto(`${carpeta}/visita.json`, JSON.stringify(detalle, null, 2));
        await agregarTexto(
          `${carpeta}/respuestas.csv`,
          csv([
            ["Módulo", "Ítem", "Pregunta", "Respuesta", "Archivo"],
            ...detalle.respuestas.map((r) => [r.modulo, r.item, r.pregunta, r.respuesta, r.archivo]),
          ])
        );
      }

      // 3. El resto de archivos cargados y documentos generados.
      for (const [carpeta, destino] of [
        ["uploads", "archivos-cargados"],
        ["generados", "documentos-generados"],
      ] as const) {
        for (const relativo of listarArchivos(path.join(CARPETA_PUBLICA, carpeta))) {
          const original = `${carpeta}/${relativo}`;
          if (incluidos.has(original)) continue;
          await archivoEnZip(`${destino}/${relativo}`, original);
        }
      }

      // 4. Manifiesto y explicación.
      const manifiesto: Manifiesto = {
        formato: FORMATO_RESPALDO,
        version: VERSION_FORMATO,
        creadoEn: new Date().toISOString(),
        creadoPor,
        migraciones,
        conteos,
        archivos: archivosManifiesto,
      };
      await agregarTexto("manifiesto.json", JSON.stringify(manifiesto, null, 2));
      await agregarTexto("LEEME.txt", textoLeeme(manifiesto, visitas.length));
      zip.end();
    } catch (error) {
      console.error("Error al crear la copia de seguridad:", error);
      if (!cancelado) controlador.error(error);
    } finally {
      fs.rmSync(temporal, { recursive: true, force: true });
    }
  })();

  return stream;
}

function textoLeeme(manifiesto: Manifiesto, totalVisitas: number): string {
  return `COPIA DE SEGURIDAD SAIPAE
=========================

Creada: ${manifiesto.creadoEn} (hora UTC)
Creada por: ${manifiesto.creadoPor}
Visitas: ${totalVisitas}
Archivos: ${manifiesto.archivos.length}

CONTENIDO
---------
visitas/<esquema>/<fecha> <municipio> - <sede> [<id>]/
    visita.json              Datos de la visita y todas sus respuestas.
    respuestas.csv           Las mismas respuestas, para abrir en Excel.
    archivos/                Fotos, firmas y documentos cargados en la visita.
                             Cada archivo lleva el texto de su pregunta.
    documentos-generados/    Informes y formatos generados para la visita.

archivos-cargados/           Resto de archivos subidos al panel: firmas de
                             usuarios, actas CAES, PQRS, laboratorios, logos.
documentos-generados/        Resto de documentos generados (PQRS, pruebas).
datos/<Tabla>.json           Cada tabla de la base de datos en JSON.
base-de-datos/saipae.db      Copia exacta de la base de datos (SQLite).
manifiesto.json              Versión del sistema, cantidad de registros por
                             tabla y ruta original de cada archivo.

CÓMO RESTAURAR
--------------
En el panel: Administrador -> Copia de seguridad -> Restaurar, y cargue este
ZIP sin modificarlo. Se reemplazan todos los datos del sistema por los de la
copia y los archivos vuelven a su lugar.

Si el servidor quedó vacío (sin usuarios para entrar al panel):
  1. En Easypanel, abra el servicio saipae-web -> Console y ejecute:
       npx tsx prisma/seed.ts
     Crea el usuario "admin" con la clave inicial del sistema.
  2. Entre al panel con ese usuario y restaure este ZIP. Al terminar, los
     usuarios y claves vuelven a ser los de la copia.
`;
}

// --- restaurar -------------------------------------------------------------

export type ResultadoRestauracion = {
  creadoEn: string;
  tablas: number;
  filas: number;
  archivos: number;
  archivosFaltantes: number;
  problemasRelaciones: number;
  copiaPrevia: string;
};

// Descomprime el ZIP en `destino` sin cargarlo entero en memoria.
async function descomprimir(zipRuta: string, destino: string): Promise<void> {
  const pendientes: Promise<void>[] = [];
  let errorZip: Error | null = null;
  const abiertos = new Set<fs.WriteStream>();

  const descompresor = new Unzip((archivo) => {
    const nombre = archivo.name;
    if (nombre.endsWith("/")) return;
    const ruta = path.resolve(destino, nombre);
    if (!ruta.startsWith(path.resolve(destino) + path.sep)) {
      errorZip = new Error(`El ZIP trae una ruta no válida: ${nombre}`);
      return;
    }
    fs.mkdirSync(path.dirname(ruta), { recursive: true });
    const escritor = fs.createWriteStream(ruta);
    abiertos.add(escritor);
    pendientes.push(
      new Promise<void>((resolver, rechazar) => {
        escritor.on("finish", () => {
          abiertos.delete(escritor);
          resolver();
        });
        escritor.on("error", rechazar);
      })
    );
    archivo.ondata = (error, datos, final) => {
      if (error) {
        errorZip = error;
        escritor.destroy(error);
        return;
      }
      escritor.write(datos);
      if (final) escritor.end();
    };
    archivo.start();
  });
  descompresor.register(UnzipInflate);

  for await (const trozo of fs.createReadStream(zipRuta, { highWaterMark: 1024 * 1024 })) {
    descompresor.push(trozo as Buffer);
    if (errorZip) throw errorZip;
    // Control de flujo: si el disco va más lento, se espera antes de seguir leyendo.
    for (const escritor of abiertos) {
      if (escritor.writableNeedDrain) await new Promise<void>((r) => escritor.once("drain", () => r()));
    }
  }
  descompresor.push(new Uint8Array(0), true);
  await Promise.all(pendientes);
  if (errorZip) throw errorZip;
}

export async function restaurarRespaldo(zipRuta: string): Promise<ResultadoRestauracion> {
  const temporal = fs.mkdtempSync(path.join(os.tmpdir(), "saipae-restaurar-"));
  try {
    await descomprimir(zipRuta, temporal);

    const rutaManifiesto = path.join(temporal, "manifiesto.json");
    const rutaDbRespaldo = path.join(temporal, "base-de-datos", "saipae.db");
    if (!fs.existsSync(rutaManifiesto) || !fs.existsSync(rutaDbRespaldo)) {
      throw new ErrorRespaldo("El archivo no es una copia de seguridad de SAIPAE (le falta el manifiesto o la base de datos).");
    }
    const manifiesto = JSON.parse(fs.readFileSync(rutaManifiesto, "utf8")) as Manifiesto;
    if (manifiesto.formato !== FORMATO_RESPALDO) {
      throw new ErrorRespaldo("El archivo no es una copia de seguridad de SAIPAE.");
    }
    if (manifiesto.version > VERSION_FORMATO) {
      throw new ErrorRespaldo("La copia se hizo con una versión más nueva del sistema. Actualice el servidor antes de restaurarla.");
    }

    const rutaDb = rutaBaseDatos();
    const conexion = new Database(rutaDb);
    conexion.pragma("busy_timeout = 15000");
    let copiaPrevia = "";
    let filas = 0;
    let tablasRestauradas = 0;
    let problemasRelaciones = 0;
    try {
      // La copia no puede traer migraciones que este servidor no conoce.
      const migracionesServidor = new Set(
        (conexion.prepare(`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL`).all() as { migration_name: string }[]).map(
          (m) => m.migration_name
        )
      );
      const desconocidas = manifiesto.migraciones.filter((m) => !migracionesServidor.has(m));
      if (desconocidas.length > 0) {
        throw new ErrorRespaldo(
          `La copia es de una versión más nueva del sistema (${desconocidas.join(", ")}). Actualice el servidor antes de restaurarla.`
        );
      }

      // Antes de tocar nada, se guarda la base actual por si hay que volver atrás.
      const carpetaCopias = path.join(path.dirname(rutaDb), "respaldos-automaticos");
      fs.mkdirSync(carpetaCopias, { recursive: true });
      copiaPrevia = path.join(carpetaCopias, `antes-de-restaurar-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
      await conexion.backup(copiaPrevia);

      conexion.pragma("foreign_keys = OFF");
      conexion.prepare(`ATTACH DATABASE ? AS respaldo`).run(rutaDbRespaldo);
      try {
        const tablasRespaldo = new Set(tablasDe(conexion, "respaldo"));
        const tablas = tablasDe(conexion).filter((t) => t !== "_prisma_migrations");
        conexion.transaction(() => {
          for (const tabla of tablas) {
            const nombre = `"${tabla.replace(/"/g, '""')}"`;
            const enRespaldo = tablasRespaldo.has(tabla);
            const columnasRespaldo = enRespaldo ? new Set(columnasDe(conexion, tabla, "respaldo").map((c) => c.name)) : new Set<string>();
            const comunes = columnasDe(conexion, tabla)
              .map((c) => c.name)
              .filter((c) => columnasRespaldo.has(c))
              .map((c) => `"${c.replace(/"/g, '""')}"`)
              .join(", ");
            // La auditoría no se borra: se le suman los registros de la copia.
            if (tabla === "Auditoria") {
              if (enRespaldo && comunes) {
                filas += conexion.prepare(`INSERT OR IGNORE INTO main.${nombre} (${comunes}) SELECT ${comunes} FROM respaldo.${nombre}`).run().changes;
              }
              continue;
            }
            conexion.prepare(`DELETE FROM main.${nombre}`).run();
            if (enRespaldo && comunes) {
              filas += conexion.prepare(`INSERT INTO main.${nombre} (${comunes}) SELECT ${comunes} FROM respaldo.${nombre}`).run().changes;
              tablasRestauradas++;
            }
          }
        })();
        problemasRelaciones = (conexion.prepare(`PRAGMA main.foreign_key_check`).all() as unknown[]).length;
      } finally {
        conexion.prepare(`DETACH DATABASE respaldo`).run();
        conexion.pragma("foreign_keys = ON");
      }
    } finally {
      conexion.close();
    }

    // Archivos: cada uno vuelve a su ruta original dentro de public/.
    let archivos = 0;
    let archivosFaltantes = 0;
    for (const { zip, original } of manifiesto.archivos ?? []) {
      const origen = path.resolve(temporal, zip);
      const destino = path.resolve(CARPETA_PUBLICA, original);
      const permitido = ["uploads", "generados"].some((c) => destino.startsWith(path.join(CARPETA_PUBLICA, c) + path.sep));
      if (!permitido || !origen.startsWith(path.resolve(temporal) + path.sep) || !fs.existsSync(origen)) {
        archivosFaltantes++;
        continue;
      }
      fs.mkdirSync(path.dirname(destino), { recursive: true });
      fs.copyFileSync(origen, destino);
      archivos++;
    }

    return {
      creadoEn: manifiesto.creadoEn,
      tablas: tablasRestauradas,
      filas,
      archivos,
      archivosFaltantes,
      problemasRelaciones,
      copiaPrevia,
    };
  } finally {
    fs.rmSync(temporal, { recursive: true, force: true });
  }
}

// Error con un mensaje apto para mostrar al usuario.
export class ErrorRespaldo extends Error {}
