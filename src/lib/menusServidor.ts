// Validación de Menús del PAE (solo servidor: consulta la base).
import { db } from "@/lib/db";
import { MAXIMO_DETALLES_MENU } from "@/lib/menus";
import { leerNumero } from "@/lib/numeros";

export const INCLUIR_MENU = {
  lote: { select: { id: true, nombre: true, departamento: { select: { nombre: true } } } },
  detalles: { orderBy: { orden: "asc" } },
} as const;

type DetalleValidado = { orden: number; tipoAlimento: string; nombreAlimento: string; unidad: string; cantidad: number };

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

export async function validarMenu(cuerpo: Record<string, unknown>) {
  const numero = Number(texto(String(cuerpo.numero ?? "")));
  const loteId = texto(cuerpo.loteId);
  const especialEtnico = cuerpo.especialEtnico === true;

  if (!Number.isInteger(numero) || numero < 1) return { error: "El número de menú debe ser un número entero mayor que cero." };
  if (!loteId) return { error: "Selecciona el lote." };
  if (!(await db.lote.findUnique({ where: { id: loteId } }))) return { error: "El lote no existe." };

  const lista = Array.isArray(cuerpo.detalles) ? cuerpo.detalles : null;
  if (!lista || lista.length > MAXIMO_DETALLES_MENU) return { error: "Los alimentos del menú no tienen un formato válido." };

  const detalles: DetalleValidado[] = [];
  for (let indice = 0; indice < lista.length; indice++) {
    const fila = (lista[indice] ?? {}) as Record<string, unknown>;
    const tipoAlimento = texto(fila.tipoAlimento);
    const nombreAlimento = texto(fila.nombreAlimento);
    const unidad = texto(fila.unidad);
    const cantidadTexto = texto(fila.cantidad);
    if (!tipoAlimento && !nombreAlimento && !cantidadTexto) continue;

    const cantidad = leerNumero(cantidadTexto);
    const linea = indice + 1;
    if (!tipoAlimento) return { error: `Escribe el tipo de alimento de la línea ${linea}.` };
    if (!nombreAlimento) return { error: `Escribe el nombre del alimento de la línea ${linea}.` };
    if (!unidad) return { error: `Selecciona la unidad de medida de la línea ${linea}.` };
    if (!(cantidad > 0)) return { error: `La cantidad de la línea ${linea} debe ser un número mayor que cero.` };

    detalles.push({ orden: detalles.length + 1, tipoAlimento, nombreAlimento, unidad, cantidad });
  }
  if (detalles.length === 0) return { error: "Agrega al menos un alimento al menú." };

  return { datos: { numero, loteId, especialEtnico }, detalles };
}

export const MENSAJE_MENU_REPETIDO = "Ya existe un menú con ese número en ese lote (del mismo tipo: general o especial étnico).";
