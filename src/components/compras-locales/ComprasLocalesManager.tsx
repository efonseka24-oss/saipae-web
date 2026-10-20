"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FiltroUbicacion, FILTRO_UBICACION_VACIO, type ValorFiltroUbicacion } from "@/components/shared/FiltroUbicacion";
import { CompraLocalFormulario } from "@/components/compras-locales/CompraLocalFormulario";
import { ETIQUETAS_TIPO_PROVEEDOR, formatearPesos, valorTotalCompra, type TipoProveedor } from "@/lib/comprasLocales";
import type { Lote, Zode, Municipio, Operador, CompraLocal } from "@/components/compras-locales/tipos";

// La fecha de compra es un día (sin hora): se muestra en UTC para que no se corra un día.
function formatearFecha(fecha: string | Date): string {
  return new Date(fecha).toLocaleDateString("es-CO", { dateStyle: "medium", timeZone: "UTC" });
}

type Modo = { tipo: "cerrado" } | { tipo: "crear" } | { tipo: "editar"; compra: CompraLocal };

export function ComprasLocalesManager({
  compras,
  lotes,
  zodes,
  municipios,
  operadores,
}: {
  compras: CompraLocal[];
  lotes: Lote[];
  zodes: Zode[];
  municipios: Municipio[];
  operadores: Operador[];
}) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>({ tipo: "cerrado" });
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<ValorFiltroUbicacion>(FILTRO_UBICACION_VACIO);
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const comprasFiltradas = compras.filter((c) => {
    const dia = new Date(c.fechaCompra).toISOString().slice(0, 10);
    return (
      (!filtro.loteId || c.zode.lote.id === filtro.loteId) &&
      (!filtro.zodeId || c.zodeId === filtro.zodeId) &&
      (!filtro.municipioId || c.municipioId === filtro.municipioId) &&
      (!desde || dia >= desde) &&
      (!hasta || dia <= hasta)
    );
  });
  const totalFiltrado = comprasFiltradas.reduce((suma, c) => suma + valorTotalCompra(c.detalles), 0);

  async function guardar(url: string, metodo: "POST" | "PATCH", formData: FormData): Promise<string | null> {
    const respuesta = await fetch(url, { method: metodo, body: formData });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      return datos.error ?? "No se pudo guardar.";
    }
    setModo({ tipo: "cerrado" });
    router.refresh();
    return null;
  }

  async function eliminar(compra: CompraLocal) {
    if (!confirm(`¿Eliminar la compra a "${compra.proveedorNombre}"?`)) return;
    const respuesta = await fetch(`/api/compras-locales/${compra.id}`, { method: "DELETE" });
    if (!respuesta.ok) {
      const datos = await respuesta.json();
      alert(datos.error ?? "No se pudo eliminar.");
      return;
    }
    router.refresh();
  }

  if (zodes.length === 0 || municipios.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-500">
          Primero completa el catálogo (zode y municipio) en{" "}
          <a href="/registro" className="font-medium text-blue-600 hover:text-blue-700">
            Registro
          </a>
          .
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {modo.tipo === "crear" && (
        <CompraLocalFormulario
          titulo="Nueva compra local"
          lotes={lotes}
          zodes={zodes}
          municipios={municipios}
          operadores={operadores}
          onGuardar={(formData) => guardar("/api/compras-locales", "POST", formData)}
          onCancelar={() => setModo({ tipo: "cerrado" })}
        />
      )}
      {modo.tipo === "editar" && (
        <CompraLocalFormulario
          key={modo.compra.id}
          titulo="Editar compra local"
          lotes={lotes}
          zodes={zodes}
          municipios={municipios}
          operadores={operadores}
          valoresIniciales={modo.compra}
          onGuardar={(formData) => guardar(`/api/compras-locales/${modo.compra.id}`, "PATCH", formData)}
          onCancelar={() => setModo({ tipo: "cerrado" })}
        />
      )}
      {modo.tipo === "cerrado" && (
        <Button onClick={() => setModo({ tipo: "crear" })}>
          <Plus className="h-4 w-4" />
          Nueva compra
        </Button>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Compras registradas</CardTitle>
          <div className="flex gap-2">
            <Badge variante="slate">{comprasFiltradas.length} compra(s)</Badge>
            <Badge variante="green">Total {formatearPesos(totalFiltrado)}</Badge>
          </div>
        </CardHeader>
        <FiltroUbicacion
          lotes={lotes}
          zodes={zodes}
          municipios={municipios}
          mostrarInstitucion={false}
          value={filtro}
          onChange={setFiltro}
        />
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Desde</label>
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Hasta</label>
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Proveedor</th>
                <th className="py-2 pr-4">Tipo de proveedor</th>
                <th className="py-2 pr-4">Ubicación</th>
                <th className="py-2 pr-4">Operador</th>
                <th className="py-2 pr-4">Productos</th>
                <th className="py-2 pr-4 text-right">Valor total</th>
                <th className="py-2 pr-4">Soporte</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {comprasFiltradas.map((c) => {
                const expandido = expandidoId === c.id;
                return (
                  <Fragment key={c.id}>
                    <tr className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4 text-slate-600">{formatearFecha(c.fechaCompra)}</td>
                      <td className="py-3 pr-4">
                        <p className="font-medium text-slate-900">{c.proveedorNombre}</p>
                        <p className="text-xs text-slate-500">
                          {c.proveedorDocumento}
                          {c.numeroFactura ? ` · Factura ${c.numeroFactura}` : ""}
                        </p>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{ETIQUETAS_TIPO_PROVEEDOR[c.tipoProveedor as TipoProveedor] ?? c.tipoProveedor}</td>
                      <td className="py-3 pr-4 text-slate-600">
                        {c.municipio.nombre} — {c.zode.nombre}
                        <br />
                        <span className="text-xs text-slate-400">{c.zode.lote.nombre}</span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{c.operador?.nombreRazonSocial ?? "—"}</td>
                      <td className="py-3 pr-4">
                        <button
                          onClick={() => setExpandidoId(expandido ? null : c.id)}
                          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-blue-600"
                        >
                          {expandido ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          {c.detalles.length}
                        </button>
                      </td>
                      <td className="py-3 pr-4 text-right font-medium text-slate-900">{formatearPesos(valorTotalCompra(c.detalles))}</td>
                      <td className="py-3 pr-4">
                        {c.archivoUrl ? (
                          <a
                            href={c.archivoUrl}
                            target="_blank"
                            rel="noreferrer"
                            title={c.archivoNombre ?? undefined}
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            <FileText className="h-4 w-4" /> Ver
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setModo({ tipo: "editar", compra: c })}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => eliminar(c)} className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandido && (
                      <tr className="border-b border-slate-100 bg-slate-50 last:border-0">
                        <td colSpan={9} className="py-3 pr-4 pl-8">
                          <table className="w-full max-w-2xl text-left text-xs">
                            <thead>
                              <tr className="text-slate-500">
                                <th className="py-1 pr-3 font-semibold uppercase tracking-wide">Producto</th>
                                <th className="py-1 pr-3 font-semibold uppercase tracking-wide">Cantidad</th>
                                <th className="py-1 pr-3 font-semibold uppercase tracking-wide">Valor unitario</th>
                                <th className="py-1 pr-3 text-right font-semibold uppercase tracking-wide">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {c.detalles.map((d) => (
                                <tr key={d.id}>
                                  <td className="py-1 pr-3 text-slate-700">{d.producto}</td>
                                  <td className="py-1 pr-3 text-slate-700">
                                    {d.cantidad.toLocaleString("es-CO")} {d.unidad}
                                  </td>
                                  <td className="py-1 pr-3 text-slate-700">{formatearPesos(d.valorUnitario)}</td>
                                  <td className="py-1 pr-3 text-right text-slate-700">{formatearPesos(d.cantidad * d.valorUnitario)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {c.observaciones && <p className="mt-2 text-xs text-slate-500">Observaciones: {c.observaciones}</p>}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {comprasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-slate-400">
                    {compras.length === 0 ? "No hay compras registradas todavía." : "Ninguna compra coincide con el filtro."}
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
