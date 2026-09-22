import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { NuevaVisitaForm } from "@/components/visitas/NuevaVisitaForm";
import { esEsquemaDeEncuesta } from "@/lib/tabulacion";

export default async function NuevaVisitaPage() {
  const [todosLosEsquemas, operadores, municipios, instituciones, sedes] = await Promise.all([
    db.esquema.findMany({ orderBy: { nombre: "asc" } }),
    db.operador.findMany({
      orderBy: { nombreRazonSocial: "asc" },
      include: { zode: { include: { lote: { include: { departamento: { select: { nombre: true } } } } } } },
    }),
    db.municipio.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, zodeId: true },
    }),
    db.institucion.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, numeroDane: true, municipioId: true },
    }),
    db.sede.findMany({ orderBy: { nombre: "asc" } }),
  ]);
  const esquemas = todosLosEsquemas.filter((e) => esEsquemaDeEncuesta(e.nombre));

  return (
    <div>
      <PageHeader
        titulo="Nueva visita"
        descripcion="Elige el esquema y la fecha de la visita. Podrás diligenciar las respuestas a continuación."
      />
      <NuevaVisitaForm
        esquemas={esquemas}
        operadores={operadores}
        municipios={municipios}
        instituciones={instituciones}
        sedes={sedes}
        mensajeSinEsquemas='Todavía no hay esquemas cuyo nombre empiece con "Encuesta" (los únicos que se pueden diligenciar aquí).'
      />
    </div>
  );
}
