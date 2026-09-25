// Copia de seguridad completa del sistema en un ZIP, y su restauración.
//
// El ZIP trae todo lo necesario para reconstruir el servidor:
//   datos/<Tabla>.json            cada tabla de la base (MySQL) en JSON: se puede
//                                 revisar sin programas y es lo que se restaura
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
//
// Formato 1: copias de cuando la base era SQLite (traen base-de-datos/saipae.db).
// Formato 2: base MySQL, los datos van en datos/*.json. Se restauran los dos.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import zlib from "node:zlib";
import { Zip, ZipDeflate, ZipPassThrough, strToU8, zipSync } from "fflate";
import { db } from "@/lib/db";
import { cargarTablas, leerTablasSqlite, migracionesServidor, volcarTablas, type Fila } from "@/lib/tablasRespaldo";

export const FORMATO_RESPALDO = "saipae-respaldo";
export const VERSION_FORMATO = 2;

const CARPETA_PUBLICA = path.join(process.cwd(), "public");
// Extensiones que ya vienen comprimidas: se guardan tal cual (más rápido).
const SIN_COMPRIMIR = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".docx", ".xlsx", ".pptx", ".zip", ".mp4", ".mov", ".heic"]);

type ArchivoManifiesto = { zip: string; original: string };

export type Manifiesto = {
  formato: string;
  version: number;
  creadoEn: string;
  creadoPor: string;
  motor?: "sqlite" | "mysql";
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

      // 1. Cada tabla de la base en JSON (leídas en una sola transacción).
      const { tablas, migraciones } = await volcarTablas();
      const conteos: Record<string, number> = {};
      for (const [tabla, filas] of Object.entries(tablas)) {
        conteos[tabla] = filas.length;
        await agregarTexto(`datos/${tabla}.json`, JSON.stringify(filas, null, 2));
      }

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
        motor: "mysql",
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
datos/<Tabla>.json           Cada tabla de la base de datos (MySQL) en JSON.
                             Es lo que se usa para restaurar.
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
  copiaPrevia: string;
};

// Descomprime el ZIP en `destino` sin cargarlo entero en memoria. Lee el
// índice (directorio central) del final del archivo, que dice dónde empieza
// y cuánto mide cada entrada, y extrae cada una desde el disco. No se lee "en
// cadena" desde el principio: los .docx guardados sin comprimir son a su vez
// ZIPs y confundirían a un lector secuencial.
async function descomprimir(zipRuta: string, destino: string): Promise<void> {
  const raiz = path.resolve(destino);
  const descriptor = await fs.promises.open(zipRuta, "r");
  try {
    const tamano = (await descriptor.stat()).size;
    const leer = async (posicion: number, largo: number) => {
      const buffer = Buffer.alloc(largo);
      await descriptor.read(buffer, 0, largo, posicion);
      return buffer;
    };

    // Fin del directorio central: firma 0x06054b50 en los últimos 64 KB.
    const colaLargo = Math.min(tamano, 65557);
    const cola = await leer(tamano - colaLargo, colaLargo);
    let fin = -1;
    for (let i = cola.length - 22; i >= 0; i--) {
      if (cola.readUInt32LE(i) === 0x06054b50) {
        fin = i;
        break;
      }
    }
    if (fin < 0) throw new ErrorRespaldo("El archivo no es un ZIP válido.");
    const totalEntradas = cola.readUInt16LE(fin + 10);
    const tamanoDirectorio = cola.readUInt32LE(fin + 12);
    const inicioDirectorio = cola.readUInt32LE(fin + 16);
    if (inicioDirectorio + tamanoDirectorio > tamano) throw new ErrorRespaldo("El ZIP está incompleto o dañado.");
    const directorio = await leer(inicioDirectorio, tamanoDirectorio);

    let p = 0;
    for (let n = 0; n < totalEntradas; n++) {
      if (directorio.readUInt32LE(p) !== 0x02014b50) throw new ErrorRespaldo("El índice del ZIP está dañado.");
      const metodo = directorio.readUInt16LE(p + 10);
      const tamanoComprimido = directorio.readUInt32LE(p + 20);
      const largoNombre = directorio.readUInt16LE(p + 28);
      const largoExtra = directorio.readUInt16LE(p + 30);
      const largoComentario = directorio.readUInt16LE(p + 32);
      const inicioLocal = directorio.readUInt32LE(p + 42);
      const nombre = directorio.toString("utf8", p + 46, p + 46 + largoNombre);
      p += 46 + largoNombre + largoExtra + largoComentario;
      if (nombre.endsWith("/")) continue;

      const ruta = path.resolve(raiz, nombre);
      if (!ruta.startsWith(raiz + path.sep)) throw new ErrorRespaldo(`El ZIP trae una ruta no válida: ${nombre}`);
      if (metodo !== 0 && metodo !== 8) throw new ErrorRespaldo(`El ZIP usa una compresión no soportada en ${nombre}.`);

      // Los datos empiezan después del encabezado local (su "extra" puede diferir del índice).
      const local = await leer(inicioLocal, 30);
      if (local.readUInt32LE(0) !== 0x04034b50) throw new ErrorRespaldo(`El ZIP está dañado en ${nombre}.`);
      const inicioDatos = inicioLocal + 30 + local.readUInt16LE(26) + local.readUInt16LE(28);

      fs.mkdirSync(path.dirname(ruta), { recursive: true });
      const salida = fs.createWriteStream(ruta);
      if (tamanoComprimido === 0) {
        salida.end();
        await new Promise<void>((resolver, rechazar) => salida.on("finish", () => resolver()).on("error", rechazar));
        continue;
      }
      const lector = fs.createReadStream(zipRuta, { start: inicioDatos, end: inicioDatos + tamanoComprimido - 1 });
      if (metodo === 8) await pipeline(lector, zlib.createInflateRaw(), salida);
      else await pipeline(lector, salida);
    }
  } finally {
    await descriptor.close();
  }
}

