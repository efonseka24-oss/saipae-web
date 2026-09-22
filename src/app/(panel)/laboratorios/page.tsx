import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { LaboratoriosManager } from "@/components/laboratorios/LaboratoriosManager";

const INCLUIR_LABORATORIO = {
  zode: { include: { lote: { include: { departamento: { select: { id: true, nombre: true } } } } } },
  municipio: { select: { id: true, nombre: true } },
  institucion: { select: { id: true, nombre: true, numeroDane: true } },
  sede: { select: { id: true, nombre: true, numeroDane: true } },
  operador: { select: { id: true, nombreRazonSocial: true } },
  esquema: { select: { id: true, nombre: true } },
  detalles: { orderBy: { orden: "asc" } },
} as const;

export default async function LaboratoriosPage() {
  const [laboratorios, lotes, zodes, municipios, instituciones, sedes, operadores, esquemas] = await Promise.all([
    db.laboratorio.findMany({ orderBy: { fechaTomaMuestra: "desc" }, include: INCLUIR_LABORATORIO }),
    db.lote.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.zode.findMany({
      orderBy: { nombre: "asc" },
      include: { lote: { include: { departamento: { select: { id: true, nombre: true } } } } },
    }),
    db.municipio.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, zodeId: true } }),
    db.institucion.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, numeroDane: true, municipioId: true },
    }),
    db.sede.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, numeroDane: true, institucionId: true },
    }),
    db.operador.findMany({ orderBy: { nombreRazonSocial: "asc" }, select: { id: true, nombreRazonSocial: true, zodeId: true } }),
    db.esquema.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);

  return (
    <div>
      <PageHeader
        titulo="Laboratorios"
        descripcion="Registra la toma de muestras por sede y su resultado de laboratorio (favorable o desfavorable), con el soporte cargado."
      />
      <LaboratoriosManager
        laboratorios={laboratorios}
        lotes={lotes}
        zodes={zodes}
        municipios={municipios}
        instituciones={instituciones}
        sedes={sedes}
        operadores={operadores}
        esquemas={esquemas}
      />
    </div>
  );
}
