import { PageHeader } from "@/components/layout/PageHeader";
import { PanoramaDashboard } from "@/components/dashboard/PanoramaDashboard";
import { BotonExportarPdf } from "@/components/dashboard/BotonExportarPdf";
import { obtenerResumenDashboard } from "@/lib/dashboardResumen";

export default async function DashboardPage() {
  const resumen = await obtenerResumenDashboard();

  return (
    <div>
      <PageHeader
        titulo="Dashboard General"
        descripcion="Panorama general del proyecto por departamento y, más abajo, el detalle por lote."
        acciones={<BotonExportarPdf />}
      />
      <PanoramaDashboard resumen={resumen} />
    </div>
  );
}
