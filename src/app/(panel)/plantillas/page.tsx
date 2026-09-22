import Link from "next/link";
import { Pencil } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NuevaPlantillaBoton } from "@/components/plantillas/NuevaPlantillaBoton";

export default async function PlantillasPage() {
  const [plantillas, esquemas] = await Promise.all([
    db.plantilla.findMany({
      orderBy: { nombre: "asc" },
      include: { esquemas: { select: { id: true, nombre: true } } },
    }),
    db.esquema.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);

  return (
    <div>
      <PageHeader
        titulo="Plantillas de Formatos"
        descripcion="Cada plantilla define el encabezado (NIT, correo, versión, descripción) y el diseño (colores, márgenes, orden) del informe Word. Una misma plantilla puede usarse en varios esquemas a la vez."
        acciones={<NuevaPlantillaBoton esquemas={esquemas} />}
      />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Plantilla</th>
                <th className="py-2 pr-4">Versión</th>
                <th className="py-2 pr-4">Esquemas vinculados</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {plantillas.map((plantilla) => (
                <tr key={plantilla.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4 font-medium text-slate-900">{plantilla.nombre}</td>
                  <td className="py-3 pr-4 text-slate-600">{plantilla.versionFormato || "—"}</td>
                  <td className="py-3 pr-4">
                    {plantilla.esquemas.length === 0 ? (
                      <Badge variante="amber">Sin esquemas vinculados</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {plantilla.esquemas.map((e) => (
                          <Badge key={e.id} variante="green">
                            {e.nombre}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <Link
                      href={`/plantillas/${plantilla.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
              {plantillas.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-slate-400">
                    No hay plantillas todavía. Crea una con el botón de arriba.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
