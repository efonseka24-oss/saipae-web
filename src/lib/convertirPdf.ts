import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";

const RUTAS_SOFFICE = [
  "soffice",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  "/usr/bin/soffice",
  "/opt/libreoffice/program/soffice",
];

function ejecutar(comando: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(comando, args, { timeout: 60_000 }, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

// Convierte un .docx (en memoria) a PDF invocando LibreOffice en modo
// headless. Es de mejor esfuerzo: si LibreOffice no está instalado o la
// conversión falla, devuelve null en vez de lanzar, para no perder el .docx.
export async function convertirDocxAPdf(docx: Buffer, nombreBase: string): Promise<Buffer | null> {
  const carpetaTemporal = fs.mkdtempSync(path.join(os.tmpdir(), "saipae-formato-"));
  const rutaDocx = path.join(carpetaTemporal, `${nombreBase}.docx`);
  const rutaPdfEsperada = path.join(carpetaTemporal, `${nombreBase}.pdf`);

  fs.writeFileSync(rutaDocx, docx);

  for (const ejecutable of RUTAS_SOFFICE) {
    try {
      await ejecutar(ejecutable, [
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        carpetaTemporal,
        rutaDocx,
      ]);

      if (fs.existsSync(rutaPdfEsperada)) {
        const pdf = fs.readFileSync(rutaPdfEsperada);
        fs.rmSync(carpetaTemporal, { recursive: true, force: true });
        return pdf;
      }
    } catch {
      // Probamos la siguiente ruta candidata.
    }
  }

  fs.rmSync(carpetaTemporal, { recursive: true, force: true });
  console.log("SAIPAE FORMATOS: no se encontró LibreOffice instalado; se conserva solo el .docx.");
  return null;
}
