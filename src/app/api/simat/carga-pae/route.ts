import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";
import { leerArchivoSimat, procesarCargaBeneficiarios, procesarCargaEntregas } from "@/lib/simat";

const TAMANO_MAXIMO_BYTES = 30 * 1024 * 1024; // 30 MB

// Carga el Excel de beneficiarios del PAE (tipo "beneficiarios") o el de
// entregas diarias (tipo "entregas").
async function manejarPOST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const formData = await request.formData();
  const archivo = formData.get("archivo");
  const tipo = formData.get("tipo");

  if (tipo !== "beneficiarios" && tipo !== "entregas") {
    return NextResponse.json({ error: "Tipo de carga no válido." }, { status: 400 });
  }
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Carga el archivo (Excel o CSV)." }, { status: 400 });
  }
  if (archivo.size > TAMANO_MAXIMO_BYTES) {
    return NextResponse.json({ error: "El archivo no puede pesar más de 30 MB." }, { status: 400 });
  }
  const nombre = archivo.name.toLowerCase();
  if (!nombre.endsWith(".csv") && !nombre.endsWith(".xlsx")) {
    return NextResponse.json({ error: "El archivo debe ser Excel (.xlsx) o CSV." }, { status: 400 });
  }

  const lectura = leerArchivoSimat(nombre, new Uint8Array(await archivo.arrayBuffer()));
  if ("error" in lectura) return NextResponse.json({ error: lectura.error }, { status: 400 });

  const resultado =
    tipo === "beneficiarios"
      ? await procesarCargaBeneficiarios(lectura.registros, formData.get("reemplazar") === "true")
      : await procesarCargaEntregas(lectura.registros);
  if ("error" in resultado) return NextResponse.json({ error: resultado.error }, { status: 400 });

  return NextResponse.json(resultado);
}

export const POST = conAuditoria(manejarPOST);
