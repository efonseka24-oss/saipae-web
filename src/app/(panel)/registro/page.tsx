import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { RegistroManager } from "@/components/registro/RegistroManager";

const CADENA_ZODE = { lote: { include: { departamento: { select: { id: true, nombre: true } } } } } as const;

export default async function RegistroPage() {
  const [departamentos, lotes, zodes, municipios, instituciones, sedes, operadores, bodegas] = await Promise.all([
    db.departamento.findMany({ orderBy: { nombre: "asc" }, include: { _count: { select: { lotes: true } } } }),
    db.lote.findMany({
      orderBy: { nombre: "asc" },
      include: { departamento: { select: { id: true, nombre: true } }, _count: { select: { zodes: true } } },
    }),
    db.zode.findMany({
      orderBy: { nombre: "asc" },
      include: { ...CADENA_ZODE, _count: { select: { municipios: true } } },
    }),
    db.municipio.findMany({
      orderBy: { nombre: "asc" },
      include: { zode: { include: CADENA_ZODE }, _count: { select: { instituciones: true } } },
    }),
    db.institucion.findMany({
      orderBy: { nombre: "asc" },
      include: {
        municipio: { include: { zode: { include: CADENA_ZODE } } },
        _count: { select: { sedes: true } },
      },
    }),
    db.sede.findMany({
      orderBy: { numeroDane: "asc" },
      include: {
        institucion: { include: { municipio: { include: { zode: { include: CADENA_ZODE } } } } },
      },
    }),
    db.operador.findMany({
      orderBy: { nombreRazonSocial: "asc" },
      include: { zode: { include: CADENA_ZODE }, _count: { select: { bodegas: true } } },
    }),
    db.bodega.findMany({
      orderBy: { nombre: "asc" },
      include: { operador: { include: { zode: { include: CADENA_ZODE } } } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        titulo="Registro"
        descripcion="Catálogo de departamentos, lotes, zodes, municipios, instituciones, sedes, operadores y bodegas."
      />
      <RegistroManager
        departamentos={departamentos}
        lotes={lotes}
        zodes={zodes}
        municipios={municipios}
        instituciones={instituciones}
        sedes={sedes}
        operadores={operadores}
        bodegas={bodegas}
      />
    </div>
  );
}
