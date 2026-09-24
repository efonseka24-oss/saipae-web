"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { BotonesMover } from "@/components/ui/BotonesMover";

type Modulo = {
  id: string;
  esquemaId: string;
  nombre: string;
  descripcion: string | null;
  _count: { preguntas: number };
};

export function FilaModulo({ modulo, esPrimero, esUltimo }: { modulo: Modulo; esPrimero: boolean; esUltimo: boolean }) {
  const router = useRouter();
  const [moviendo, setMoviendo] = useState(false);

  async function mover(direccion: "arriba" | "abajo") {
    setMoviendo(true);
    await fetch(`/api/modulos/${modulo.id}/mover`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direccion }),
    });
    setMoviendo(false);
    router.refresh();
  }
  const [editando, setEditando] = useState(false);
  const [nombre, setNombre] = useState(modulo.nombre);
  const [descripcion, setDescripcion] = useState(modulo.descripcion ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    const respuesta = await fetch(`/api/modulos/${modulo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, descripcion }),
    });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      setError(datos.error ?? "No se pudo guardar.");
      setGuardando(false);
      return;
    }
    setGuardando(false);
    setEditando(false);
    router.refresh();
  }

  async function eliminar() {
    if (!confirm(`¿Eliminar el módulo "${modulo.nombre}" y todas sus preguntas?`)) return;
    await fetch(`/api/modulos/${modulo.id}`, { method: "DELETE" });
    router.refresh();
  }

  if (editando) {
    return (
      <tr className="border-b border-slate-100 bg-slate-50 last:border-0">
        <td className="py-2 pr-4">
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="py-2 pr-4">
          <input
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="py-2 pr-4">
          <Badge variante={modulo._count.preguntas > 0 ? "green" : "amber"}>
            {modulo._count.preguntas} pregunta(s)
          </Badge>
        </td>
        <td className="py-2 pr-4">
          {error && <p className="mb-1 text-xs font-medium text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={guardar} disabled={guardando} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50" title="Guardar">
              <Check className="h-4 w-4" />
            </button>
            <button onClick={() => setEditando(false)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" title="Cancelar">
              <X className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 pr-4 font-medium text-slate-900">
        <Link href={`/esquemas/${modulo.esquemaId}/modulos/${modulo.id}/preguntas`} className="hover:text-blue-600">
          {modulo.nombre}
        </Link>
      </td>
      <td className="py-3 pr-4 text-slate-600">{modulo.descripcion ?? "—"}</td>
      <td className="py-3 pr-4">
        <Badge variante={modulo._count.preguntas > 0 ? "green" : "amber"}>
          {modulo._count.preguntas} pregunta(s)
        </Badge>
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-2">
          <BotonesMover onMover={mover} esPrimero={esPrimero} esUltimo={esUltimo} ocupado={moviendo} />
          <button onClick={() => setEditando(true)} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600" title="Editar">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={eliminar} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Eliminar">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
