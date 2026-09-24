import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { NuevoModuloForm } from "@/components/modulos/NuevoModuloForm";
import { FilaModulo } from "@/components/modulos/FilaModulo";

export default async function ModulosEsquemaPage(props: PageProps<"/esquemas/[id]/modulos">) {
  const { id } = await props.params;

  const esquema = await db.esquema.findUnique({ where: { id } });
  if (!esquema) notFound();

  const modulos = await db.moduloEsquema.findMany({
    where: { esquemaId: id },
    orderBy: { orden: "asc" },
    include: { _count: { select: { preguntas: true } } },
  });

  return (
    <div>
      <Link
        href="/esquemas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Esquemas
      </Link>

      <PageHeader
        titulo={`Módulos de ${esquema.nombre}`}
        descripcion="Agrupa las preguntas de este esquema por módulo. Las flechas cambian el orden en el panel y los informes; el orden de la encuesta en la app lo define el campo Orden de cada pregunta."
        acciones={<NuevoModuloForm esquemaId={esquema.id} />}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Módulo</th>
                <th className="py-2 pr-4">Descripción</th>
                <th className="py-2 pr-4">Preguntas</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {modulos.map((modulo, indice) => (
                <FilaModulo key={modulo.id} modulo={modulo} esPrimero={indice === 0} esUltimo={indice === modulos.length - 1} />
              ))}
              {modulos.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-slate-400">
                    Este esquema todavía no tiene módulos.
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
