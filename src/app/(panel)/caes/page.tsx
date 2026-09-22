import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActasCaesManager } from "@/components/caes/ActasCaesManager";
import { EstadisticasCaes } from "@/components/caes/EstadisticasCaes";
import { InstitucionesConActasTabla } from "@/components/caes/InstitucionesConActasTabla";
import { CaesListadoToggle } from "@/components/caes/CaesListadoToggle";

const CADENA_MUNICIPIO = {
  municipio: {
    select: {
      id: true,
      nombre: true,
      zode: {
        select: {
          id: true,
          nombre: true,
          lote: { select: { id: true, nombre: true, departamento: { select: { nombre: true } } } },
        },
      },
    },
  },
} as const;

export default async function CaesPage() {
  const [actas, instituciones, lotes, zodes, municipios] = await Promise.all([
    db.actaCaes.findMany({
      orderBy: { fecha: "desc" },
      include: { institucion: { include: CADENA_MUNICIPIO } },
    }),
    db.institucion.findMany({
      orderBy: { nombre: "asc" },
      include: CADENA_MUNICIPIO,
    }),
    db.lote.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.zode.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, loteId: true } }),
    db.municipio.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, zodeId: true } }),
  ]);

  const conteosPorInstitucion = new Map<string, { conformacion: number; reunion: number }>();
  for (const acta of actas) {
    const actual = conteosPorInstitucion.get(acta.institucionId) ?? { conformacion: 0, reunion: 0 };
    if (acta.tipo === "CONFORMACION") actual.conformacion += 1;
    else if (acta.tipo === "REUNION") actual.reunion += 1;
    conteosPorInstitucion.set(acta.institucionId, actual);
  }

  const filasInstituciones = instituciones.map((i) => {
    const conteo = conteosPorInstitucion.get(i.id) ?? { conformacion: 0, reunion: 0 };
    return {
      id: i.id,
      nombre: i.nombre,
      municipio: i.municipio.nombre,
      conformacion: conteo.conformacion,
      reunion: conteo.reunion,
    };
  });

  return (
    <div>
      <PageHeader
        titulo="CAES"
        descripcion="Almacena las actas del Comité de Alimentación Escolar (conformación y reunión) con su PDF, por institución."
      />
      <EstadisticasCaes filas={filasInstituciones} />
      <CaesListadoToggle
        vistaActas={<ActasCaesManager actas={actas} instituciones={instituciones} lotes={lotes} zodes={zodes} municipios={municipios} />}
        vistaInstituciones={<InstitucionesConActasTabla filas={filasInstituciones} />}
      />
    </div>
  );
}
