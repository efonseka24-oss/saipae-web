import { Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type FilaInstitucion = {
  id: string;
  nombre: string;
  municipio: string;
  conformacion: number;
  reunion: number;
};

export function InstitucionesConActasTabla({ filas }: { filas: FilaInstitucion[] }) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-slate-400" />
        <h2 className="text-base font-semibold text-slate-900">Instituciones y sus actas</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-4">Institución</th>
              <th className="py-2 pr-4">Municipio</th>
              <th className="py-2 pr-4">Actas de conformación</th>
              <th className="py-2 pr-4">Actas de reunión</th>
              <th className="py-2 pr-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-b border-slate-100 last:border-0">
                <td className="py-3 pr-4 font-medium text-slate-900">{f.nombre}</td>
                <td className="py-3 pr-4 text-slate-600">{f.municipio}</td>
                <td className="py-3 pr-4">
                  <Badge variante={f.conformacion > 0 ? "blue" : "slate"}>{f.conformacion}</Badge>
                </td>
                <td className="py-3 pr-4">
                  <Badge variante={f.reunion > 0 ? "green" : "slate"}>{f.reunion}</Badge>
                </td>
                <td className="py-3 pr-4">
                  {f.conformacion + f.reunion > 0 ? (
                    <Badge variante="green">Con actas</Badge>
                  ) : (
                    <Badge variante="amber">Sin actas</Badge>
                  )}
                </td>
              </tr>
            ))}
            {filas.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                  No hay instituciones registradas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
