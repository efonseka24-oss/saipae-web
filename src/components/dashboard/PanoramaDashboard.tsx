import { MessageSquareWarning, CheckCircle2, Clock } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BloqueResumen } from "@/components/dashboard/BloqueResumen";
import type { ResumenDashboard } from "@/lib/dashboardResumen";

function TilePqrs({ icono: Icono, etiqueta, valor, color }: { icono: React.ComponentType<{ className?: string }>; etiqueta: string; valor: number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icono className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-tight text-slate-900">{valor}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{etiqueta}</p>
      </div>
    </div>
  );
}

export function PanoramaDashboard({ resumen }: { resumen: ResumenDashboard }) {
  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Panorama general por Departamento</h2>
          <Badge variante="slate">{resumen.departamentos.length} departamento(s)</Badge>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <TilePqrs icono={MessageSquareWarning} etiqueta="PQRS recibidas (todo el sistema)" valor={resumen.pqrs.total} color="bg-blue-50 text-blue-600" />
          <TilePqrs icono={CheckCircle2} etiqueta="PQRS respondidas" valor={resumen.pqrs.respondidas} color="bg-emerald-50 text-emerald-600" />
          <TilePqrs icono={Clock} etiqueta="PQRS pendientes" valor={resumen.pqrs.pendientes} color="bg-amber-50 text-amber-600" />
        </div>

        {resumen.departamentos.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">Todavía no hay departamentos registrados en Registro.</p>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {resumen.departamentos.map((d) => (
              <Card key={d.nombre}>
                <CardHeader>
                  <CardTitle>{d.nombre}</CardTitle>
                </CardHeader>
                <BloqueResumen resumen={d} />
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Información por Lote</h2>
          <Badge variante="slate">{resumen.lotes.length} lote(s)</Badge>
        </div>

        {resumen.lotes.length === 0 ? (
          <Card>
            <p className="text-sm text-slate-500">Todavía no hay lotes registrados en Registro.</p>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {resumen.lotes.map((l) => (
              <Card key={l.loteId}>
                <CardHeader>
                  <div>
                    <CardTitle>{l.lote.nombre}</CardTitle>
                    <p className="text-xs text-slate-500">{l.lote.departamento}</p>
                  </div>
                </CardHeader>
                <BloqueResumen resumen={l} />
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
