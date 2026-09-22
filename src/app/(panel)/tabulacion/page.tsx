import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { TablaVisitas } from "@/components/visitas/TablaVisitas";
import { EstadisticasEncuestasToggle } from "@/components/visitas/EstadisticasEncuestasToggle";
import { esEsquemaDeEncuesta } from "@/lib/tabulacion";
import { resolverCadenasDeEncuestas } from "@/lib/estadisticasPreguntas";

export default async function TabulacionPage() {
  const [todasLasVisitas, filasEstadistica, lotes, zodes, municipios, instituciones] = await Promise.all([
    db.visita.findMany({
      include: { esquema: { select: { nombre: true } } },
      orderBy: { fecha: "desc" },
    }),
    resolverCadenasDeEncuestas(),
    db.lote.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.zode.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, loteId: true } }),
    db.municipio.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, zodeId: true } }),
    db.institucion.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, municipioId: true } }),
  ]);

  const mapaCadena = new Map(filasEstadistica.map((f) => [f.id, f.cadena]));
  const visitas = todasLasVisitas
    .filter((v) => esEsquemaDeEncuesta(v.esquema.nombre))
    .map((v) => ({ ...v, cadena: mapaCadena.get(v.id) ?? null }));

  return (
    <div>
      <PageHeader
        titulo="Tabulación de Encuestas"
        descripcion="Diligencia visitas y sus respuestas. De aquí se arman los informes en Generar Formatos."
        acciones={
          <Link
            href="/tabulacion/nueva"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nueva visita
          </Link>
        }
      />
      <EstadisticasEncuestasToggle filas={filasEstadistica} />
      <Card>
        <TablaVisitas visitas={visitas} lotes={lotes} zodes={zodes} municipios={municipios} instituciones={instituciones} />
      </Card>
    </div>
  );
}