export async function restaurarRespaldo(zipRuta: string): Promise<ResultadoRestauracion> {
  const temporal = fs.mkdtempSync(path.join(os.tmpdir(), "saipae-restaurar-"));
  try {
    await descomprimir(zipRuta, temporal);

    const rutaManifiesto = path.join(temporal, "manifiesto.json");
    if (!fs.existsSync(rutaManifiesto)) {
      throw new ErrorRespaldo("El archivo no es una copia de seguridad de SAIPAE (le falta el manifiesto).");
    }
    const manifiesto = JSON.parse(fs.readFileSync(rutaManifiesto, "utf8")) as Manifiesto;
    if (manifiesto.formato !== FORMATO_RESPALDO) {
      throw new ErrorRespaldo("El archivo no es una copia de seguridad de SAIPAE.");
    }
    if (manifiesto.version > VERSION_FORMATO) {
      throw new ErrorRespaldo("La copia se hizo con una versión más nueva del sistema. Actualice el servidor antes de restaurarla.");
    }

    // Datos de la copia: base SQLite (formato 1) o tablas JSON (formato 2).
    let origen: Record<string, Fila[]>;
    if (manifiesto.version === 1) {
      const rutaSqlite = path.join(temporal, "base-de-datos", "saipae.db");
      if (!fs.existsSync(rutaSqlite)) throw new ErrorRespaldo("A la copia le falta la base de datos (base-de-datos/saipae.db).");
      origen = leerTablasSqlite(rutaSqlite);
    } else {
      // La copia MySQL no puede traer migraciones que este servidor no conoce.
      const conocidas = await migracionesServidor();
      const desconocidas = (manifiesto.migraciones ?? []).filter((m) => !conocidas.has(m));
      if (desconocidas.length > 0) {
        throw new ErrorRespaldo(
          `La copia es de una versión más nueva del sistema (${desconocidas.join(", ")}). Actualice el servidor antes de restaurarla.`
        );
      }
      const carpetaDatos = path.join(temporal, "datos");
      if (!fs.existsSync(carpetaDatos)) throw new ErrorRespaldo("A la copia le faltan los datos (carpeta datos/).");
      origen = Object.fromEntries(
        fs
          .readdirSync(carpetaDatos)
          .filter((n) => n.endsWith(".json"))
          .map((n) => [n.slice(0, -5), JSON.parse(fs.readFileSync(path.join(carpetaDatos, n), "utf8")) as Fila[]])
      );
    }

    // Antes de tocar nada, se guardan los datos actuales por si hay que volver atrás.
    const carpetaCopias = process.env.CARPETA_RESPALDOS_AUTOMATICOS ?? path.join(process.cwd(), "data", "respaldos-automaticos");
    fs.mkdirSync(carpetaCopias, { recursive: true });
    const copiaPrevia = path.join(carpetaCopias, `antes-de-restaurar-${new Date().toISOString().replace(/[:.]/g, "-")}.zip`);
    const actual = await volcarTablas();
    fs.writeFileSync(
      copiaPrevia,
      zipSync(Object.fromEntries(Object.entries(actual.tablas).map(([t, filas]) => [`datos/${t}.json`, strToU8(JSON.stringify(filas))])))
    );

    const { tablas: tablasRestauradas, filas } = await cargarTablas(origen);

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
      copiaPrevia,
    };
  } finally {
    fs.rmSync(temporal, { recursive: true, force: true });
  }
}

// Error con un mensaje apto para mostrar al usuario.
export class ErrorRespaldo extends Error {}
