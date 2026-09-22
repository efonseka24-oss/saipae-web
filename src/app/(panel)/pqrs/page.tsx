import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { PqrsManager } from "@/components/pqrs/PqrsManager";

const INCLUIR_PETICION = {
  responsable: { select: { id: true, nombre: true, cargo: true } },
  respuesta: true,
} as const;

export default async function PqrsPage() {
  const [peticiones, usuarios] = await Promise.all([
    db.peticionPqrs.findMany({ orderBy: { fechaRadicado: "desc" }, include: INCLUIR_PETICION }),
    db.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, cargo: true } }),
  ]);

  return (
    <div>
      <PageHeader
        titulo="PQRS"
        descripcion="Registra peticiones, quejas, reclamos y sugerencias con su radicado de entrada, y genera la carta de respuesta con su propio radicado de salida."
      />
      <PqrsManager peticiones={peticiones} usuarios={usuarios} />
    </div>
  );
}
