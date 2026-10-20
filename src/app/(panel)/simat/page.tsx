import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { SimatManager } from "@/components/simat/SimatManager";
import { INCLUIR_ESTUDIANTE_SIMAT, leerFiltrosSimat, whereSimat } from "@/lib/simat";

const POR_PAGINA = 50;

export default async function SimatPage(props: PageProps<"/simat">) {
  const parametros = await props.searchParams;
  const filtros = leerFiltrosSimat(parametros);
  const paginaTexto = Array.isArray(parametros.pagina) ? parametros.pagina[0] : parametros.pagina;
  const pagina = Math.max(1, Number(paginaTexto) || 1);
  const where = whereSimat(filtros);

  const [estudiantes, total, totalGeneral, lotes, zodes, municipios, instituciones, sedes] = await Promise.all([
    db.estudianteSimat.findMany({
      where,
      orderBy: [{ nombre: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      include: INCLUIR_ESTUDIANTE_SIMAT,
    }),
    db.estudianteSimat.count({ where }),
    db.estudianteSimat.count(),
    db.lote.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.zode.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, loteId: true } }),
    db.municipio.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, zodeId: true } }),
    db.institucion.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, numeroDane: true, municipioId: true } }),
    db.sede.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, numeroDane: true, institucionId: true } }),
  ]);

  return (
    <div>
      <PageHeader
        titulo="SIMAT"
        descripcion="Relación de estudiantes con derecho a recibir la alimentación escolar: ID, documento, nombre y su sede. La institución, el municipio, el zode y el lote se toman de la sede."
      />
      <SimatManager
        estudiantes={estudiantes}
        total={total}
        totalGeneral={totalGeneral}
        pagina={pagina}
        paginas={Math.max(1, Math.ceil(total / POR_PAGINA))}
        filtros={filtros}
        lotes={lotes}
        zodes={zodes}
        municipios={municipios}
        instituciones={instituciones}
        sedes={sedes}
      />
    </div>
  );
}
