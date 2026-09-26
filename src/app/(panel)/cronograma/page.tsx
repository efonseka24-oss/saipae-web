import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { CronogramaManager } from "@/components/cronograma/CronogramaManager";
import { INCLUIR_CRONOGRAMA } from "@/lib/guardarCronograma";
import { hoyColombia } from "@/lib/cronograma";

export default async function CronogramaPage() {
  const [visitas, lotes, zodes, municipios, instituciones, sedes, operadores, bodegas, esquemas, usuarios] = await Promise.all([
    db.cronogramaVisita.findMany({ orderBy: [{ fechaProgramada: "asc" }, { createdAt: "asc" }], include: INCLUIR_CRONOGRAMA }),
    db.lote.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.zode.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, loteId: true } }),
    db.municipio.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, zodeId: true } }),
    db.institucion.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, municipioId: true } }),
    db.sede.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, institucionId: true } }),
    db.operador.findMany({ orderBy: { nombreRazonSocial: "asc" }, select: { id: true, nombreRazonSocial: true, zodeId: true } }),
    db.bodega.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, operadorId: true } }),
    db.esquema.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.usuario.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, cargo: true } }),
  ]);

  return (
    <div>
      <PageHeader
        titulo="Cronograma de Visitas"
        descripcion="Programa las visitas con su lugar (datos de Registro), tipo de visita, interventor asignado y supervisor. Al registrar la fecha de realización la visita queda como realizada; si la fecha programada pasa sin realizarse, queda vencida."
      />
      <CronogramaManager
        visitas={visitas}
        catalogos={{ lotes, zodes, municipios, instituciones, sedes, operadores, bodegas, esquemas, usuarios }}
        hoy={hoyColombia()}
      />
    </div>
  );
}
