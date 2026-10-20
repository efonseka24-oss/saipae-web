"use client";

import { useRef, useState } from "react";
import { X, FileText, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  TIPOS_PROVEEDOR,
  ETIQUETAS_TIPO_PROVEEDOR,
  UNIDADES_COMPRA,
  MAXIMO_DETALLES_COMPRA,
  formatearPesos,
  type DetalleCompraEntrada,
} from "@/lib/comprasLocales";
import type { Lote, Zode, Municipio, Operador, CompraLocal } from "@/components/compras-locales/tipos";

const CLASE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400";

const FILA_VACIA: DetalleCompraEntrada = { producto: "", cantidad: "", unidad: "kg", valorUnitario: "" };

function numero(texto: string): number {
  const t = texto.replace(/\s/g, "");
  return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t) || 0;
}

export function CompraLocalFormulario({
  titulo,
  lotes,
  zodes,
  municipios,
  operadores,
  valoresIniciales,
  onGuardar,
  onCancelar,
}: {
  titulo: string;
  lotes: Lote[];
  zodes: Zode[];
  municipios: Municipio[];
  operadores: Operador[];
  valoresIniciales?: CompraLocal;
  onGuardar: (formData: FormData) => Promise<string | null>;
  onCancelar: () => void;
}) {
  const [zodeId, setZodeId] = useState(valoresIniciales?.zodeId ?? "");
  const [municipioId, setMunicipioId] = useState(valoresIniciales?.municipioId ?? "");
  const [operadorId, setOperadorId] = useState(valoresIniciales?.operadorId ?? "");
  const [fechaCompra, setFechaCompra] = useState(
    valoresIniciales ? new Date(valoresIniciales.fechaCompra).toISOString().slice(0, 10) : ""
  );
  const [proveedorNombre, setProveedorNombre] = useState(valoresIniciales?.proveedorNombre ?? "");
  const [proveedorDocumento, setProveedorDocumento] = useState(valoresIniciales?.proveedorDocumento ?? "");
  const [tipoProveedor, setTipoProveedor] = useState<string>(valoresIniciales?.tipoProveedor ?? "");
  const [numeroFactura, setNumeroFactura] = useState(valoresIniciales?.numeroFactura ?? "");
  const [observaciones, setObservaciones] = useState(valoresIniciales?.observaciones ?? "");
  const [detalles, setDetalles] = useState<DetalleCompraEntrada[]>(() =>
    valoresIniciales?.detalles.length
      ? valoresIniciales.detalles.map((d) => ({
          producto: d.producto,
          cantidad: String(d.cantidad),
          unidad: d.unidad,
          valorUnitario: String(d.valorUnitario),
        }))
      : [{ ...FILA_VACIA }]
  );
  const [quitarSoporte, setQuitarSoporte] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  const municipiosFiltrados = municipios.filter((m) => m.zodeId === zodeId);
  const operadoresDelZode = operadores.filter((o) => o.zodeId === zodeId);
  const loteDelZode = lotes.find((l) => l.id === zodes.find((z) => z.id === zodeId)?.loteId);
  const total = detalles.reduce((suma, d) => suma + numero(d.cantidad) * numero(d.valorUnitario), 0);

  function actualizarDetalle(indice: number, campo: keyof DetalleCompraEntrada, valor: string) {
    setDetalles((anterior) => anterior.map((fila, i) => (i === indice ? { ...fila, [campo]: valor } : fila)));
  }

  async function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);

    const formData = new FormData();
    formData.append("zodeId", zodeId);
    formData.append("municipioId", municipioId);
    formData.append("operadorId", operadorId);
    formData.append("fechaCompra", fechaCompra);
    formData.append("proveedorNombre", proveedorNombre);
    formData.append("proveedorDocumento", proveedorDocumento);
    formData.append("tipoProveedor", tipoProveedor);
    formData.append("numeroFactura", numeroFactura);
    formData.append("observaciones", observaciones);
    formData.append("detalles", JSON.stringify(detalles));
    if (quitarSoporte) formData.append("quitarSoporte", "1");
    const archivo = inputArchivoRef.current?.files?.[0];
    if (archivo) formData.append("archivo", archivo);

    const mensajeError = await onGuardar(formData);
    setGuardando(false);
    if (mensajeError) setError(mensajeError);
  }

  return (
    <Card className="max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">{titulo}</h2>
        <button onClick={onCancelar} className="text-slate-400 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={manejarEnvio} className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Zode</label>
            <select
              value={zodeId}
              onChange={(e) => {
                setZodeId(e.target.value);
                setMunicipioId("");
                const delZode = operadores.filter((o) => o.zodeId === e.target.value);
                setOperadorId(delZode.length === 1 ? delZode[0].id : "");
              }}
              required
              className={CLASE_CAMPO}
            >
              <option value="">Selecciona...</option>
              {zodes.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                </option>
              ))}
            </select>
            {loteDelZode && <p className="mt-1 text-xs text-slate-500">Lote: {loteDelZode.nombre}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Municipio</label>
            <select value={municipioId} onChange={(e) => setMunicipioId(e.target.value)} required disabled={!zodeId} className={CLASE_CAMPO}>
              <option value="">Selecciona...</option>
              {municipiosFiltrados.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Operador que compra</label>
            <select value={operadorId} onChange={(e) => setOperadorId(e.target.value)} disabled={!zodeId} className={CLASE_CAMPO}>
              <option value="">Sin operador</option>
              {operadoresDelZode.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombreRazonSocial}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha de compra</label>
            <input type="date" value={fechaCompra} onChange={(e) => setFechaCompra(e.target.value)} required className={CLASE_CAMPO} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Proveedor (nombre o razón social)</label>
            <input value={proveedorNombre} onChange={(e) => setProveedorNombre(e.target.value)} required className={CLASE_CAMPO} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Documento / NIT del proveedor</label>
            <input value={proveedorDocumento} onChange={(e) => setProveedorDocumento(e.target.value)} required className={CLASE_CAMPO} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Tipo de proveedor</label>
            <select value={tipoProveedor} onChange={(e) => setTipoProveedor(e.target.value)} required className={CLASE_CAMPO}>
              <option value="">Selecciona...</option>
              {TIPOS_PROVEEDOR.map((t) => (
                <option key={t} value={t}>
                  {ETIQUETAS_TIPO_PROVEEDOR[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">N.º de factura (opcional)</label>
            <input value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} className={CLASE_CAMPO} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Materia prima comprada</label>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-2 py-2">Producto</th>
                  <th className="w-28 px-2 py-2">Cantidad</th>
                  <th className="w-32 px-2 py-2">Unidad</th>
                  <th className="w-36 px-2 py-2">Valor unitario</th>
                  <th className="w-32 px-2 py-2 text-right">Subtotal</th>
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {detalles.map((d, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-2 py-1.5">
                      <input value={d.producto} onChange={(e) => actualizarDetalle(i, "producto", e.target.value)} placeholder="Ej. Papa pastusa" className={CLASE_CAMPO} />
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={d.cantidad} onChange={(e) => actualizarDetalle(i, "cantidad", e.target.value)} inputMode="decimal" className={CLASE_CAMPO} />
                    </td>
                    <td className="px-2 py-1.5">
                      <select value={d.unidad} onChange={(e) => actualizarDetalle(i, "unidad", e.target.value)} className={CLASE_CAMPO}>
                        {UNIDADES_COMPRA.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input value={d.valorUnitario} onChange={(e) => actualizarDetalle(i, "valorUnitario", e.target.value)} inputMode="decimal" className={CLASE_CAMPO} />
                    </td>
                    <td className="px-2 py-1.5 text-right text-slate-600">{formatearPesos(numero(d.cantidad) * numero(d.valorUnitario))}</td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => setDetalles((anterior) => (anterior.length > 1 ? anterior.filter((_, j) => j !== i) : [{ ...FILA_VACIA }]))}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td colSpan={4} className="px-2 py-2">
                    {detalles.length < MAXIMO_DETALLES_COMPRA && (
                      <button
                        type="button"
                        onClick={() => setDetalles((anterior) => [...anterior, { ...FILA_VACIA }])}
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        <Plus className="h-4 w-4" /> Agregar producto
                      </button>
                    )}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-slate-900">{formatearPesos(total)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Observaciones</label>
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} className={CLASE_CAMPO} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Factura o soporte (PDF, JPG o PNG, opcional)</label>
          {valoresIniciales?.archivoUrl && !quitarSoporte && (
            <div className="mb-2 flex items-center gap-3 text-sm">
              <a href={valoresIniciales.archivoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700">
                <FileText className="h-4 w-4" /> Ver soporte actual ({valoresIniciales.archivoNombre})
              </a>
              <button type="button" onClick={() => setQuitarSoporte(true)} className="text-xs text-red-600 hover:text-red-700">
                Quitar
              </button>
            </div>
          )}
          <input
            ref={inputArchivoRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
        </div>

        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
        <Button type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : "Guardar compra"}
        </Button>
      </form>
    </Card>
  );
}
