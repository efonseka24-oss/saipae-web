import { NextRequest, NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/auth";
import { generarInformeConsolidado } from "@/lib/generarInformeConsolidado";
import type { RangoFechas } from "@/lib/informeConsolidado";

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const { loteId, tipo, anio, mes } = await request.json();

  if (typeof loteId !== "string" || !loteId) {
    return NextResponse.json({ error: "Selecciona el lote." }, { status: 400 });
  }
  if (tipo !== "MENSUAL" && tipo !== "GENERAL") {
    return NextResponse.json({ error: "Tipo de informe inválido." }, { status: 400 });
  }

  let rango: RangoFechas;
  if (tipo === "MENSUAL") {
    const anioNum = Number(anio);
    const mesNum = Number(mes);
    if (!Number.isInteger(anioNum) || !Number.isInteger(mesNum) || mesNum < 1 || mesNum > 12) {
      return NextResponse.json({ error: "Selecciona el mes del informe." }, { status: 400 });
    }
    rango = {
      desde: new Date(Date.UTC(anioNum, mesNum - 1, 1)),
      hasta: new Date(Date.UTC(anioNum, mesNum, 0, 23, 59, 59, 999)),
    };
  } else {
    rango = { desde: null, hasta: new Date() };
  }

  const resultado = await generarInformeConsolidado(loteId, rango, tipo);
  if (!resultado) return NextResponse.json({ error: "El lote no existe." }, { status: 404 });

  return new NextResponse(new Uint8Array(resultado.buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${resultado.nombreArchivo}"`,
    },
  });
}
