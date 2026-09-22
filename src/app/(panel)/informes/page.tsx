import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { InformesManager } from "@/components/informes/InformesManager";

export default async function InformesPage() {
  const lotes = await db.lote.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, departamento: { select: { nombre: true } } },
  });

  return (
    <div>
      <PageHeader
        titulo="Generar Informes"
        descripcion="Consolida visitas, actas CAES, muestras de laboratorio y PQRS por lote, con membrete y gráficas de barra."
      />
      <InformesManager lotes={lotes} />
    </div>
  );
}
