// Módulo SIMAT: relación de estudiantes con derecho a la alimentación escolar.
// Cada estudiante se ubica en una sede; la institución y el municipio se
// toman de la sede (y el zode y el lote, del municipio), así que basta con
// validar que la cadena Municipio → Institución → Sede sea coherente.
import type { Prisma } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { db } from "@/lib/db";
import { detectarDelimitador } from "@/lib/cargaMasivaRegistro";
import { leerFilasXlsx } from "@/lib/leerXlsx";

export const INCLUIR_ESTUDIANTE_SIMAT = {
  municipio: {
    select: { id: true, nombre: true, zode: { select: { id: true, nombre: true, lote: { select: { id: true, nombre: true } } } } },
  },
  institucion: { select: { id: true, nombre: true, numeroDane: true } },
  sede: { select: { id: true, nombre: true, numeroDane: true } },
} as const;

export type DatosEstudianteSimat = {
  idSimat: string;
  numeroDocumento: string;
  nombre: string;
  municipioId: string;
  institucionId: string;
  sedeId: string;
};

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

export async function validarEstudianteSimat(cuerpo: Record<string, unknown>): Promise<{ error: string } | { datos: DatosEstudianteSimat }> {
  const idSimat = texto(cuerpo.idSimat);
  const numeroDocumento = texto(cuerpo.numeroDocumento);
  const nombre = texto(cuerpo.nombre);
  const municipioId = texto(cuerpo.municipioId);
  const institucionId = texto(cuerpo.institucionId);
  const sedeId = texto(cuerpo.sedeId);

  if (!idSimat) return { error: "El ID SIMAT es obligatorio." };
  if (!numeroDocumento) return { error: "El número de documento es obligatorio." };
  if (!nombre) return { error: "El nombre es obligatorio." };
  if (!municipioId) return { error: "Selecciona el municipio." };
  if (!institucionId) return { error: "Selecciona la institución." };
  if (!sedeId) return { error: "Selecciona la sede." };

  const sede = await db.sede.findUnique({ where: { id: sedeId }, include: { institucion: { select: { municipioId: true } } } });
  if (!sede || sede.institucionId !== institucionId) return { error: "La sede no pertenece a la institución seleccionada." };
  if (sede.institucion.municipioId !== municipioId) return { error: "La institución no pertenece al municipio seleccionado." };

  return { datos: { idSimat, numeroDocumento, nombre, municipioId, institucionId, sedeId } };
}

// --- Filtros (los mismos para la pantalla y para exportar) ---------------

export type FiltrosSimat = {
  q?: string;
  loteId?: string;
  zodeId?: string;
  municipioId?: string;
  institucionId?: string;
};

type Parametros = Record<string, string | string[] | undefined>;

export function leerFiltrosSimat(parametros: Parametros | URLSearchParams): FiltrosSimat {
  const leer = (clave: string) => {
    const valor = parametros instanceof URLSearchParams ? parametros.get(clave) : parametros[clave];
    const t = Array.isArray(valor) ? valor[0] : valor;
    return t?.trim() || undefined;
  };
  return {
    q: leer("q"),
    loteId: leer("loteId"),
    zodeId: leer("zodeId"),
    municipioId: leer("municipioId"),
    institucionId: leer("institucionId"),
  };
}

export function whereSimat(filtros: FiltrosSimat): Prisma.EstudianteSimatWhereInput {
  return {
    ...(filtros.institucionId ? { institucionId: filtros.institucionId } : {}),
    ...(filtros.municipioId ? { municipioId: filtros.municipioId } : {}),
    ...(filtros.zodeId ? { municipio: { zodeId: filtros.zodeId } } : {}),
    ...(filtros.loteId && !filtros.zodeId ? { municipio: { zode: { loteId: filtros.loteId } } } : {}),
    ...(filtros.q
      ? { OR: [{ idSimat: { contains: filtros.q } }, { numeroDocumento: { contains: filtros.q } }, { nombre: { contains: filtros.q } }] }
      : {}),
  };
}

// --- Carga masiva desde CSV o Excel ----------------------------------------------

// Nombres de columna aceptados (ya normalizados: sin tildes, mayúsculas y sin
// espacios ni signos). Los archivos del SIMAT traen el nombre partido en
// NOMBRE1/NOMBRE2/APELLIDO1/APELLIDO2; si no hay columna NOMBRE se arma con esas.
const ALIAS = {
  ID: ["ID", "IDSIMAT", "PERID", "IDESTUDIANTE"],
  DOCUMENTO: ["DOCUMENTO", "NUMERODOCUMENTO", "NRODOCUMENTO", "DOC"],
  NOMBRE: ["NOMBRE", "NOMBRES", "NOMBRECOMPLETO", "NOMBREESTUDIANTE"],
  DANESEDE: ["DANESEDE", "CODIGODANESEDE", "CODDANESEDE"],
} as const;
const PARTES_NOMBRE = ["NOMBRE1", "NOMBRE2", "APELLIDO1", "APELLIDO2"] as const;

