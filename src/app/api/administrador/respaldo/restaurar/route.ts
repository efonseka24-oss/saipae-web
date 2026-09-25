// Restaura una copia de seguridad: el navegador envía el ZIP tal cual como
// cuerpo de la petición (sin formulario) para no cargarlo entero en memoria;
// se guarda en un archivo temporal y desde ahí se descomprime.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { NextRequest, NextResponse } from "next/server";
import { sesionAdministrador } from "@/lib/sesionAdministrador";
import { ErrorRespaldo, restaurarRespaldo } from "@/lib/respaldo";
import { origenDeSolicitud, registrarAuditoria } from "@/lib/auditoria";
import { formatearFechaColombia } from "@/lib/consultaAuditoria";

// Evita dos restauraciones a la vez sobre la misma base.
let restaurando = false;

export async function POST(request: NextRequest) {
  const sesion = await sesionAdministrador();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  if (request.headers.get("x-confirmacion") !== "RESTAURAR") {
    return NextResponse.json({ error: "Falta la confirmación." }, { status: 400 });
  }
  if (!request.body) return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  if (restaurando) return NextResponse.json({ error: "Ya hay una restauración en curso." }, { status: 409 });

  restaurando = true;
  const archivo = path.join(os.tmpdir(), `saipae-restaurar-${Date.now()}.zip`);
  const auditar = (exito: boolean, descripcion: string, estado: number) =>
    registrarAuditoria({
      tipo: "RESPALDO",
      accion: "Restauró copia de seguridad",
      descripcion,
      modulo: "Administrador",
      usuarioId: sesion.id,
      usuario: sesion.usuario,
      nombre: sesion.nombre,
      metodo: "POST",
      ruta: request.nextUrl.pathname,
      estado,
      exito,
      ...origenDeSolicitud(request),
    });

  try {
    await pipeline(Readable.fromWeb(request.body as import("node:stream/web").ReadableStream), fs.createWriteStream(archivo));
    const resultado = await restaurarRespaldo(archivo);
    await auditar(
      true,
      `Restauró la copia del ${formatearFechaColombia(new Date(resultado.creadoEn))}: ${resultado.filas} registros en ${resultado.tablas} tablas y ${resultado.archivos} archivos`,
      200
    );
    return NextResponse.json(resultado);
  } catch (error) {
    const mensaje = error instanceof ErrorRespaldo ? error.message : "No se pudo restaurar la copia de seguridad.";
    console.error("Error al restaurar la copia de seguridad:", error);
    await auditar(false, `Falló la restauración: ${error instanceof Error ? error.message : String(error)}`, 400);
    return NextResponse.json({ error: mensaje }, { status: error instanceof ErrorRespaldo ? 400 : 500 });
  } finally {
    restaurando = false;
    fs.rmSync(archivo, { force: true });
  }
}
