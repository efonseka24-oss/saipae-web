// Convierte lo que escribe el usuario a número, con la notación colombiana:
// "1.800" o "1.250.000" (puntos de miles), "10,5" o "1.800,50" (coma decimal).
// Un punto que no separa grupos de 3 cifras ("1.5") se toma como decimal.
export function leerNumero(texto: string): number {
  const t = texto.replace(/\s/g, "");
  if (!t) return NaN;
  if (t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ""));
  return Number(t);
}
