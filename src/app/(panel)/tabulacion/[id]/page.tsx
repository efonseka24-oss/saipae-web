import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { DiligenciarVisitaForm } from "@/components/visitas/DiligenciarVisitaForm";
import { cargarCatalogoRegistro } from "@/lib/catalogoRegistro";

export default async function DiligenciarVisitaPage({ params }: PageProps<"/tabulacion/[id]">) {
  const { id } = await params;

  const visita = await db.visita.findUnique({
    where: { id },
    include: { esquema: { select: { id: true, nombre: true } } },
  });
  // Nota: esta página edita visitas de cualquier esquema (no solo
  // "Encuesta..."), ya que también se enlaza desde Generar Formatos para
  // editar visitas de RPS/RI/CCT/Bodega/etc. El listado y la creación en
  // Tabulación sí siguen restringidos a esquemas "Encuesta..." (ver
  // /lib/tabulacion.ts).
  if (!visita) notFound();

  const modulos = await db.moduloEsquema.findMany({
    where: { esquemaId: visita.esquemaId },
    orderBy: { orden: "asc" },
    include: {
      preguntas: {
        orderBy: { orden: "asc" },
      },
    },
  });

  const respuestas = await db.respuesta.findMany({ where: { visitaId: id } });

  const modulosConOpciones = modulos.map((m) => ({
    ...m,
    preguntas: m.preguntas.map((p) => ({ ...p, opciones: JSON.parse(p.opciones) as string[] })),
  }));

  const catalogo = await cargarCatalogoRegistro();
  const [operadores, municipios, instituciones, sedes] = await Promise.all([
    db.operador.findMany({
      orderBy: { nombreRazonSocial: "asc" },
      include: { zode: { include: { lote: { include: { departamento: { select: { nombre: true } } } } } } },
    }),
    db.municipio.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, zodeId: true } }),
    db.institucion.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, numeroDane: true, municipioId: true },
    }),
    db.sede.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        titulo={`Visita — ${visita.esquema.nombre}`}
        descripcion="Diligencia las respuestas de la visita. Se guardan automáticamente."
      />
      <DiligenciarVisitaForm
        visita={visita}
        modulos={modulosConOpciones}
        respuestasIniciales={respuestas}
        operadores={operadores}
        municipios={municipios}
        instituciones={instituciones}
        sedes={sedes}
        catalogoRegistro={catalogo.registro}
        usuariosCorreo={catalogo.usuarios}
      />
    </div>
  );
}
