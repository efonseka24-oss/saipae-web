// Registro de auditoría del panel: quién hizo qué, cuándo, desde dónde y con
// qué resultado. Las rutas de la API se envuelven con `conAuditoria`, que
// deduce el módulo y la acción de la URL y del método, y guarda el código de
// respuesta. Una ruta puede precisar la descripción con `anotarAuditoria`
// (ej. el login, que todavía no tiene sesión al llegar la petición).
//
// No se hace en proxy.ts a propósito: si el proxy pasa por /api, Next guarda
// en memoria el cuerpo de cada petición (máx. 10 MB) y dañaría las subidas
// grandes (fotos de la app, respaldos).
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";

export type TipoAuditoria = "SESION" | "NAVEGACION" | "ACCION" | "APP" | "RESPALDO" | "SISTEMA";

export const ETIQUETAS_TIPO_AUDITORIA: Record<TipoAuditoria, string> = {
  SESION: "Sesión",
  NAVEGACION: "Navegación",
  ACCION: "Cambio / acción",
  APP: "App móvil",
  RESPALDO: "Copia de seguridad",
  SISTEMA: "Sistema",
};

// La auditoría solo conserva los últimos 3 meses: lo anterior se borra solo.
export const MESES_CONSERVAR_AUDITORIA = 3;
const INTERVALO_LIMPIEZA_MS = 6 * 60 * 60 * 1000; // revisa como mucho cada 6 horas
let ultimaLimpieza = 0;

async function limpiarAuditoriaAntigua(): Promise<void> {
  const ahora = Date.now();
  if (ahora - ultimaLimpieza < INTERVALO_LIMPIEZA_MS) return;
  ultimaLimpieza = ahora;
  try {
    const limite = new Date(ahora);
    limite.setMonth(limite.getMonth() - MESES_CONSERVAR_AUDITORIA);
    const { count } = await db.auditoria.deleteMany({ where: { fecha: { lt: limite } } });
    if (count > 0) {
      await db.auditoria.create({
        data: {
          tipo: "SISTEMA",
          accion: "Limpió la auditoría",
          descripcion: `Borró ${count} registro(s) de auditoría de más de ${MESES_CONSERVAR_AUDITORIA} meses`,
          modulo: "Administrador",
          usuario: "sistema",
        },
      });
    }
  } catch (error) {
    console.error("No se pudo limpiar la auditoría antigua:", error);
  }
}

export type DatosAuditoria = {
  tipo: TipoAuditoria;
  accion: string;
  descripcion: string;
  modulo?: string | null;
  usuarioId?: string | null;
  usuario?: string;
  nombre?: string | null;
  metodo?: string | null;
  ruta?: string | null;
  estado?: number | null;
  exito?: boolean;
  ip?: string | null;
  agente?: string | null;
};

// Nunca lanza: un fallo al auditar no debe tumbar la acción del usuario.
export async function registrarAuditoria(datos: DatosAuditoria): Promise<void> {
  void limpiarAuditoriaAntigua();
  try {
    await db.auditoria.create({
      data: {
        tipo: datos.tipo,
        accion: datos.accion.slice(0, 200),
        descripcion: datos.descripcion.slice(0, 1000),
        modulo: datos.modulo ?? null,
        usuarioId: datos.usuarioId ?? null,
        usuario: datos.usuario ?? "anonimo",
        nombre: datos.nombre ?? null,
        metodo: datos.metodo ?? null,
        ruta: datos.ruta?.slice(0, 500) ?? null,
        estado: datos.estado ?? null,
        exito: datos.exito ?? true,
        ip: datos.ip ?? null,
        agente: datos.agente?.slice(0, 300) ?? null,
      },
    });
  } catch (error) {
    console.error("No se pudo registrar la auditoría:", error);
  }
}

export function origenDeSolicitud(request: Request): { ip: string | null; agente: string | null } {
  const reenviada = request.headers.get("x-forwarded-for");
  const ip = reenviada?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
  return { ip, agente: request.headers.get("user-agent") };
}

// Registra una acción hecha por el usuario con sesión (o anónimo si no hay).
export async function auditarUsuario(
  request: Request,
  datos: Omit<DatosAuditoria, "usuarioId" | "usuario" | "nombre" | "ip" | "agente">
): Promise<void> {
  const sesion = await obtenerSesion();
  await registrarAuditoria({
    ...datos,
    usuarioId: sesion?.id ?? null,
    usuario: sesion?.usuario ?? "anonimo",
    nombre: sesion?.nombre ?? null,
    ...origenDeSolicitud(request),
  });
}

// --- Descripción automática a partir de la URL --------------------------

const MODULOS_API: Record<string, string> = {
  app: "App móvil",
  auth: "Sesión",
  administrador: "Administrador",
  usuarios: "Administrador",
  caes: "CAES",
  cronograma: "Cronograma de Visitas",
  dashboard: "Dashboard",
  "editor-formatos": "Editor de formatos",
  empresa: "Datos de la Empresa",
  esquemas: "Esquemas y Preguntas",
  modulos: "Esquemas y Preguntas",
  preguntas: "Esquemas y Preguntas",
  formatos: "Generar Formatos",
  informes: "Generar Informes",
  laboratorios: "Laboratorios",
  plantillas: "Plantillas de Formatos",
  pqrs: "PQRS",
  registro: "Registro",
  tabulacion: "Tabulación de Encuestas",
  visitas: "Tabulación de Encuestas",
};

