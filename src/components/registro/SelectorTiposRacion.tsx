import { TIPOS_RACION_PAE, ETIQUETAS_TIPO_RACION_PAE } from "@/lib/racionesPae";

// Checkboxes de RPS/RI/CCT: puede tener cualquier combinación de las 3, así
// que no es un <select>. Se usa igual en Instituciones y Sedes. En Sedes se
// pasa `permitidos` (las raciones de su institución): solo esas se muestran.
export function SelectorTiposRacion({
  value,
  onChange,
  permitidos,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  permitidos?: string[];
}) {
  const visibles = permitidos ? TIPOS_RACION_PAE.filter((t) => permitidos.includes(t)) : TIPOS_RACION_PAE;
  if (permitidos && visibles.length === 0) {
    return <p className="text-xs text-slate-500">La institución no tiene raciones marcadas.</p>;
  }

  function alternar(tipo: string) {
    onChange(value.includes(tipo) ? value.filter((t) => t !== tipo) : [...value, tipo]);
  }

  return (
    <div className="flex gap-4">
      {visibles.map((tipo) => (
        <label key={tipo} className="flex items-center gap-1.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={value.includes(tipo)}
            onChange={() => alternar(tipo)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          {ETIQUETAS_TIPO_RACION_PAE[tipo]}
        </label>
      ))}
    </div>
  );
}
