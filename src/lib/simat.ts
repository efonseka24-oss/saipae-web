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
  _count: { select: { entregas: true } },
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
  // "1" = solo beneficiarios del PAE.
  pae?: string;
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
    pae: leer("pae") === "1" ? "1" : undefined,
  };
}

export function whereSimat(filtros: FiltrosSimat): Prisma.EstudianteSimatWhereInput {
  return {
    ...(filtros.pae ? { beneficiarioPae: true } : {}),
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

// --- Beneficiarios y entregas del PAE (cargas desde Excel o CSV) -----------------

const ALIAS_ESTUDIANTE = {
  ID: ["ID", "IDSIMAT", "PERID", "IDESTUDIANTE"],
  DOCUMENTO: ["DOCUMENTO", "NUMERODOCUMENTO", "NRODOCUMENTO", "DOC"],
  FECHA: ["FECHA", "FECHAENTREGA", "DIA"],
} as const;

export type ResultadoCargaPae = {
  totalFilas: number;
  procesados: number;
  sinCambios: number;
  errores: { fila: number; mensaje: string }[];
};

// Identifica al estudiante de cada fila por ID SIMAT o, si no hay, por documento.
type EstudiantePae = { id: string; idSimat: string; numeroDocumento: string; beneficiarioPae: boolean };
type BusquedaEstudiantes = {
  buscar: (registro: Record<string, string>) => { error: string } | { estudiante: EstudiantePae };
  colFecha: string | undefined;
};

async function prepararBusquedaEstudiantes(registros: Record<string, string>[], necesitaFecha: boolean): Promise<{ error: string } | BusquedaEstudiantes> {
  const encabezados = new Map(Object.keys(registros[0]).map((bruto) => [normalizarEncabezado(bruto), bruto]));
  const columna = (alias: readonly string[]) => alias.map((a) => encabezados.get(a)).find(Boolean);
  const colId = columna(ALIAS_ESTUDIANTE.ID);
  const colDocumento = columna(ALIAS_ESTUDIANTE.DOCUMENTO);
  const colFecha = columna(ALIAS_ESTUDIANTE.FECHA);

  if (!colId && !colDocumento) return { error: "Faltan columnas en el archivo: ID o DOCUMENTO." };
  if (necesitaFecha && !colFecha) return { error: "Faltan columnas en el archivo: FECHA." };

  const estudiantes = await db.estudianteSimat.findMany({ select: { id: true, idSimat: true, numeroDocumento: true, beneficiarioPae: true } });
  const porId = new Map(estudiantes.map((e) => [e.idSimat, e]));
  const porDocumento = new Map(estudiantes.map((e) => [e.numeroDocumento, e]));
  const buscar = (registro: Record<string, string>): { error: string } | { estudiante: EstudiantePae } => {
    const id = colId ? (registro[colId] ?? "").trim() : "";
    const documento = colDocumento ? (registro[colDocumento] ?? "").trim() : "";
    if (!id && !documento) return { error: "Falta el ID o el documento del estudiante." };
    const estudiante = (id && porId.get(id)) || (documento && porDocumento.get(documento)) || null;
    if (!estudiante) return { error: `El estudiante ${id || documento} no está en el SIMAT.` };
    return { estudiante };
  };
  return { buscar, colFecha };
}

// Marca como beneficiarios del PAE a los estudiantes del archivo. Con
// `reemplazar`, los que no vienen en el archivo quedan sin marcar.
export async function procesarCargaBeneficiarios(
  registros: Record<string, string>[],
  reemplazar: boolean,
): Promise<{ error: string } | ResultadoCargaPae> {
  if (registros.length === 0) return { error: "El archivo no tiene filas de datos." };
  const busqueda = await prepararBusquedaEstudiantes(registros, false);
  if ("error" in busqueda) return busqueda;

  const resumen: ResultadoCargaPae = { totalFilas: registros.length, procesados: 0, sinCambios: 0, errores: [] };
  const ids = new Set<string>();
  const porMarcar: string[] = [];

  registros.forEach((registro, indice) => {
    const resultado = busqueda.buscar(registro);
    if ("error" in resultado) {
      resumen.errores.push({ fila: indice + 2, mensaje: resultado.error });
      return;
    }
    const { estudiante } = resultado;
    if (ids.has(estudiante.id)) return;
    ids.add(estudiante.id);
    if (estudiante.beneficiarioPae) resumen.sinCambios += 1;
    else porMarcar.push(estudiante.id);
  });

  for (let i = 0; i < porMarcar.length; i += 1000) {
    const { count } = await db.estudianteSimat.updateMany({ where: { id: { in: porMarcar.slice(i, i + 1000) } }, data: { beneficiarioPae: true } });
    resumen.procesados += count;
  }

  if (reemplazar && ids.size > 0) {
    const vigentes = [...ids];
    const sobrantes = await db.estudianteSimat.findMany({ where: { beneficiarioPae: true, id: { notIn: vigentes } }, select: { id: true } });
    for (let i = 0; i < sobrantes.length; i += 1000) {
      await db.estudianteSimat.updateMany({ where: { id: { in: sobrantes.slice(i, i + 1000).map((s) => s.id) } }, data: { beneficiarioPae: false } });
    }
  }
  return resumen;
}

// Fecha (solo día) a partir de un texto de Excel/CSV: número de serie de Excel,
// AAAA-MM-DD o DD/MM/AAAA. Devuelve una fecha en UTC a medianoche, o null.
function leerFecha(valor: string): Date | null {
  const t = valor.trim();
  let anio: number, mes: number, dia: number;
  if (/^\d{4,6}(\.\d+)?$/.test(t)) {
    const fecha = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(t)) * 86400000);
    [anio, mes, dia] = [fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, fecha.getUTCDate()];
  } else {
    const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    const latino = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
    if (iso) [anio, mes, dia] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    else if (latino) [dia, mes, anio] = [Number(latino[1]), Number(latino[2]), Number(latino[3])];
    else return null;
  }
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia ? fecha : null;
}

