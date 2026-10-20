// Módulo Compras Locales: compras de materia prima a proveedores locales.
// Cada compra (proveedor, fecha, lugar, factura) tiene sus líneas de
// producto; el valor total no se guarda, se calcula de las líneas.

export const TIPOS_PROVEEDOR = ["PEQUENO_PRODUCTOR", "ECONOMIA_CAMPESINA", "ORGANIZACION_PRODUCTORES", "OTRO"] as const;
export type TipoProveedor = (typeof TIPOS_PROVEEDOR)[number];

export const ETIQUETAS_TIPO_PROVEEDOR: Record<TipoProveedor, string> = {
  PEQUENO_PRODUCTOR: "Pequeño productor agropecuario",
  ECONOMIA_CAMPESINA: "Economía campesina, familiar y comunitaria",
  ORGANIZACION_PRODUCTORES: "Organización de productores",
  OTRO: "Otro proveedor local",
};

export function esTipoProveedor(valor: string): valor is TipoProveedor {
  return (TIPOS_PROVEEDOR as readonly string[]).includes(valor);
}

export const UNIDADES_COMPRA = ["kg", "g", "lb", "L", "ml", "unidad", "docena", "atado", "bulto", "canasta"] as const;

// Máximo de líneas de producto por compra.
export const MAXIMO_DETALLES_COMPRA = 40;

export type DetalleCompraEntrada = {
  producto: string;
  cantidad: string;
  unidad: string;
  valorUnitario: string;
};

export function valorTotalCompra(detalles: { cantidad: number; valorUnitario: number }[]): number {
  return detalles.reduce((suma, d) => suma + d.cantidad * d.valorUnitario, 0);
}

export function formatearPesos(valor: number): string {
  return valor.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}