// Último segmento de la URL que indica una acción concreta (no un recurso).
const VERBOS_POST: Record<string, string> = {
  mover: "Movió",
  generar: "Generó",
  prueba: "Probó",
  reemplazar: "Reemplazó",
  "carga-masiva": "Cargó masivamente",
  archivo: "Subió archivo de",
  firma: "Subió firma de",
  logo: "Subió logo de",
  membrete: "Subió membrete de",
  respuesta: "Respondió",
  estadisticas: "Generó",
  "reporte-especifico": "Generó",
  "reporte-general": "Generó",
  consolidado: "Generó",
  login: "Inició sesión",
  logout: "Cerró sesión",
  restablecer: "Restableció la clave",
};

const ES_ID = /^(c[a-z0-9]{20,}|[0-9a-f-]{20,}|\d+)$/i;

export function describirRuta(metodo: string, pathname: string): { modulo: string | null; accion: string; recurso: string } {
  const segmentos = pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  const modulo = MODULOS_API[segmentos[0]] ?? null;
  const ultimo = segmentos[segmentos.length - 1] ?? "";
  const legibles = segmentos.filter((s) => !ES_ID.test(s)).map((s) => s.replace(/-/g, " "));
  const recurso = legibles.join(" / ");

  let accion: string;
  if (metodo === "GET") accion = "Descargó";
  else if (metodo === "DELETE") accion = "Eliminó";
  else if (metodo === "PATCH" || metodo === "PUT") accion = VERBOS_POST[ultimo] ?? "Editó";
  else accion = VERBOS_POST[ultimo] ?? "Creó";
  return { modulo, accion, recurso };
}

// Nombre legible del registro afectado, si la respuesta JSON lo trae.
async function nombreEnRespuesta(respuesta: Response): Promise<string | null> {
  if (!respuesta.headers.get("content-type")?.includes("application/json")) return null;
  try {
    const cuerpo = await respuesta.clone().json();
    const objeto = Array.isArray(cuerpo) ? null : cuerpo;
    if (!objeto || typeof objeto !== "object") return null;
    for (const clave of ["nombre", "nombreRazonSocial", "usuario", "texto", "titulo", "radicado"]) {
      const valor = (objeto as Record<string, unknown>)[clave];
      if (typeof valor === "string" && valor.trim()) return valor.trim().slice(0, 120);
    }
    const error = (objeto as Record<string, unknown>).error;
    if (typeof error === "string") return `error: ${error.slice(0, 200)}`;
  } catch {
    // respuesta no JSON o ya consumida: se audita sin nombre
  }
  return null;
}

// --- Anotaciones que una ruta agrega a su propia auditoría ---------------

type Anotacion = Partial<Pick<DatosAuditoria, "accion" | "descripcion" | "usuarioId" | "usuario" | "nombre" | "tipo">> & {
  omitir?: boolean;
};
const anotaciones = new WeakMap<Request, Anotacion>();

export function anotarAuditoria(request: Request, anotacion: Anotacion): void {
  anotaciones.set(request, { ...anotaciones.get(request), ...anotacion });
}

// Envuelve un manejador de ruta (POST, PATCH, ...) para auditarlo.
export function conAuditoria<C, R extends Response>(
  manejador: (request: NextRequest, ctx: C) => Promise<R>
): (request: NextRequest, ctx: C) => Promise<R> {
  return async (request, ctx) => {
    let respuesta: R | undefined;
    try {
      respuesta = await manejador(request, ctx);
      return respuesta;
    } finally {
      await auditarRespuesta(request, respuesta);
    }
  };
}

async function auditarRespuesta(request: NextRequest, respuesta: Response | undefined) {
  const anotacion = anotaciones.get(request) ?? {};
  if (anotacion.omitir) return;

  const metodo = request.method.toUpperCase();
  const pathname = request.nextUrl.pathname;
  const { modulo, accion, recurso } = describirRuta(metodo, pathname);
  const estado = respuesta?.status ?? 500;
  const exito = estado < 400;
  const esApp = pathname.startsWith("/api/app/");
  const esSesion = pathname.startsWith("/api/auth/");

  const sesion = esApp ? null : await obtenerSesion();
  const nombreRegistro = respuesta ? await nombreEnRespuesta(respuesta) : null;
  const descripcion =
    anotacion.descripcion ?? [`${anotacion.accion ?? accion} ${recurso}`.trim(), nombreRegistro].filter(Boolean).join(": ");

  await registrarAuditoria({
    tipo: anotacion.tipo ?? (esApp ? "APP" : esSesion ? "SESION" : "ACCION"),
    accion: anotacion.accion ?? accion,
    descripcion,
    modulo,
    usuarioId: anotacion.usuarioId ?? sesion?.id ?? null,
    usuario: anotacion.usuario ?? sesion?.usuario ?? (esApp ? "app-movil" : "anonimo"),
    nombre: anotacion.nombre ?? sesion?.nombre ?? null,
    metodo,
    ruta: pathname,
    estado,
    exito,
    ...origenDeSolicitud(request),
  });
}
