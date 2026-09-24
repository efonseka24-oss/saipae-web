import fs from "node:fs";
import path from "node:path";

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB
const EXTENSIONES_PERMITIDAS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// Devuelve el mensaje de error si la imagen de firma no es válida, o null.
export function validarFirma(archivo: unknown): string | null {
  if (!(archivo instanceof File) || archivo.size === 0) return "La firma es obligatoria: carga una imagen.";
  if (archivo.size > TAMANO_MAXIMO_BYTES) return "La imagen de la firma no puede pesar más de 5 MB.";
  if (!EXTENSIONES_PERMITIDAS[archivo.type]) return "Formato de firma no soportado. Usa PNG, JPG o WEBP.";
  return null;
}

// Guarda la imagen (ya validada) en public/uploads/firmas, borra la anterior
// si había y devuelve la URL pública nueva.
export async function guardarFirma(usuarioId: string, archivo: File, firmaUrlAnterior: string | null): Promise<string> {
  const carpeta = path.join(process.cwd(), "public", "uploads", "firmas");
  fs.mkdirSync(carpeta, { recursive: true });

  if (firmaUrlAnterior) {
    fs.rm(path.join(process.cwd(), "public", firmaUrlAnterior.replace(/^\//, "")), { force: true }, () => {});
  }

  const nombreArchivo = `firma-${usuarioId}-${Date.now()}.${EXTENSIONES_PERMITIDAS[archivo.type]}`;
  fs.writeFileSync(path.join(carpeta, nombreArchivo), Buffer.from(await archivo.arrayBuffer()));
  return `/uploads/firmas/${nombreArchivo}`;
}

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function esCorreoValido(valor: string): boolean {
  return PATRON_CORREO.test(valor);
}
