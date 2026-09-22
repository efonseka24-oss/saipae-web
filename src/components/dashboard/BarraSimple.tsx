import { claseTailwindPorcentaje } from "@/lib/colorFavorabilidad";

const PALETA = ["bg-blue-600", "bg-sky-500", "bg-emerald-600", "bg-amber-600", "bg-red-600", "bg-violet-600", "bg-cyan-600", "bg-slate-500"];

export type DatoBarra = { etiqueta: string; valor: number; sufijo?: string; notaSecundaria?: string; color?: string };

function BarraSimple({ etiqueta, valor, sufijo, notaSecundaria, color, max }: DatoBarra & { max: number }) {
  const pct = max > 0 ? Math.max(valor > 0 ? 3 : 0, Math.round((valor / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        <span className="truncate text-slate-700">{etiqueta}</span>
        <span className="shrink-0 font-semibold text-slate-900">
          {valor}
          {sufijo}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color ?? "bg-blue-600"}`} style={{ width: `${pct}%` }} />
      </div>
      {notaSecundaria && <p className="mt-0.5 text-xs text-slate-400">{notaSecundaria}</p>}
    </div>
  );
}

// Grupo de barras horizontales, todas a escala del mismo máximo (el mayor
// valor del grupo), con colores cíclicos de la paleta si no se especifica uno.
export function GrupoBarras({ datos, textoVacio = "Sin datos registrados." }: { datos: DatoBarra[]; textoVacio?: string }) {
  if (datos.length === 0) return <p className="text-sm text-slate-400">{textoVacio}</p>;
  const max = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <div className="space-y-3">
      {datos.map((d, i) => (
        <BarraSimple key={d.etiqueta} {...d} color={d.color ?? PALETA[i % PALETA.length]} max={max} />
      ))}
    </div>
  );
}

export type DatoFavorabilidad = { etiqueta: string; porcentaje: number | null };

// Barra de favorabilidad/cumplimiento: a diferencia de GrupoBarras (que
// escala cada barra contra el máximo del grupo), aquí cada barra se escala
// siempre contra 100% y se colorea por umbral (verde/azul/naranja/rojo), no
// con la paleta cíclica — así el color siempre refleja qué tan buena es esa
// cifra, sin importar los demás esquemas del grupo.
export function GrupoBarrasFavorabilidad({ datos, textoVacio = "Sin datos registrados." }: { datos: DatoFavorabilidad[]; textoVacio?: string }) {
  if (datos.length === 0) return <p className="text-sm text-slate-400">{textoVacio}</p>;
  return (
    <div className="space-y-3">
      {datos.map((d) =>
        d.porcentaje === null ? (
          <div key={d.etiqueta} className="flex items-baseline justify-between text-sm">
            <span className="text-slate-700">{d.etiqueta}</span>
            <span className="text-xs italic text-slate-400">Sin datos de cumplimiento</span>
          </div>
        ) : (
          <BarraSimple
            key={d.etiqueta}
            etiqueta={d.etiqueta}
            valor={d.porcentaje}
            sufijo="%"
            color={claseTailwindPorcentaje(d.porcentaje)}
            max={100}
          />
        )
      )}
    </div>
  );
}
