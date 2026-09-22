"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ETIQUETAS_ESTADO_VISITA, type EstadoVisita } from "@/lib/visitas";
import type { CadenaResuelta } from "@/lib/estadisticasEncuestas";
import { FiltroUbicacion, FILTRO_UBICACION_VACIO, type ValorFiltroUbicacion, type ItemLote, type ItemZode, type ItemMunicipio, type ItemInstitucion } from "@/components/shared/FiltroUbicacion";

type Visita = {
  id: string;
  fecha: string | Date;
  operador: string | null;
  municipio: string | null;
  estado: string;
  esquema: { nombre: string };
  cadena: CadenaResuelta | null;
};

function formatearFecha(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString("es-CO", { dateStyle: "medium" });
}

export function TablaVisitas({
  visitas,
  lotes,
  zodes,
  municipios,
  instituciones,
}: {
  visitas: Visita[];
  lotes: ItemLote[];
  zodes: ItemZode[];
  municipios: ItemMunicipio[];
  instituciones: ItemInstitucion[];
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<ValorFiltroUbicacion>(FILTRO_UBICACION_VACIO);

  // Visita solo guarda texto plano (no ids), así que se compara por nombre:
  // se busca el nombre del id elegido en el catálogo y se compara contra la
  // cadena ya resuelta de cada visita (ver resolverCadenaVisita).
  const nombreLote = lotes.find((l) => l.id === filtro.loteId)?.nombre;
  const nombreZode = zodes.find((z) => z.id === filtro.zodeId)?.nombre;
  const nombreMunicipio = municipios.find((m) => m.id === filtro.municipioId)?.nombre;
  const nombreInstitucion = instituciones.find((i) => i.id === filtro.institucionId)?.nombre;

  const visitasFiltradas = visitas.filter(
    (v) =>
      (!nombreLote || v.cadena?.lote === nombreLote) &&
      (!nombreZode || v.cadena?.zode === nombreZode) &&
      (!nombreMunicipio || v.cadena?.municipio === nombreMunicipio) &&
      (!nombreInstitucion || v.cadena?.institucion === nombreInstitucion)
  );

  async function eliminar(id: string, esquemaNombre: string, fecha: string | Date) {
    if (!confirm(`¿Eliminar la visita de ${esquemaNombre} del ${formatearFecha(fecha)}? Se perderán sus respuestas.`)) return;
    await fetch(`/api/visitas/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <FiltroUbicacion lotes={lotes} zodes={zodes} municipios={municipios} instituciones={instituciones} value={filtro} onChange={setFiltro} />
      <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-4">Esquema</th>
            <th className="py-2 pr-4">Fecha</th>
            <th className="py-2 pr-4">Operador</th>
            <th className="py-2 pr-4">Municipio</th>
            <th className="py-2 pr-4">Estado</th>
            <th className="py-2 pr-4">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {visitasFiltradas.map((v) => (
            <tr key={v.id} className="border-b border-slate-100 last:border-0">
              <td className="py-3 pr-4 font-medium text-slate-900">
                <Link href={`/tabulacion/${v.id}`} className="hover:text-blue-600">
                  {v.esquema.nombre}
                </Link>
              </td>
              <td className="py-3 pr-4 text-slate-600">{formatearFecha(v.fecha)}</td>
              <td className="py-3 pr-4 text-slate-600">{v.operador ?? "—"}</td>
              <td className="py-3 pr-4 text-slate-600">{v.municipio ?? "—"}</td>
              <td className="py-3 pr-4">
                <Badge variante={v.estado === "FINALIZADA" ? "green" : "amber"}>
                  {ETIQUETAS_ESTADO_VISITA[v.estado as EstadoVisita] ?? v.estado}
                </Badge>
              </td>
              <td className="py-3 pr-4">
                <div className="flex gap-2">
                  <Link
                    href={`/tabulacion/${v.id}`}
                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => eliminar(v.id, v.esquema.nombre, v.fecha)}
                    className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {visitasFiltradas.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-sm text-slate-400">
                {visitas.length === 0 ? "No hay visitas registradas todavía." : "Ninguna visita coincide con el filtro."}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
}