// Como el de Registro, pero conserva los dígitos (NOMBRE1 no es lo mismo que NOMBRE).
function normalizarEncabezado(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export type ResultadoCargaSimat = {
  totalFilas: number;
  creados: number;
  actualizados: number;
  sinCambios: number;
  errores: { fila: number; mensaje: string }[];
};

// Lee el archivo (CSV o Excel .xlsx) y devuelve sus filas como { encabezado: valor }.
export function leerArchivoSimat(nombre: string, bytes: Uint8Array): { error: string } | { registros: Record<string, string>[] } {
  if (nombre.toLowerCase().endsWith(".xlsx")) {
    const resultado = leerFilasXlsx(bytes);
    return "error" in resultado ? resultado : { registros: resultado.filas };
  }
  const contenido = new TextDecoder("utf-8").decode(bytes);
  try {
    const registros: Record<string, string>[] = parse(contenido, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      delimiter: detectarDelimitador(contenido),
    });
    return { registros };
  } catch {
    return { error: "No se pudo leer el archivo. Debe ser un CSV válido." };
  }
}

export async function procesarCargaMasivaSimat(registros: Record<string, string>[]): Promise<{ error: string } | ResultadoCargaSimat> {
  if (registros.length === 0) return { error: "El archivo no tiene filas de datos." };

  const encabezados = new Map(Object.keys(registros[0]).map((bruto) => [normalizarEncabezado(bruto), bruto]));
  const columna = (alias: readonly string[]) => alias.map((a) => encabezados.get(a)).find(Boolean);
  const colId = columna(ALIAS.ID);
  const colDocumento = columna(ALIAS.DOCUMENTO);
  const colNombre = columna(ALIAS.NOMBRE);
  const colDaneSede = columna(ALIAS.DANESEDE);
  const colPartes = PARTES_NOMBRE.map((p) => encabezados.get(p)).filter((c): c is string => Boolean(c));

  const faltantes = [
    !colId && "ID",
    !colDocumento && "DOCUMENTO",
    !colNombre && colPartes.length === 0 && "NOMBRE",
    !colDaneSede && "DANE SEDE",
  ].filter(Boolean);
  if (faltantes.length > 0) return { error: `Faltan columnas en el archivo: ${faltantes.join(", ")}.` };

  const sedes = await db.sede.findMany({ select: { id: true, numeroDane: true, institucionId: true, institucion: { select: { municipioId: true } } } });
  const sedesPorDane = new Map(sedes.map((s) => [s.numeroDane.trim(), s]));
  const existentes = await db.estudianteSimat.findMany({ select: { idSimat: true, numeroDocumento: true, nombre: true, sedeId: true } });
  const existentesPorId = new Map(existentes.map((e) => [e.idSimat, e]));

  const resumen: ResultadoCargaSimat = { totalFilas: registros.length, creados: 0, actualizados: 0, sinCambios: 0, errores: [] };
  const nuevos: DatosEstudianteSimat[] = [];
  const cambios: DatosEstudianteSimat[] = [];
  const vistos = new Set<string>();

  registros.forEach((registro, indice) => {
    const numeroFila = indice + 2; // +1 por índice base 0, +1 por la fila de encabezado
    const idSimat = (registro[colId!] ?? "").trim();
    const numeroDocumento = (registro[colDocumento!] ?? "").trim();
    const nombre = (colNombre ? registro[colNombre] ?? "" : colPartes.map((c) => (registro[c] ?? "").trim()).filter(Boolean).join(" "))
      .replace(/\s+/g, " ")
      .trim();
    const daneSede = (registro[colDaneSede!] ?? "").trim();

    if (!idSimat || !numeroDocumento || !nombre || !daneSede) {
      resumen.errores.push({ fila: numeroFila, mensaje: "Faltan datos en una o más columnas." });
      return;
    }
    if (vistos.has(idSimat)) {
      resumen.errores.push({ fila: numeroFila, mensaje: `El ID ${idSimat} está repetido en el archivo.` });
      return;
    }
    vistos.add(idSimat);

    const sede = sedesPorDane.get(daneSede);
    if (!sede) {
      resumen.errores.push({ fila: numeroFila, mensaje: `La sede con DANE ${daneSede} no existe en Registro.` });
      return;
    }

    const datos: DatosEstudianteSimat = {
      idSimat,
      numeroDocumento,
      nombre,
      municipioId: sede.institucion.municipioId,
      institucionId: sede.institucionId,
      sedeId: sede.id,
    };
    const actual = existentesPorId.get(idSimat);
    if (!actual) nuevos.push(datos);
    else if (actual.numeroDocumento !== numeroDocumento || actual.nombre !== nombre || actual.sedeId !== sede.id) cambios.push(datos);
    else resumen.sinCambios += 1;
  });

  for (let i = 0; i < nuevos.length; i += 1000) {
    const { count } = await db.estudianteSimat.createMany({ data: nuevos.slice(i, i + 1000), skipDuplicates: true });
    resumen.creados += count;
  }
  for (let i = 0; i < cambios.length; i += 200) {
    const grupo = cambios.slice(i, i + 200);
    await db.$transaction(grupo.map(({ idSimat, ...resto }) => db.estudianteSimat.update({ where: { idSimat }, data: resto })));
    resumen.actualizados += grupo.length;
  }

  return resumen;
}
