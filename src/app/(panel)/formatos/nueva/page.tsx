import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { NuevaVisitaForm } from "@/components/visitas/NuevaVisitaForm";
import { esEsquemaDeEncuesta } from "@/lib/tabulacion";

export default async function NuevaVisitaFormatosPage() {
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
  // Las "Encuesta..." se crean desde Tabulación; aquí solo van los esquemas
  // de visita/inspección (RPS, RI, CCT, Bodega, ...).
  const esquemas = todosLosEsquemas.filter((e) => !esEsquemaDeEncuesta(e.nombre));

  return (
    <div>
      <PageHeader
        titulo="Nueva visita"
        descripcion="Registro manual de emergencia: las visitas normalmente llegan desde la app principal. Úsalo solo si hace falta cargar una a mano."
      />
      <NuevaVisitaForm
        esquemas={esquemas}
        operadores={operadores}
        municipios={municipios}
        instituciones={instituciones}
        sedes={sedes}
        mensajeSinEsquemas="Todavía no hay esquemas (fuera de los que empiezan con Encuesta)."
      />
    </div>
  );
}
