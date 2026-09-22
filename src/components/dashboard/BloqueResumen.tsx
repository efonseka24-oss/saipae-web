import { ClipboardCheck, ClipboardList, Users2, FlaskConical } from "lucide-react";
import { GrupoBarras, GrupoBarrasFavorabilidad, type DatoBarra, type DatoFavorabilidad } from "@/components/dashboard/BarraSimple";
import { ETIQUETAS_RESULTADO_LABORATORIO, type ResultadoLaboratorio } from "@/lib/laboratorios";
import type { ResumenCaes } from "@/lib/informeConsolidado";

function StatTile({
  icono: Icono,
  etiqueta,
  valor,
}: {
  icono: React.ComponentType<{ className?: string }>;
  etiqueta: string;
  valor: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Icono className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-tight text-slate-900">{valor}</p>
        <p className="break-words text-[10px] font-medium uppercase leading-tight text-slate-500">{etiqueta}</p>
      </div>
    </div>
  );
}

export type ResumenModulos = {
  totalVisitas: number;
  visitas: { esquemaNombre: string; cantidad: number; cumplimientoPromedio: number | null }[];
  totalEncuestas: number;
  encuestas: { institucion: string; cantidad: number; favorabilidad: number | null }[];
  caes: ResumenCaes;
  totalLaboratorios: number;
  laboratorios: { resultado: string; cantidad: number }[];
};

export function BloqueResumen({ resumen }: { resumen: ResumenModulos }) {
  const barrasFavorabilidad: DatoFavorabilidad[] = resumen.visitas.map((v) => ({
    etiqueta: v.esquemaNombre,
    porcentaje: v.cumplimientoPromedio,
  }));

  const barrasEncuestas: DatoBarra[] = resumen.encuestas.map((e) => ({
    etiqueta: e.institucion,
    valor: e.cantidad,
    sufijo: " encuesta(s)",
    notaSecundaria: e.favorabilidad !== null ? `Favorabilidad: ${e.favorabilidad}%` : undefined,
  }));

  const barrasLaboratorios: DatoBarra[] = resumen.laboratorios.map((l) => ({
    etiqueta: ETIQUETAS_RESULTADO_LABORATORIO[l.resultado as ResultadoLaboratorio] ?? l.resultado,
    valor: l.cantidad,
    sufijo: " muestra(s)",
    color: l.resultado === "FAVORABLE" ? "bg-emerald-600" : "bg-red-600",
  }));

  const totalCaes = resumen.caes.institucionesConConformacion + resumen.caes.totalReunion;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <StatTile icono={ClipboardCheck} etiqueta="Visitas" valor={resumen.totalVisitas} />
        <StatTile icono={ClipboardList} etiqueta="Encuestas" valor={resumen.totalEncuestas} />
        <StatTile icono={Users2} etiqueta="Actas CAES" valor={totalCaes} />
        <StatTile icono={FlaskConical} etiqueta="Laboratorios" valor={resumen.totalLaboratorios} />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Favorabilidad por esquema (visitas)</p>
        <GrupoBarrasFavorabilidad datos={barrasFavorabilidad} textoVacio="No hay visitas registradas." />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Encuestas por institución</p>
        <GrupoBarras datos={barrasEncuestas} textoVacio="No hay encuestas registradas." />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Acta de Conformación (cobertura)</p>
        <GrupoBarrasFavorabilidad
          datos={[{ etiqueta: "Instituciones con acta", porcentaje: resumen.caes.porcentajeConformacion }]}
          textoVacio="No hay instituciones registradas."
        />
        {resumen.caes.porcentajeConformacion !== null && (
          <p className="mt-1 text-xs text-slate-400">
            {resumen.caes.institucionesConConformacion} de {resumen.caes.totalInstituciones} institución(es)
          </p>
        )}
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Actas de Reunión</p>
        <p className="text-xl font-bold text-slate-900">
          {resumen.caes.totalReunion} <span className="text-xs font-normal text-slate-500">acta(s) registrada(s)</span>
        </p>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Laboratorios por resultado</p>
        <GrupoBarras datos={barrasLaboratorios} textoVacio="No hay muestras de laboratorio registradas." />
      </div>
    </div>
  );
}
