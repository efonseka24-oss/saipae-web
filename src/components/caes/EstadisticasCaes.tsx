import { FileStack, FileCheck2, CalendarCheck, School, FileX } from "lucide-react";
import { Card } from "@/components/ui/Card";

type FilaInstitucion = {
  id: string;
  nombre: string;
  municipio: string;
  conformacion: number;
  reunion: number;
};

function TarjetaEstadistica({
  icono: Icono,
  etiqueta,
  valor,
}: {
  icono: React.ComponentType<{ className?: string }>;
  etiqueta: string;
  valor: number;
}) {
  return (
    <Card className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Icono className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{valor}</p>
        <p className="text-xs font-medium text-slate-500">{etiqueta}</p>
      </div>
    </Card>
  );
}

export function EstadisticasCaes({ filas }: { filas: FilaInstitucion[] }) {
  const totalActas = filas.reduce((acc, f) => acc + f.conformacion + f.reunion, 0);
  const totalConformacion = filas.reduce((acc, f) => acc + f.conformacion, 0);
  const totalReunion = filas.reduce((acc, f) => acc + f.reunion, 0);
  const institucionesConActas = filas.filter((f) => f.conformacion + f.reunion > 0).length;
  const institucionesSinActas = filas.length - institucionesConActas;

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <TarjetaEstadistica icono={FileStack} etiqueta="Actas totales" valor={totalActas} />
      <TarjetaEstadistica icono={FileCheck2} etiqueta="Actas de conformación" valor={totalConformacion} />
      <TarjetaEstadistica icono={CalendarCheck} etiqueta="Actas de reunión" valor={totalReunion} />
      <TarjetaEstadistica icono={School} etiqueta="Instituciones con actas" valor={institucionesConActas} />
      <TarjetaEstadistica icono={FileX} etiqueta="Instituciones sin actas" valor={institucionesSinActas} />
    </div>
  );
}
