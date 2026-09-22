// Importa las preguntas reales exportadas del código Kotlin (ver
// prisma/seed-data/*.json, generado desde Preguntas.kt) hacia el módulo
// "Esquemas y Preguntas" del panel web, para que el usuario las revise.
//
// Crea, por cada esquema, un único módulo de staging ("Preguntas de la app
// (por revisar)") con todas las preguntas principales en el mismo orden que
// tienen en la app, expandiendo automáticamente los grupos de subpreguntas
// (Evidencias/Materia Prima/Organoléptico) igual que hace la app móvil, y
// reconstruyendo los saltos condicionales (saltarSi) entre preguntas.
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const db = new PrismaClient({ adapter });

type TipoPregunta = "TEXTO_LIBRE" | "NUMERO" | "SELECCION_MULTIPLE" | "FOTO" | "ARCHIVO" | "FIRMA";
type TipoValidacion = "NINGUNA" | "EMAIL" | "NUMERO" | "TELEFONO" | "FECHA" | "HORA";
type GenerarAuto = "NINGUNA" | "EVIDENCIAS" | "MATERIA_PRIMA" | "ORGANOLEPTICO";

type PreguntaExportada = {
  id: number;
  texto: string;
  tipo: TipoPregunta;
  opciones: string[];
  validacion: TipoValidacion;
  obligatoria: boolean;
  generarSubPreguntasAuto: GenerarAuto;
  saltarSi: { respuesta: string; saltarHastaId: number; rellenarCon: string } | null;
};

type PlantillaSub = {
  texto: string;
  tipo: TipoPregunta;
  validacion?: TipoValidacion;
  obligatoria: boolean;
  opciones?: string[];
};

// Mismas plantillas fijas que src/lib/subpreguntasAuto.ts (duplicadas aquí
// para no depender de la resolución de alias "@/" al correr este script
// suelto con tsx).
function grupoEvidencias(): PlantillaSub[] {
  return [
    {
      texto:
        "Observaciones sobre la pregunta, recuerde que en caso que la respuesta sea diferente a 1 o a cumple, el deber ser es dejar observación",
      tipo: "TEXTO_LIBRE",
      obligatoria: false,
    },
    {
      texto:
        "Evidencia Fotográfica (Opcional), recuerde que en caso que la respuesta sea diferente a 1 o a cumple, el deber ser es tomar evidencia",
      tipo: "FOTO",
      obligatoria: false,
    },
    {
      texto:
        "Evidencia en Archivo (Opcional), recuerde que en caso que la respuesta sea diferente a 1 o a cumple, el deber ser es tomar evidencia",
      tipo: "ARCHIVO",
      obligatoria: false,
    },
  ];
}

function grupoMateriaPrima(): PlantillaSub[] {
  return [
    { texto: "Proveedor:", tipo: "TEXTO_LIBRE", obligatoria: true },
    { texto: "Lote:", tipo: "TEXTO_LIBRE", obligatoria: true },
    { texto: "Fecha de Vencimiento:", tipo: "TEXTO_LIBRE", validacion: "FECHA", obligatoria: true },
    {
      texto: "Temperatura en °C (Aplica para productos de alto riesgo):",
      tipo: "TEXTO_LIBRE",
      validacion: "NUMERO",
      obligatoria: false,
    },
    { texto: "Unidad de Medida:", tipo: "TEXTO_LIBRE", obligatoria: true },
    { texto: "Cantidad:", tipo: "TEXTO_LIBRE", validacion: "NUMERO", obligatoria: true },
    { texto: "CUMPLIMIENTO:", tipo: "SELECCION_MULTIPLE", obligatoria: true, opciones: ["CUMPLE", "NO CUMPLE"] },
  ];
}

function grupoOrganoleptico(): PlantillaSub[] {
  const cumplimiento = (texto: string): PlantillaSub => ({
    texto,
    tipo: "SELECCION_MULTIPLE",
    obligatoria: true,
    opciones: ["CUMPLE", "NO CUMPLE"],
  });
  const numero = (texto: string): PlantillaSub => ({ texto, tipo: "TEXTO_LIBRE", validacion: "NUMERO", obligatoria: true });

  return [
    { texto: "Verificacion de peso y Volumen - Nivel / Grado:", tipo: "TEXTO_LIBRE", obligatoria: true },
    numero("Verificacion de peso y Volumen - Peso Declarado"),
    numero("Verificacion de peso y Volumen - Peso Verificado:"),
    cumplimiento("Verificacion de peso y Volumen - Cumplimiento"),
    numero("Verificacion de Temperatura Para alimentos de alto riesgo - Temperatura Final de Cocción:"),
    cumplimiento("Temperatura Final de Cocción - Cumplimieto:"),
    numero("Verificacion de Temperatura Para alimentos de alto riesgo - Temperatura de distribucion inicial:"),
    cumplimiento("Temperatura de distribucion inicial - Cumplimiento:"),
    numero("Verificacion de Temperatura Para alimentos de alto riesgo - Temperatura de distribucion final:"),
    cumplimiento("Temperatura de distribucion final - Cumplimiento:"),
    cumplimiento("Verificacion de Temperatura Para alimentos de alto riesgo - CUMPLIMIENTO GENERAL:"),
  ];
}

