import { TIPOS_RACION_PAE, ETIQUETAS_TIPO_RACION_PAE } from "@/lib/racionesPae";

// Checkboxes de RPS/RI/CCT: puede tener cualquier combinación de las 3, así
// que no es un <select>. Se usa igual en Instituciones y Sedes.
export function SelectorTiposRacion({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  function alternar(tipo: string) {
    onChange(value.includes(tipo) ? value.filter((t) => t !== tipo) : [...value, tipo]);
  }

  return (
    <div className="flex gap-4">
      {TIPOS_RACION_PAE.map((tipo) => (
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