// Registra las entregas del archivo (una fila = un estudiante en un día).
// Solo se aceptan beneficiarios del PAE y días de lunes a viernes.
export async function procesarCargaEntregas(registros: Record<string, string>[]): Promise<{ error: string } | ResultadoCargaPae> {
  if (registros.length === 0) return { error: "El archivo no tiene filas de datos." };
  const busqueda = await prepararBusquedaEstudiantes(registros, true);
  if ("error" in busqueda) return busqueda;

  const resumen: ResultadoCargaPae = { totalFilas: registros.length, procesados: 0, sinCambios: 0, errores: [] };
  const nuevas = new Map<string, { estudianteId: string; fecha: Date }>();

  registros.forEach((registro, indice) => {
    const numeroFila = indice + 2;
    const resultado = busqueda.buscar(registro);
    if ("error" in resultado) {
      resumen.errores.push({ fila: numeroFila, mensaje: resultado.error });
      return;
    }
    const fecha = leerFecha(registro[busqueda.colFecha!] ?? "");
    if (!fecha) {
      resumen.errores.push({ fila: numeroFila, mensaje: "La fecha no es válida (usa AAAA-MM-DD o DD/MM/AAAA)." });
      return;
    }
    const diaSemana = fecha.getUTCDay();
    if (diaSemana === 0 || diaSemana === 6) {
      resumen.errores.push({ fila: numeroFila, mensaje: "Las entregas solo se registran de lunes a viernes." });
      return;
    }
    if (!resultado.estudiante.beneficiarioPae) {
      resumen.errores.push({ fila: numeroFila, mensaje: "El estudiante no está marcado como beneficiario del PAE." });
      return;
    }
    nuevas.set(`${resultado.estudiante.id}|${fecha.getTime()}`, { estudianteId: resultado.estudiante.id, fecha });
  });

  const lista = [...nuevas.values()];
  for (let i = 0; i < lista.length; i += 1000) {
    const { count } = await db.entregaPae.createMany({ data: lista.slice(i, i + 1000), skipDuplicates: true });
    resumen.procesados += count;
  }
  resumen.sinCambios = lista.length - resumen.procesados;
  return resumen;
}
