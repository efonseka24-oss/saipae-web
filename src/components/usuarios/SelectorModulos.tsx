import { MODULOS, type ModuloId } from "@/lib/modulos";

// Grid de checkboxes para elegir qué módulos del panel puede ver un usuario.
export function SelectorModulos({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  function alternar(moduloId: ModuloId) {
    onChange(value.includes(moduloId) ? value.filter((m) => m !== moduloId) : [...value, moduloId]);
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
      {MODULOS.map((modulo) => (
        <label key={modulo.id} className="flex items-center gap-1.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={value.includes(modulo.id)}
            onChange={() => alternar(modulo.id)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          {modulo.etiqueta}
        </label>
      ))}
    </div>
  );
}
