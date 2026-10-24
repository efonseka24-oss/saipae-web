// Finalizar proyecto: guarda en el servidor una copia de seguridad completa
// (la misma del módulo Respaldo: JSON por tabla, CSV por visita y todos los
// archivos) y, solo si quedó bien guardada, deja el sistema en blanco para
// empezar un proyecto nuevo.
//
// Se conservan los usuarios, los datos de la empresa (con sus fechas de
// proyecto en blanco), el logo y el membrete, las firmas de los usuarios y la
// auditoría. Todo lo demás (Registro, esquemas, plantillas, visitas, PQRS,
// CAES, laboratorios, compras, cronograma, SIMAT, menús y los archivos que
// generaron) se borra.
import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { db } from "@/lib/db";
import { crearStreamRespaldo, nombreArchivoRespaldo } from "@/lib/respaldo";
import { vaciarTablasExcepto } from "@/lib/tablasRespaldo";

export const FRASE_CONFIRMACION = "FINALIZAR PROYECTO";

// data/ es un montaje persistente en Easypanel (/opt/saipae/data → /app/data).
export const CARPETA_RESPALDOS_PROYECTO = path.join(process.cwd(), "data", "respaldos-proyecto");

const CARPETA_UPLOADS = path.join(process.cwd(), "public", "uploads");
const CARPETA_GENERADOS = path.join(process.cwd(), "public", "generados");
// Carpetas de uploads que no pertenecen al proyecto.
const UPLOADS_CONSERVADOS = new Set(["firmas"]);
const TABLAS_CONSERVADAS = ["Usuario", "DatosEmpresa", "Auditoria", "_prisma_migrations"];

export class ErrorFinalizarProyecto extends Error {}

let enCurso = false;

export type RespaldoGuardado = { nombre: string; bytes: number; fecha: Date };

export function listarRespaldosProyecto(): RespaldoGuardado[] {
  if (!fs.existsSync(CARPETA_RESPALDOS_PROYECTO)) return [];
  return fs
    .readdirSync(CARPETA_RESPALDOS_PROYECTO)
    .filter((n) => n.endsWith(".zip"))
    .map((nombre) => {
      const info = fs.statSync(path.join(CARPETA_RESPALDOS_PROYECTO, nombre));
      return { nombre, bytes: info.size, fecha: info.mtime };
    })
    .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
}

// Ruta de un respaldo guardado, o null si el nombre no es válido o no existe.
export function rutaRespaldoProyecto(nombre: string): string | null {
  if (!/^proyecto-finalizado-[\w.-]+\.zip$/.test(nombre)) return null;
  const ruta = path.join(CARPETA_RESPALDOS_PROYECTO, nombre);
  return fs.existsSync(ruta) ? ruta : null;
}

function vaciarCarpeta(carpeta: string, conservar: Set<string> = new Set()) {
  if (!fs.existsSync(carpeta)) return;
  for (const entrada of fs.readdirSync(carpeta, { withFileTypes: true })) {
    // Los archivos ocultos (.gitkeep) y los sueltos de uploads (logo y membrete) no se tocan.
    if (entrada.name.startsWith(".") || conservar.has(entrada.name) || (conservar.size > 0 && !entrada.isDirectory())) continue;
    fs.rmSync(path.join(carpeta, entrada.name), { recursive: true, force: true });
  }
}

export async function finalizarProyecto(creadoPor: string): Promise<{ respaldo: RespaldoGuardado; filasBorradas: number }> {
  if (enCurso) throw new ErrorFinalizarProyecto("Ya hay un proyecto finalizándose. Espera a que termine.");
  enCurso = true;
  let rutaTemporal: string | null = null;
  try {
    // 1) Guardar la copia en el servidor y comprobar que quedó completa.
    fs.mkdirSync(CARPETA_RESPALDOS_PROYECTO, { recursive: true });
    const nombre = `proyecto-finalizado-${nombreArchivoRespaldo().replace(/^sivae-respaldo-/, "")}`;
    const ruta = path.join(CARPETA_RESPALDOS_PROYECTO, nombre);
    rutaTemporal = `${ruta}.parcial`;
    try {
      await pipeline(Readable.fromWeb(crearStreamRespaldo(creadoPor) as import("node:stream/web").ReadableStream), fs.createWriteStream(rutaTemporal));
    } catch (error) {
      throw new ErrorFinalizarProyecto(`No se pudo guardar la copia de seguridad, no se borró nada. ${error instanceof Error ? error.message : ""}`.trim());
    }
    const bytes = fs.statSync(rutaTemporal).size;
    if (bytes < 100) throw new ErrorFinalizarProyecto("La copia de seguridad quedó vacía, no se borró nada.");
    fs.renameSync(rutaTemporal, ruta);
    rutaTemporal = null;

    // 2) Dejar el sistema en blanco.
    const borradas = await vaciarTablasExcepto(TABLAS_CONSERVADAS);
    await db.datosEmpresa.updateMany({
      data: { fechaInicioInterventoria: null, fechaFinInterventoria: null, fechaInicioPae: null, fechaFinPae: null },
    });
    vaciarCarpeta(CARPETA_UPLOADS, UPLOADS_CONSERVADOS);
    vaciarCarpeta(CARPETA_GENERADOS);

    return {
      respaldo: { nombre, bytes, fecha: new Date() },
      filasBorradas: Object.values(borradas).reduce((suma, n) => suma + n, 0),
    };
  } finally {
    if (rutaTemporal) fs.rmSync(rutaTemporal, { force: true });
    enCurso = false;
  }
}
