import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { esResultadoLaboratorio, esCumplimientoMuestra, NUMERO_DETALLES_MUESTRA } from "@/lib/laboratorios";
import { conAuditoria } from "@/lib/auditoria";

const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB
const TIPOS_ARCHIVO_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png"];
const EXTENSIONES_PERMITIDAS = [".pdf", ".jpg", ".jpeg", ".png"];

const INCLUIR_LABORATORIO = {
  zode: { include: { lote: { include: { departamento: { select: { id: true, nombre: true } } } } } },
  municipio: { select: { id: true, nombre: true } },
  institucion: { select: { id: true, nombre: true, numeroDane: true } },
  sede: { select: { id: true, nombre: true, numeroDane: true } },
  operador: { select: { id: true, nombreRazonSocial: true } },
  esquema: { select: { id: true, nombre: true } },
  detalles: { orderBy: { orden: "asc" } },
} as const;

function archivoEsValido(archivo: File): boolean {
  if (TIPOS_ARCHIVO_PERMITIDOS.includes(archivo.type)) return true;
  const extension = path.extname(archivo.name).toLowerCase();
  return EXTENSIONES_PERMITIDAS.includes(extension);
}

function rutaPublica(url: string): string {
  return path.join(process.cwd(), "public", url.replace(/^\//, ""));
}

type FilaDetalleBruta = { producto?: unknown; examen?: unknown; cumplimiento?: unknown };
type DetalleValidado = { orden: number; producto: string | null; examen: string | null; cumplimiento: string | null };

function textoOpcional(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

// Hasta 10 líneas de producto/examen/cumplimiento; ninguna es obligatoria, así
// que las filas completamente vacías simplemente no se guardan.
function parsearDetalles(bruto: FormDataEntryValue | null): { error: string } | { detalles: DetalleValidado[] } {
  if (typeof bruto !== "string" || !bruto) return { detalles: [] };

  let lista: unknown;
  try {
    lista = JSON.parse(bruto);
  } catch {
    return { error: "El detalle de la muestra no tiene un formato válido." };
  }
  if (!Array.isArray(lista) || lista.length > NUMERO_DETALLES_MUESTRA) {
    return { error: "El detalle de la muestra no tiene un formato válido." };
  }

  const detalles: DetalleValidado[] = [];
  for (let indice = 0; indice < lista.length; indice++) {
    const fila = lista[indice] as FilaDetalleBruta | null;
    if (!fila || typeof fila !== "object") continue;

    const producto = textoOpcional(fila.producto);
    const examen = textoOpcional(fila.examen);
    const cumplimiento = textoOpcional(fila.cumplimiento);
    if (!producto && !examen && !cumplimiento) continue;

    if (cumplimiento && !esCumplimientoMuestra(cumplimiento)) {
      return { error: `El cumplimiento de la línea ${indice + 1} no es válido.` };
    }

    detalles.push({ orden: indice + 1, producto: producto || null, examen: examen || null, cumplimiento: cumplimiento || null });
  }

  return { detalles };
}

async function validarDatosFormulario(formData: FormData) {
  const zodeId = formData.get("zodeId");
  const municipioId = formData.get("municipioId");
  const institucionId = formData.get("institucionId");
  const sedeId = formData.get("sedeId");
  const operadorIdBruto = formData.get("operadorId");
  const esquemaId = formData.get("esquemaId");
  const fechaTomaMuestra = formData.get("fechaTomaMuestra");
  const nombreLaboratorio = formData.get("nombreLaboratorio");
  const resultado = formData.get("resultado");
  const fechaResultado = formData.get("fechaResultado");
  const observaciones = formData.get("observaciones");

  if (typeof zodeId !== "string" || !zodeId) return { error: "Selecciona el zode." };
  if (typeof municipioId !== "string" || !municipioId) return { error: "Selecciona el municipio." };
  if (typeof institucionId !== "string" || !institucionId) return { error: "Selecciona la institución." };
  if (typeof sedeId !== "string" || !sedeId) return { error: "Selecciona la sede." };
  if (typeof esquemaId !== "string" || !esquemaId) return { error: "Selecciona el tipo de visita." };
  if (typeof fechaTomaMuestra !== "string" || !fechaTomaMuestra) {
    return { error: "La fecha de toma de muestra es obligatoria." };
  }
  if (typeof nombreLaboratorio !== "string" || !nombreLaboratorio.trim()) {
    return { error: "El nombre del laboratorio es obligatorio." };
  }
  if (typeof resultado !== "string" || !esResultadoLaboratorio(resultado)) {
    return { error: "El resultado debe ser favorable o desfavorable." };
  }
  if (typeof fechaResultado !== "string" || !fechaResultado) {
    return { error: "La fecha del resultado es obligatoria." };
  }

  const municipio = await db.municipio.findUnique({ where: { id: municipioId } });
  if (!municipio || municipio.zodeId !== zodeId) return { error: "El municipio no pertenece al zode seleccionado." };

  const institucion = await db.institucion.findUnique({ where: { id: institucionId } });
  if (!institucion || institucion.municipioId !== municipioId) {
    return { error: "La institución no pertenece al municipio seleccionado." };
  }

  const sede = await db.sede.findUnique({ where: { id: sedeId } });
  if (!sede || sede.institucionId !== institucionId) return { error: "La sede no pertenece a la institución seleccionada." };

  let operadorId: string | null = null;
  if (typeof operadorIdBruto === "string" && operadorIdBruto) {
    const operador = await db.operador.findUnique({ where: { id: operadorIdBruto } });
    if (!operador || operador.zodeId !== zodeId) return { error: "El operador no pertenece al zode seleccionado." };
    operadorId = operadorIdBruto;
  } else {
    const operadoresDelZode = await db.operador.findMany({ where: { zodeId } });
    if (operadoresDelZode.length === 1) operadorId = operadoresDelZode[0].id;
  }

  return {
    datos: {
      zodeId,
      municipioId,
      institucionId,
      sedeId,
      operadorId,
      esquemaId,
      fechaTomaMuestra: new Date(fechaTomaMuestra),
      nombreLaboratorio: nombreLaboratorio.trim(),
      resultado,
      fechaResultado: new Date(fechaResultado),
      observaciones: typeof observaciones === "string" && observaciones.trim() ? observaciones.trim() : null,
    },
  };
}

async function manejarPATCH(request: NextRequest, ctx: RouteContext<"/api/laboratorios/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const actual = await db.laboratorio.findUnique({ where: { id } });
  if (!actual) return NextResponse.json({ error: "El registro no existe." }, { status: 404 });

  const formData = await request.formData();
  const resultadoValidacion = await validarDatosFormulario(formData);
  if ("error" in resultadoValidacion) {
    return NextResponse.json({ error: resultadoValidacion.error }, { status: 400 });
  }

  const resultadoDetalles = parsearDetalles(formData.get("detalles"));
  if ("error" in resultadoDetalles) {
    return NextResponse.json({ error: resultadoDetalles.error }, { status: 400 });
  }

  let archivoUrl = actual.archivoUrl;
  let archivoNombre = actual.archivoNombre;

  const archivo = formData.get("archivo");
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > TAMANO_MAXIMO_BYTES) {
      return NextResponse.json({ error: "El archivo no puede pesar más de 20 MB." }, { status: 400 });
    }
    if (!archivoEsValido(archivo)) {
      return NextResponse.json({ error: "El archivo debe ser PDF, JPG o PNG." }, { status: 400 });
    }

    const carpeta = path.join(process.cwd(), "public", "uploads", "laboratorios");
    fs.mkdirSync(carpeta, { recursive: true });

    const extension = path.extname(archivo.name) || ".pdf";
    const nombreArchivo = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const bytes = Buffer.from(await archivo.arrayBuffer());
    fs.writeFileSync(path.join(carpeta, nombreArchivo), bytes);

    fs.rm(rutaPublica(actual.archivoUrl), { force: true }, () => {});
    archivoUrl = `/uploads/laboratorios/${nombreArchivo}`;
    archivoNombre = archivo.name;
  }

  const laboratorio = await db.laboratorio.update({
    where: { id },
    data: {
      ...resultadoValidacion.datos,
      archivoUrl,
      archivoNombre,
      detalles: { deleteMany: {}, create: resultadoDetalles.detalles },
    },
    include: INCLUIR_LABORATORIO,
  });

  return NextResponse.json(laboratorio);
}

async function manejarDELETE(_request: NextRequest, ctx: RouteContext<"/api/laboratorios/[id]">) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;
  const laboratorio = await db.laboratorio.findUnique({ where: { id } });
  if (!laboratorio) return NextResponse.json({ error: "El registro no existe." }, { status: 404 });

  await db.laboratorio.delete({ where: { id } });
  fs.rm(rutaPublica(laboratorio.archivoUrl), { force: true }, () => {});

  return NextResponse.json({ ok: true });
}

export const PATCH = conAuditoria(manejarPATCH);
export const DELETE = conAuditoria(manejarDELETE);
