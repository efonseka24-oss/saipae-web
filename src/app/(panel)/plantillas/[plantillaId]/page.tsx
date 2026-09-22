import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { esModuloDePreguntas, valorMaximoPregunta } from "@/lib/plantillaPreguntas";
import { PlantillaEditorForm } from "@/components/plantillas/PlantillaEditorForm";
import type { ModuloDiseno } from "@/components/plantillas/DisenadorFormato";

export default async function PlantillaEditorPage({
  params,
}: {
  params: Promise<{ plantillaId: string }>;
}) {
  const { plantillaId } = await params;

  const [plantilla, todosLosEsquemas] = await Promise.all([
    db.plantilla.findUnique({
      where: { id: plantillaId },
      include: { esquemas: { select: { id: true, nombre: true } } },
    }),
    db.esquema.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ]);
  if (!plantilla) notFound();

  const modulosPorEsquemaEntradas = await Promise.all(
    plantilla.esquemas.map(async (esquema) => {
      const modulos = await db.moduloEsquema.findMany({
        where: { esquemaId: esquema.id },
        orderBy: { orden: "asc" },
        include: { preguntas: { orderBy: { orden: "asc" } } },
      });
      const modulosParaDiseno: ModuloDiseno[] = modulos
        .filter((m) => m.preguntas.length > 0)
        .map((m) => ({
          id: m.id,
          nombre: m.nombre,
          tipo: esModuloDePreguntas(m.preguntas) ? ("PREGUNTAS" as const) : ("DATOS_GENERALES" as const),
          preguntas: m.preguntas
            .filter((p) => p.clase === "PRINCIPAL")
            .map((p) => ({ id: p.id, texto: p.texto, valorMaximo: valorMaximoPregunta(p) })),
        }));
      return [esquema.id, modulosParaDiseno] as const;
    })
  );
  const modulosPorEsquema = Object.fromEntries(modulosPorEsquemaEntradas);

  return (
    <div>
      <Link href="/plantillas" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Volver a Plantillas
      </Link>
      <PlantillaEditorForm
        plantillaId={plantilla.id}
        plantilla={plantilla}
        todosLosEsquemas={todosLosEsquemas}
        modulosPorEsquema={modulosPorEsquema}
      />
    </div>
  );
}
