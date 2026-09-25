// Carga (en el servidor) los catálogos de Registro (incluidos los operadores
// con su zode) y los correos de usuarios
// que usan las preguntas con opciones desde Registro. Lo comparten el catálogo
// de la app móvil (/api/app/preguntas) y el formulario web de Tabulación.
// Solo instituciones y sedes habilitadas en PAE.
import { db } from "@/lib/db";
import type { CatalogoRegistro, UsuarioCorreo } from "@/lib/opcionesRegistro";

export async function cargarCatalogoRegistro(): Promise<{ registro: CatalogoRegistro; usuarios: UsuarioCorreo[] }> {
  const [lotes, zodes, municipios, instituciones, sedes, operadores, usuarios] = await Promise.all([
    db.lote.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.zode.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, loteId: true } }),
    db.municipio.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, zodeId: true } }),
    db.institucion.findMany({
      where: { habilitadaPae: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, municipioId: true },
    }),
    db.sede.findMany({
      where: { habilitadaPae: true, institucion: { habilitadaPae: true } },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, institucionId: true },
    }),
    db.operador.findMany({
      orderBy: { nombreRazonSocial: "asc" },
      select: { id: true, nombreRazonSocial: true, zodeId: true },
    }),
    db.usuario.findMany({
      where: { activo: true, correo: { not: null } },
      orderBy: { correo: "asc" },
      select: { correo: true, nombre: true },
    }),
  ]);

  return {
    registro: {
      lotes: lotes.map((l) => ({ id: l.id, nombre: l.nombre, padreId: null })),
      zodes: zodes.map((z) => ({ id: z.id, nombre: z.nombre, padreId: z.loteId })),
      municipios: municipios.map((m) => ({ id: m.id, nombre: m.nombre, padreId: m.zodeId })),
      instituciones: instituciones.map((i) => ({ id: i.id, nombre: i.nombre, padreId: i.municipioId })),
      sedes: sedes.map((s) => ({ id: s.id, nombre: s.nombre, padreId: s.institucionId })),
      operadores: operadores.map((o) => ({ id: o.id, nombre: o.nombreRazonSocial, padreId: o.zodeId })),
    },
    usuarios,
  };
}