function plantillaPara(tipo: GenerarAuto): PlantillaSub[] {
  if (tipo === "EVIDENCIAS") return grupoEvidencias();
  if (tipo === "MATERIA_PRIMA") return grupoMateriaPrima();
  if (tipo === "ORGANOLEPTICO") return grupoOrganoleptico();
  return [];
}

const ARCHIVO_POR_ESQUEMA: Record<string, string> = {
  RPS: "RPS.json",
  RI: "RI.json",
  CCT: "CCT.json",
  Bodega: "BODEGA.json",
  "Bodega Administrativa": "BODEGA_ADMINISTRATIVA.json",
};

const ESPACIADO_ORDEN = 20; // hueco entre principales para que quepan sus subpreguntas (máx. 11 en Organoléptico)

async function importarEsquema(nombreEsquema: string, archivo: string) {
  const esquema = await db.esquema.findUnique({ where: { nombre: nombreEsquema } });
  if (!esquema) {
    console.log(`  (!) No existe el esquema "${nombreEsquema}", se omite.`);
    return;
  }

  const ruta = path.join(process.cwd(), "prisma", "seed-data", archivo);
  const preguntas: PreguntaExportada[] = JSON.parse(fs.readFileSync(ruta, "utf-8"));

  const nombreModulo = "Preguntas de la app (por revisar)";
  const modulo = await db.moduloEsquema.upsert({
    where: { esquemaId_nombre: { esquemaId: esquema.id, nombre: nombreModulo } },
    update: {},
    create: {
      esquemaId: esquema.id,
      nombre: nombreModulo,
      descripcion: "Importado automáticamente desde el código de la app móvil (Preguntas.kt). Reorganiza en módulos temáticos cuando quieras.",
      orden: 0,
    },
  });

  // Si ya se había importado antes, no duplicar: se borra y se vuelve a crear limpio.
  await db.pregunta.deleteMany({ where: { moduloId: modulo.id } });

  const idViejoANuevo = new Map<number, string>();
  const saltosPendientes: { nuevoId: string; respuesta: string; idViejoDestino: number; rellenarCon: string }[] = [];

  for (let indice = 0; indice < preguntas.length; indice++) {
    const p = preguntas[indice];
    const ordenBase = indice * ESPACIADO_ORDEN;

    const creada = await db.pregunta.create({
      data: {
        moduloId: modulo.id,
        texto: p.texto,
        clase: "PRINCIPAL",
        tipo: p.tipo,
        opciones: JSON.stringify(p.opciones),
        naturalezaOpciones: p.opciones.some((o) => /^-?\d+(\.\d+)?$/.test(o)) ? "CUANTITATIVA" : "CUALITATIVA",
        validacion: p.validacion,
        obligatoria: p.obligatoria,
        orden: ordenBase,
        generarSubPreguntasAuto: p.generarSubPreguntasAuto,
      },
    });

    idViejoANuevo.set(p.id, creada.id);

    const plantilla = plantillaPara(p.generarSubPreguntasAuto);
    if (plantilla.length > 0) {
      await db.pregunta.createMany({
        data: plantilla.map((sub, subIndice) => ({
          moduloId: modulo.id,
          texto: sub.texto,
          clase: "SECUNDARIA",
          padreId: creada.id,
          tipo: sub.tipo,
          opciones: JSON.stringify(sub.opciones ?? []),
          naturalezaOpciones: "CUALITATIVA",
          validacion: sub.validacion ?? "NINGUNA",
          obligatoria: sub.obligatoria,
          orden: ordenBase + subIndice + 1,
        })),
      });
    }

    if (p.saltarSi) {
      saltosPendientes.push({
        nuevoId: creada.id,
        respuesta: p.saltarSi.respuesta,
        idViejoDestino: p.saltarSi.saltarHastaId,
        rellenarCon: p.saltarSi.rellenarCon,
      });
    }
  }

  let saltosAplicados = 0;
  for (const salto of saltosPendientes) {
    const destinoId = idViejoANuevo.get(salto.idViejoDestino);
    if (!destinoId) {
      console.log(`  (!) Salto sin destino válido (id original ${salto.idViejoDestino}) en "${nombreEsquema}", se omite.`);
      continue;
    }
    await db.pregunta.update({
      where: { id: salto.nuevoId },
      data: {
        saltarSiRespuesta: salto.respuesta,
        saltarHastaPreguntaId: destinoId,
        saltarRellenarCon: salto.rellenarCon,
      },
    });
    saltosAplicados++;
  }

  const totalPreguntas = await db.pregunta.count({ where: { moduloId: modulo.id } });
  console.log(
    `  ${nombreEsquema}: ${preguntas.length} principales -> ${totalPreguntas} preguntas totales (con subpreguntas), ${saltosAplicados} saltos condicionales.`
  );
}

async function main() {
  console.log("Importando preguntas reales de la app a la base de datos web...");
  for (const [nombreEsquema, archivo] of Object.entries(ARCHIVO_POR_ESQUEMA)) {
    await importarEsquema(nombreEsquema, archivo);
  }
  console.log("Listo.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
