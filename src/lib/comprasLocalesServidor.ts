// Validación y archivos de Compras Locales (solo servidor: usa la base y el disco).
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { esTipoProveedor, MAXIMO_DETALLES_COMPRA } from "@/lib/comprasLocales";
import { leerNumero } from "@/lib/numeros";

const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024; // 20 MB
const TIPOS_ARCHIVO_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png"];
const EXTENSIONES_PERMITIDAS = [".pdf", ".jpg", ".jpeg", ".png"];
const CARPETA = path.join(process.cwd(), "public", "uploads", "compras-locales");

export const INCLUIR_COMPRA_LOCAL = {
  zode: { select: { id: true, nombre: true, lote: { select: { id: true, nombre: true } } } },
  municipio: { select: { id: true, nombre: true } },
  operador: { select: { id: true, nombreRazonSocial: true } },
  detalles: { orderBy: { orden: "asc" } },
} as const;

type DetalleValidado = { orden: number; producto: string; cantidad: number; unidad: string; valorUnitario: number };

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

function numero(valor: unknown): number {
  return leerNumero(texto(valor));
}

function parsearDetalles(bruto: FormDataEntryValue | null): { error: string } | { detalles: DetalleValidado[] } {
  let lista: unknown;
  try {
    lista = JSON.parse(typeof bruto === "string" ? bruto : "[]");
  } catch {
    return { error: "Los productos de la compra no tienen un formato válido." };
  }
  if (!Array.isArray(lista) || lista.length > MAXIMO_DETALLES_COMPRA) {
    return { error: "Los productos de la compra no tienen un formato válido." };
  }

  const detalles: DetalleValidado[] = [];
  for (let indice = 0; indice < lista.length; indice++) {
    const fila = (lista[indice] ?? {}) as Record<string, unknown>;
    const producto = texto(fila.producto);
    const unidad = texto(fila.unidad);
    if (!producto && !texto(fila.cantidad) && !texto(fila.valorUnitario)) continue;

    const cantidad = numero(fila.cantidad);
    const valorUnitario = numero(fila.valorUnitario);
    if (!producto) return { error: `Escribe el producto de la línea ${indice + 1}.` };
    if (!(cantidad > 0)) return { error: `La cantidad de la línea ${indice + 1} debe ser un número mayor que cero.` };
    if (!unidad) return { error: `Selecciona la unidad de la línea ${indice + 1}.` };
    if (!(valorUnitario >= 0)) return { error: `El valor unitario de la línea ${indice + 1} debe ser un número.` };

    detalles.push({ orden: detalles.length + 1, producto, cantidad, unidad, valorUnitario });
  }
  if (detalles.length === 0) return { error: "Agrega al menos un producto comprado." };
  return { detalles };
}

export async function validarCompraLocal(formData: FormData) {
  const zodeId = texto(formData.get("zodeId"));
  const municipioId = texto(formData.get("municipioId"));
  const operadorIdBruto = texto(formData.get("operadorId"));
  const fechaCompra = texto(formData.get("fechaCompra"));
  const proveedorNombre = texto(formData.get("proveedorNombre"));
  const proveedorDocumento = texto(formData.get("proveedorDocumento"));
  const tipoProveedor = texto(formData.get("tipoProveedor"));
  const numeroFactura = texto(formData.get("numeroFactura"));
  const observaciones = texto(formData.get("observaciones"));

  if (!zodeId) return { error: "Selecciona el zode." };
  if (!municipioId) return { error: "Selecciona el municipio." };
  if (!fechaCompra || Number.isNaN(new Date(fechaCompra).getTime())) return { error: "La fecha de compra es obligatoria." };
  if (!proveedorNombre) return { error: "El nombre del proveedor es obligatorio." };
  if (!proveedorDocumento) return { error: "El documento o NIT del proveedor es obligatorio." };
  if (!esTipoProveedor(tipoProveedor)) return { error: "Selecciona el tipo de proveedor." };

  const municipio = await db.municipio.findUnique({ where: { id: municipioId } });
  if (!municipio || municipio.zodeId !== zodeId) return { error: "El municipio no pertenece al zode seleccionado." };

  let operadorId: string | null = null;
  if (operadorIdBruto) {
    const operador = await db.operador.findUnique({ where: { id: operadorIdBruto } });
    if (!operador || operador.zodeId !== zodeId) return { error: "El operador no pertenece al zode seleccionado." };
    operadorId = operadorIdBruto;
  }

  const resultadoDetalles = parsearDetalles(formData.get("detalles"));
  if ("error" in resultadoDetalles) return resultadoDetalles;

  return {
    datos: {
      zodeId,
      municipioId,
      operadorId,
      fechaCompra: new Date(fechaCompra),
      proveedorNombre,
      proveedorDocumento,
      tipoProveedor,
      numeroFactura: numeroFactura || null,
      observaciones: observaciones || null,
    },
    detalles: resultadoDetalles.detalles,
  };
}

// Guarda el soporte (factura) si viene en el formulario. null = no vino archivo.
export async function guardarSoporteCompra(
  formData: FormData
): Promise<{ error: string } | { archivoUrl: string; archivoNombre: string } | null> {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return null;
  if (archivo.size > TAMANO_MAXIMO_BYTES) return { error: "El archivo no puede pesar más de 20 MB." };
  const extension = path.extname(archivo.name).toLowerCase();
  if (!TIPOS_ARCHIVO_PERMITIDOS.includes(archivo.type) && !EXTENSIONES_PERMITIDAS.includes(extension)) {
    return { error: "El soporte debe ser PDF, JPG o PNG." };
  }

  fs.mkdirSync(CARPETA, { recursive: true });
  const nombreArchivo = `${Date.now()}-${crypto.randomUUID()}${extension || ".pdf"}`;
  fs.writeFileSync(path.join(CARPETA, nombreArchivo), Buffer.from(await archivo.arrayBuffer()));
  return { archivoUrl: `/uploads/compras-locales/${nombreArchivo}`, archivoNombre: archivo.name };
}

export function borrarSoporteCompra(url: string | null) {
  if (!url) return;
  fs.rm(path.join(process.cwd(), "public", url.replace(/^\//, "")), { force: true }, () => {});
}
