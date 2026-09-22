// La Tabulación de Encuestas solo maneja esquemas cuyo nombre empieza con
// "Encuesta" (ej. "Encuesta Estudiantes"). Los demás esquemas (RPS, RI, CCT,
// Bodega, ...) se manejan por otros módulos, no por diligenciamiento aquí.
export function esEsquemaDeEncuesta(nombre: string): boolean {
  return nombre.trim().toLowerCase().startsWith("encuesta");
}
