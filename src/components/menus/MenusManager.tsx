"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { MenuFormulario, type DatosFormularioMenu } from "@/components/menus/MenuFormulario";
import type { LoteMenu, MenuPae } from "@/components/menus/tipos";

type Modo = { tipo: "cerrado" } | { tipo: "crear" } | { tipo: "editar"; menu: MenuPae };

const CLASE_FILTRO =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export function MenusManager({ menus, lotes }: { menus: MenuPae[]; lotes: LoteMenu[] }) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>({ tipo: "cerrado" });
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [filtroLote, setFiltroLote] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"" | "general" | "etnico">("");

  const menusFiltrados = menus.filter(
    (m) =>
      (!filtroLote || m.loteId === filtroLote) &&
      (!filtroTipo || (filtroTipo === "etnico" ? m.especialEtnico : !m.especialEtnico))
  );

  async function guardar(url: string, metodo: "POST" | "PATCH", datos: DatosFormularioMenu): Promise<string | null> {
    const respuesta = await fetch(url, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json();
      return cuerpo.error ?? "No se pudo guardar el menú.";
    }
    setModo({ tipo: "cerrado" });
    router.refresh();
    return null;
  }

  async function eliminar(menu: MenuPae) {
    if (!confirm(`¿Eliminar el menú ${menu.numero} del lote ${menu.lote.nombre}?`)) return;
    const respuesta = await fetch(`/api/menus/${menu.id}`, { method: "DELETE" });
    if (!respuesta.ok) {
      const cuerpo = await respuesta.json();
      alert(cuerpo.error ?? "No se pudo eliminar.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Menús</h2>
          <p className="mt-1 text-sm text-slate-500">
            Menús del PAE por lote, con sus alimentos, unidad de medida y cantidad. Marca los que son especiales para comunidades negras o
            étnicas.
          </p>
        </div>
        {modo.tipo === "cerrado" && (
          <Button onClick={() => setModo({ tipo: "crear" })} disabled={lotes.length === 0}>
            <Plus className="h-4 w-4" />
            Nuevo menú
          </Button>
        )}
      </div>

      {lotes.length === 0 && (
        <Card>
          <p className="text-sm text-slate-500">
            Primero crea los lotes en{" "}
            <a href="/registro" className="font-medium text-blue-600 hover:text-blue-700">
              Registro
            </a>
            .
          </p>
        </Card>
      )}

      {modo.tipo === "crear" && (
        <MenuFormulario
          titulo="Nuevo menú"
          lotes={lotes}
          onGuardar={(datos) => guardar("/api/menus", "POST", datos)}
          onCancelar={() => setModo({ tipo: "cerrado" })}
        />
      )}
      {modo.tipo === "editar" && (
        <MenuFormulario
          key={modo.menu.id}
          titulo={`Editar menú ${modo.menu.numero}`}
          lotes={lotes}
          valoresIniciales={modo.menu}
          onGuardar={(datos) => guardar(`/api/menus/${modo.menu.id}`, "PATCH", datos)}
          onCancelar={() => setModo({ tipo: "cerrado" })}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Menús registrados</CardTitle>
          <Badge variante="slate">{menusFiltrados.length} menú(s)</Badge>
        </CardHeader>
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Lote</label>
            <select value={filtroLote} onChange={(e) => setFiltroLote(e.target.value)} className={CLASE_FILTRO}>
              <option value="">Todos</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Tipo de menú</label>
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value as typeof filtroTipo)} className={CLASE_FILTRO}>
              <option value="">Todos</option>
              <option value="general">General</option>
              <option value="etnico">Especial étnico</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Número</th>
                <th className="py-2 pr-4">Lote</th>
                <th className="py-2 pr-4">Tipo de menú</th>
                <th className="py-2 pr-4">Alimentos</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {menusFiltrados.map((m) => {
                const expandido = expandidoId === m.id;
                return (
                  <Fragment key={m.id}>
                    <tr className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4 font-semibold text-slate-900">Menú {m.numero}</td>
                      <td className="py-3 pr-4 text-slate-600">
                        {m.lote.nombre}
                        <br />
                        <span className="text-xs text-slate-400">{m.lote.departamento.nombre}</span>
                      </td>
                      <td className="py-3 pr-4">
                        {m.especialEtnico ? <Badge variante="amber">Especial étnico</Badge> : <Badge variante="slate">General</Badge>}
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => setExpandidoId(expandido ? null : m.id)}
                          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600"
                        >
                          {expandido ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {m.detalles.length} alimento(s)
                        </button>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setModo({ tipo: "editar", menu: m })}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => eliminar(m)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandido && (
                      <tr className="border-b border-slate-100 bg-slate-50 last:border-0">
                        <td colSpan={5} className="py-3 pr-4 pl-8">
                          <table className="w-full max-w-2xl text-left text-xs">
                            <thead>
                              <tr className="text-slate-500">
                                <th className="py-1 pr-3 font-semibold uppercase tracking-wide">Tipo de alimento</th>
                                <th className="py-1 pr-3 font-semibold uppercase tracking-wide">Alimento</th>
                                <th className="py-1 pr-3 font-semibold uppercase tracking-wide">Cantidad</th>
                              </tr>
                            </thead>
                            <tbody>
                              {m.detalles.map((d) => (
                                <tr key={d.id}>
                                  <td className="py-1 pr-3 text-slate-700">{d.tipoAlimento}</td>
                                  <td className="py-1 pr-3 text-slate-700">{d.nombreAlimento}</td>
                                  <td className="py-1 pr-3 text-slate-700">
                                    {d.cantidad.toLocaleString("es-CO")} {d.unidad}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {menusFiltrados.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                    {menus.length === 0 ? "No hay menús registrados todavía." : "Ningún menú coincide con el filtro."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
