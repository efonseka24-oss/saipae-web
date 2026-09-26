// Validación compartida al crear y editar una visita del cronograma: revisa
// que los datos de Registro existan y encajen entre sí (el municipio es del
// zode, la sede de la institución, la bodega del operador...) y que los
// responsables sean usuarios del panel.
import { db } from "@/lib/db";
import { leerDia, formatearDia } from "@/lib/cronograma";
import { obtenerSesion } from "@/lib/auth";
import { tieneAccesoModulo } from "@/lib/permisosModulos";

export type DatosCronograma = {
  esquemaId: string | null;
  zodeId: string;
  municipioId: string;
  institucionId: string | null;
  sedeId: string | null;
  operadorId: string | null;
  bodegaId: string | null;
  fechaProgramada: Date;
  fechaRealizacion: Date | null;
  observaciones: string | null;
  interventorId: string;
  supervisorId: string;
};

export async function sesionCronograma() {
  const sesion = await obtenerSesion();
  if (!sesion || !tieneAccesoModulo(sesion.modulosPermitidos, "cronograma")) return null;
  return sesion;
}

const texto = (valor: unknown) => (typeof valor === "string" && valor.trim() ? valor.trim() : null);

export async function validarCronograma(cuerpo: Record<string, unknown>): Promise<{ datos: DatosCronograma } | { error: string }> {
  const zodeId = texto(cuerpo.zodeId);
  const municipioId = texto(cuerpo.municipioId);
  const institucionId = texto(cuerpo.institucionId);
  const sedeId = texto(cuerpo.sedeId);
  const operadorId = texto(cuerpo.operadorId);
  const bodegaId = texto(cuerpo.bodegaId);
  const esquemaId = texto(cuerpo.esquemaId);
  const interventorId = texto(cuerpo.interventorId);
  const supervisorId = texto(cuerpo.supervisorId);
  const fechaProgramada = leerDia(cuerpo.fechaProgramada);
  const fechaRealizacion = cuerpo.fechaRealizacion ? leerDia(cuerpo.fechaRealizacion) : null;
  const observaciones = texto(cuerpo.observaciones);

  if (!zodeId) return { error: "Selecciona el zode." };
  if (!municipioId) return { error: "Selecciona el municipio." };
  if (!fechaProgramada) return { error: "Escribe la fecha programada." };
  if (cuerpo.fechaRealizacion && !fechaRealizacion) return { error: "La fecha de realización no es válida." };
  if (!interventorId) return { error: "Selecciona el interventor asignado." };
  if (!supervisorId) return { error: "Selecciona el supervisor." };
  if (sedeId && !institucionId) return { error: "Selecciona la institución de la sede." };
  if (bodegaId && !operadorId) return { error: "Selecciona el operador de la bodega." };

  const [zode, municipio, institucion, sede, operador, bodega, esquema, interventor, supervisor] = await Promise.all([
    db.zode.findUnique({ where: { id: zodeId }, select: { id: true } }),
    db.municipio.findUnique({ where: { id: municipioId }, select: { zodeId: true } }),
    institucionId ? db.institucion.findUnique({ where: { id: institucionId }, select: { municipioId: true } }) : null,
    sedeId ? db.sede.findUnique({ where: { id: sedeId }, select: { institucionId: true } }) : null,
    operadorId ? db.operador.findUnique({ where: { id: operadorId }, select: { zodeId: true } }) : null,
    bodegaId ? db.bodega.findUnique({ where: { id: bodegaId }, select: { operadorId: true } }) : null,
    esquemaId ? db.esquema.findUnique({ where: { id: esquemaId }, select: { id: true } }) : null,
    db.usuario.findUnique({ where: { id: interventorId }, select: { id: true } }),
    db.usuario.findUnique({ where: { id: supervisorId }, select: { id: true } }),
  ]);

  if (!zode) return { error: "El zode no existe." };
  if (!municipio || municipio.zodeId !== zodeId) return { error: "El municipio no pertenece al zode elegido." };
  if (institucionId && (!institucion || institucion.municipioId !== municipioId)) {
    return { error: "La institución no pertenece al municipio elegido." };
  }
  if (sedeId && (!sede || sede.institucionId !== institucionId)) return { error: "La sede no pertenece a la institución elegida." };
  if (operadorId && (!operador || operador.zodeId !== zodeId)) return { error: "El operador no pertenece al zode elegido." };
  if (bodegaId && (!bodega || bodega.operadorId !== operadorId)) return { error: "La bodega no pertenece al operador elegido." };
  if (esquemaId && !esquema) return { error: "El tipo de visita no existe." };
  if (!interventor) return { error: "El interventor no existe." };
  if (!supervisor) return { error: "El supervisor no existe." };

  return {
    datos: {
      esquemaId,
      zodeId,
      municipioId,
      institucionId,
      sedeId,
      operadorId,
      bodegaId,
      fechaProgramada,
      fechaRealizacion,
      observaciones,
      interventorId,
      supervisorId,
    },
  };
}

// Relaciones que se devuelven y se muestran en el listado.
export const INCLUIR_CRONOGRAMA = {
  esquema: { select: { id: true, nombre: true } },
  zode: { select: { id: true, nombre: true, loteId: true, lote: { select: { id: true, nombre: true } } } },
  municipio: { select: { id: true, nombre: true } },
  institucion: { select: { id: true, nombre: true } },
  sede: { select: { id: true, nombre: true } },
  operador: { select: { id: true, nombreRazonSocial: true } },
  bodega: { select: { id: true, nombre: true } },
  interventor: { select: { id: true, nombre: true, cargo: true } },
  supervisor: { select: { id: true, nombre: true, cargo: true } },
} as const;

// Texto corto para la auditoría: "visita a <lugar> el <fecha>".
export async function describirCronograma(datos: DatosCronograma): Promise<string> {
  const [municipio, sede, bodega] = await Promise.all([
    db.municipio.findUnique({ where: { id: datos.municipioId }, select: { nombre: true } }),
    datos.sedeId ? db.sede.findUnique({ where: { id: datos.sedeId }, select: { nombre: true } }) : null,
    datos.bodegaId ? db.bodega.findUnique({ where: { id: datos.bodegaId }, select: { nombre: true } }) : null,
  ]);
  const lugar = [municipio?.nombre, sede?.nombre ?? bodega?.nombre].filter(Boolean).join(" - ");
  return `visita a ${lugar || "sin lugar"} el ${formatearDia(datos.fechaProgramada)}`;
}
