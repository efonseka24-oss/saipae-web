export type Lote = { id: string; nombre: string };
export type Zode = { id: string; nombre: string; loteId: string };
export type Municipio = { id: string; nombre: string; zodeId: string };
export type Operador = { id: string; nombreRazonSocial: string; zodeId: string };

export type DetalleCompra = {
  id: string;
  orden: number;
  producto: string;
  cantidad: number;
  unidad: string;
  valorUnitario: number;
};

export type CompraLocal = {
  id: string;
  zodeId: string;
  zode: { id: string; nombre: string; lote: { id: string; nombre: string } };
  municipioId: string;
  municipio: { id: string; nombre: string };
  operadorId: string | null;
  operador: { id: string; nombreRazonSocial: string } | null;
  fechaCompra: string | Date;
  proveedorNombre: string;
  proveedorDocumento: string;
  tipoProveedor: string;
  numeroFactura: string | null;
  observaciones: string | null;
  archivoUrl: string | null;
  archivoNombre: string | null;
  detalles: DetalleCompra[];
};
