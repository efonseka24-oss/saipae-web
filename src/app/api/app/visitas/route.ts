// Recibe una visita finalizada desde la app móvil (reemplaza el envío que antes
// iba a Google Sheet). Solo trae las respuestas de texto; los archivos (fotos,
// documentos, firmas) se suben uno por uno a /api/app/visitas/[id]/archivo.
//
// Cuerpo JSON:
//   { idEnvio, categoria, fecha, respuestas: { "<idApp>": "<valor>" } }
// `idEnvio` es el nombre de la carpeta local de la visita en el equipo: si la
// app reenvía la misma visita, se actualiza en vez de crear otra.
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tokenAppValido } from "@/lib/tokenApp";

// Preguntas del encabezado de la visita, reconocidas por el inicio de su texto
// (son las mismas en RPS, RI, CCT, Bodega y Bodega Administrativa).
const ENCABEZADO: { campo: "municipio" | "institucion" | "sede" | "operador"; patron: RegExp }[] = [
  { campo: "municipio", patron: /^MUNICIPIO/i },
  { campo: "institucion", patron: /^NOMBRE DE LA INSTITUCI/i },
  { campo: "sede", patron: /^NOMBRE DE LA SEDE/i },
  { campo: "operador", patron: /^NOMBRE DEL OPERADOR/i },
];

export async function POST(request: NextRequest) {
  if (!tokenAppValido(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { idEnvio, categoria, fecha, respuestas } = await request.json();

  if (typeof idEnvio !== "string" || !idEnvio.trim()) {
    return NextResponse.json({ error: "Falta el identificador de la visita." }, { status: 400 });
  }
  if (typeof categoria !== "string" || !categoria.trim()) {
    return NextResponse.json({ error: "Falta la categoría de la visita." }, { status: 400 });
  }
  if (!respuestas || typeof respuestas !== "object") {
    return NextResponse.json({ error: "Faltan las respuestas." }, { status: 400 });
  }

  const esquema = await db.esquema.findUnique({ where: { nombre: categoria.trim() } });
  if (!esquema) {
    return NextResponse.json({ error: `El esquema "${categoria}" no existe en el panel.` }, { status: 404 });
  }

  const preguntas = await db.pregunta.findMany({
    where: { modulo: { esquemaId: esquema.id }, idApp: { not: null } },
    select: { id: true, idApp: true, texto: true, padreId: true, fuenteOpciones: true },
    orderBy: { orden: "asc" },
  });
  const porIdApp = new Map(preguntas.map((p) => [p.idApp!, p]));

  // Respuestas válidas: solo ids que pertenecen a este esquema.
  const valores: { preguntaId: string; valor: string | null }[] = [];
  const idsDesconocidos: string[] = [];
  for (const [clave, valor] of Object.entries(respuestas as Record<string, unknown>)) {
    const pregunta = porIdApp.get(Number(clave));
    if (!pregunta) {
      idsDesconocidos.push(clave);
      continue;
    }
    const texto = typeof valor === "string" ? valor.trim() : valor == null ? "" : String(valor);
    valores.push({ preguntaId: pregunta.id, valor: texto || null });
  }

  const encabezado: Record<string, string | null> = { municipio: null, institucion: null, sede: null, operador: null };
  for (const { campo, patron } of ENCABEZADO) {
    const pregunta = preguntas.find((p) => !p.padreId && patron.test(p.texto.trim()));
    const valor = pregunta ? valores.find((v) => v.preguntaId === pregunta.id)?.valor : null;
    encabezado[campo] = valor ?? null;
  }

  // NIT, zode y lote salen del operador registrado en Registro, si coincide el nombre.
  let nit: string | null = null;
  let zodes: string | null = null;
  let lote: string | null = null;
  if (encabezado.operador) {
    const operador = await db.operador.findFirst({
      where: { nombreRazonSocial: encabezado.operador },
      include: { zode: { include: { lote: true } } },
    });
    if (operador) {
      nit = operador.nit;
      zodes = operador.zode.nombre;
      lote = operador.zode.lote.nombre;
    }
  }

  // Interventor: el correo elegido en la pregunta de usuarios (o, si el esquema
  // aún no la tiene configurada, la del "correo electrónico del interventor").
  const preguntaCorreo =
    preguntas.find((p) => p.fuenteOpciones === "USUARIO") ??
    preguntas.find((p) => !p.padreId && /CORREO ELECTR[OÓ]NICO DEL INTERVENTOR/i.test(p.texto));
  const correoInterventor = preguntaCorreo
    ? valores.find((v) => v.preguntaId === preguntaCorreo.id)?.valor?.toLowerCase() ?? null
    : null;
  const interventor = correoInterventor
    ? await db.usuario.findUnique({ where: { correo: correoInterventor }, select: { id: true } })
    : null;

  const fechaVisita = typeof fecha === "string" && !Number.isNaN(Date.parse(fecha)) ? new Date(fecha) : new Date();
  const datosVisita = {
    esquemaId: esquema.id,
    fecha: fechaVisita,
    municipio: encabezado.municipio,
    institucion: encabezado.institucion,
    sede: encabezado.sede,
    operador: encabezado.operador,
    nit,
    zodes,
    lote,
    estado: "FINALIZADA",
    usuarioId: interventor?.id ?? null,
  };

  const visita = await db.$transaction(async (tx) => {
    const guardada = await tx.visita.upsert({
      where: { idEnvioApp: idEnvio.trim() },
      update: datosVisita,
      create: { ...datosVisita, idEnvioApp: idEnvio.trim() },
    });
    for (const { preguntaId, valor } of valores) {
      await tx.respuesta.upsert({
        where: { visitaId_preguntaId: { visitaId: guardada.id, preguntaId } },
        update: { valor },
        create: { visitaId: guardada.id, preguntaId, valor },
      });
    }
    return guardada;
  }, { timeout: 60_000 });

  return NextResponse.json({
    visitaId: visita.id,
    respuestasGuardadas: valores.length,
    idsDesconocidos,
    interventorEncontrado: Boolean(interventor),
  });
}
