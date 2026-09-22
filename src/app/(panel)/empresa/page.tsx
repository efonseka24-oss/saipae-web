import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { DatosEmpresaForm } from "@/components/empresa/DatosEmpresaForm";

export default async function EmpresaPage() {
  const datos = await db.datosEmpresa.upsert({
    where: { id: "empresa" },
    update: {},
    create: { id: "empresa" },
  });

  return (
    <div>
      <PageHeader
        titulo="Datos de la Empresa"
        descripcion="Información de la empresa dueña del sistema, usada en reportes y formatos."
      />
      <DatosEmpresaForm datosIniciales={datos} />
    </div>
  );
}
