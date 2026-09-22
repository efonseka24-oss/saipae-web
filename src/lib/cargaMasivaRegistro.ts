// Carga masiva de Municipio→Institución→Sede desde un CSV, para el módulo
// de Registro. El Zode debe existir de antemano (se crea a mano con su Lote/
// Departamento); el Municipio se crea automáticamente si no existe todavía
// bajo ese zode. Institución y Sede se identifican por su número DANE (si ya
// existen se actualizan, si no se crean) — el archivo es la fuente de verdad.
//
// Se eligió CSV en vez de Excel (.xlsx) porque el único paquete de npm para
// leer .xlsx (SheetJS "xlsx") tiene vulnerabilidades altas sin parche
// disponible (prototype pollution y ReDoS); csv-parse no tiene ese problema.
import { parse } from "csv-parse/sync";
import { db } from "@/lib/db";

const COLUMNAS = ["ZODES", "MUNICIPIO", "INSTITUCION", "DANEIE", "SEDE", "DANESEDE"] as const;
type Columna = (typeof COLUMNAS)[number];

type FilaCarga = Record<Columna, string>;

export type ResultadoCargaMasiva = {
  totalFilas: number;
  municipiosCreados: number;
  institucionesCreadas: number;
  institucionesActualizadas: number;
  sedesCreadas: number;
  sedesActualizadas: number;
  errores: { fila: number; mensaje: string }[];
};

function normalizarEncabezado(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

// Excel en español (Colombia) usa la coma como separador decimal, así que al
// exportar "CSV" en realidad separa las columnas con ";" en vez de ",". Se
// detecta cuál usa el archivo mirando su primera línea, para aceptar ambos.
function detectarDelimitador(contenido: string): "," | ";" {
  const primeraLinea = contenido.split(/\r?\n/, 1)[0] ?? "";
  const comas = (primeraLinea.match(/,/g) ?? []).length;
  const puntoYComas = (primeraLinea.match(/;/g) ?? []).length;
  return puntoYComas > comas ? ";" : ",";
}

function interpretarArchivo(contenido: string): { error: string } | { filas: FilaCarga[] } {
  let registros: Record<string, string>[];
  try {
    registros = parse(contenido, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
      delimiter: detectarDelimitador(contenido),
    });
  } catch {
    return { error: "No se pudo leer el archivo. Debe ser un CSV válido." };
  }
  if (registros.length === 0) return { error: "El archivo no tiene filas de datos." };

  const encabezadosBrutos = Object.keys(registros[0]);
  const mapaColumnas = new Map<Columna, string>();
  for (const bruto of encabezadosBrutos) {
    const normalizado = normalizarEncabezado(bruto);
    const columna = COLUMNAS.find((c) => c === normalizado);
    if (columna) mapaColumnas.set(columna, bruto);
  }

  const faltantes = COLUMNAS.filter((c) => !mapaColumnas.has(c));
  if (faltantes.length > 0) {
    return { error: `Faltan columnas en el archivo: ${faltantes.join(", ")}.` };
  }

  const filas: FilaCarga[] = registros.map((registro) => {
    const fila = {} as FilaCarga;
    for (const columna of COLUMNAS) {
      fila[columna] = (registro[mapaColumnas.get(columna)!] ?? "").trim();
    }
    return fila;
  });

  return { filas };
}

export async function procesarCargaMasivaRegistro(contenido: string): Promise<{ error: string } | ResultadoCargaMasiva> {
  const resultado = interpretarArchivo(contenido);
  if ("error" in resultado) return resultado;
  const { filas } = resultado;

  const zodes = await db.zode.findMany({ select: { id: true, nombre: true } });
  const zodesPorNombre = new Map(zodes.map((z) => [z.nombre.trim().toUpperCase(), z.id]));

  const municipiosCache = new Map<string, string>(); // `${zodeId}::${nombre}` -> id
  const institucionesCache = new Map<string, string>(); // numeroDane -> id

  const resumen: ResultadoCargaMasiva = {
    totalFilas: filas.length,
    municipiosCreados: 0,
    institucionesCreadas: 0,
    institucionesActualizadas: 0,
    sedesCreadas: 0,
    sedesActualizadas: 0,
    errores: [],
  };

  for (let indice = 0; indice < filas.length; indice++) {
    const numeroFila = indice + 2; // +1 por índice base 0, +1 por la fila de encabezado
    const fila = filas[indice];

    if (!fila.ZODES || !fila.MUNICIPIO || !fila.INSTITUCION || !fila.DANEIE || !fila.SEDE || !fila.DANESEDE) {
      resumen.errores.push({ fila: numeroFila, mensaje: "Faltan datos en una o más columnas." });
      continue;
    }

    const zodeId = zodesPorNombre.get(fila.ZODES.trim().toUpperCase());
    if (!zodeId) {
      resumen.errores.push({ fila: numeroFila, mensaje: `El zode "${fila.ZODES}" no existe en Registro. Créalo primero (con su lote).` });
      continue;
    }

    try {
      const claveMunicipio = `${zodeId}::${fila.MUNICIPIO.trim().toUpperCase()}`;
      let municipioId = municipiosCache.get(claveMunicipio);
      if (!municipioId) {
        const municipioExistente = await db.municipio.findUnique({ where: { zodeId_nombre: { zodeId, nombre: fila.MUNICIPIO } } });
        if (municipioExistente) {
          municipioId = municipioExistente.id;
        } else {
          const municipio = await db.municipio.create({ data: { zodeId, nombre: fila.MUNICIPIO } });
          municipioId = municipio.id;
          resumen.municipiosCreados += 1;
        }
        municipiosCache.set(claveMunicipio, municipioId);
      }

      let institucionId = institucionesCache.get(fila.DANEIE);
      if (!institucionId) {
        const existente = await db.institucion.findUnique({ where: { numeroDane: fila.DANEIE } });
        const institucion = await db.institucion.upsert({
          where: { numeroDane: fila.DANEIE },
          update: { nombre: fila.INSTITUCION, municipioId },
          create: { numeroDane: fila.DANEIE, nombre: fila.INSTITUCION, municipioId },
        });
        institucionId = institucion.id;
        institucionesCache.set(fila.DANEIE, institucionId);
        if (existente) resumen.institucionesActualizadas += 1;
        else resumen.institucionesCreadas += 1;
      }

      const sedeExistente = await db.sede.findUnique({ where: { numeroDane: fila.DANESEDE } });
      await db.sede.upsert({
        where: { numeroDane: fila.DANESEDE },
        update: { nombre: fila.SEDE, institucionId },
        create: { numeroDane: fila.DANESEDE, nombre: fila.SEDE, institucionId },
      });
      if (sedeExistente) resumen.sedesActualizadas += 1;
      else resumen.sedesCreadas += 1;
    } catch {
      resumen.errores.push({ fila: numeroFila, mensaje: "No se pudo guardar esta fila (dato inválido o duplicado)." });
    }
  }

  return resumen;
}
