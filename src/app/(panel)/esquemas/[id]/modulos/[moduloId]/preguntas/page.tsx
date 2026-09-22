import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { PreguntasManager } from "@/components/preguntas/PreguntasManager";

export default async function PreguntasModuloPage(
  props: PageProps<"/esquemas/[id]/modulos/[moduloId]/preguntas">
) {
  const { id, moduloId } = await props.params;

  const modulo = await db.moduloEsquema.findUnique({
    where: { id: moduloId },
    include: { esquema: true },
  });
  if (!modulo || modulo.esquemaId !== id) notFound();

  const preguntas = await db.pregunta.findMany({
    where: { moduloId },
    orderBy: { orden: "asc" },
  });

  const preguntasSerializadas = preguntas.map((p) => ({
    ...p,
    opciones: JSON.parse(p.opciones) as string[],
  }));

  const modulosDelEsquema = await db.moduloEsquema.findMany({
    where: { esquemaId: id },
    orderBy: { orden: "asc" },
    select: { id: true, nombre: true },
  });

  return (
    <div>
      <Link
        href={`/esquemas/${id}/modulos`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Módulos de {modulo.esquema.nombre}
      </Link>

      <PageHeader
        titulo={`Preguntas de ${modulo.nombre}`}
        descripcion={modulo.descripcion ?? undefined}
      />

      <PreguntasManager moduloId={modulo.id} preguntas={preguntasSerializadas} modulosDelEsquema={modulosDelEsquema} />
    </div>
  );
}
