import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { procesarCargaMasivaRegistro } from "@/lib/cargaMasivaRegistro";
import { conAuditoria } from "@/lib/auditoria";

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

async function manejarPOST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const formData = await request.formData();
  const archivo = formData.get("archivo");

  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Carga el archivo CSV." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return NextResponse.json({ error: "El archivo no puede pesar más de 5 MB." }, { status: 400 });
  }
  const esCsv = archivo.type === "text/csv" || archivo.name.toLowerCase().endsWith(".csv");
  if (!esCsv) {
    return NextResponse.json({ error: "El archivo debe ser un CSV." }, { status: 400 });
  }

  const contenido = await archivo.text();
  const resultado = await procesarCargaMasivaRegistro(contenido);
  if ("error" in resultado) return NextResponse.json({ error: resultado.error }, { status: 400 });

  return NextResponse.json(resultado);
}

export const POST = conAuditoria(manejarPOST);
