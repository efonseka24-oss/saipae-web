import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { obtenerSesion } from "@/lib/auth";
import { conAuditoria } from "@/lib/auditoria";

const ID_EMPRESA = "empresa";

function fechaOpcional(valor: unknown): { error: string } | { fecha: Date | null } {
  if (typeof valor !== "string" || !valor.trim()) return { fecha: null };
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return { error: "Alguna de las fechas del proyecto no es válida." };
  return { fecha };
}

export async function GET() {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const datos = await db.datosEmpresa.upsert({
    where: { id: ID_EMPRESA },
    update: {},
    create: { id: ID_EMPRESA },
  });
  return NextResponse.json(datos);
}

async function manejarPUT(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (!sesion) return NextResponse.json({ error: "No autorizado." }, { status: 401 });

  const cuerpo = await request.json();
  const {
    nit,
    razonSocial,
    nombreComercial,
    direccion,
    ciudad,
    telefono,
    correo,
    sitioWeb,
    representanteLegalNombre,
    representanteLegalCargo,
    fechaInicioInterventoria,
    fechaFinInterventoria,
    fechaInicioPae,
    fechaFinPae,
  } = cuerpo;

  if (typeof nit !== "string" || typeof razonSocial !== "string") {
    return NextResponse.json({ error: "NIT y razón social son obligatorios." }, { status: 400 });
  }
  if (correo && typeof correo === "string" && correo.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(correo.trim())) {
      return NextResponse.json({ error: "El correo electrónico no es válido." }, { status: 400 });
    }
  }

  const resultadoInicioInterventoria = fechaOpcional(fechaInicioInterventoria);
  const resultadoFinInterventoria = fechaOpcional(fechaFinInterventoria);
  const resultadoInicioPae = fechaOpcional(fechaInicioPae);
  const resultadoFinPae = fechaOpcional(fechaFinPae);
  for (const resultado of [resultadoInicioInterventoria, resultadoFinInterventoria, resultadoInicioPae, resultadoFinPae]) {
    if ("error" in resultado) return NextResponse.json({ error: resultado.error }, { status: 400 });
  }
  const fechasProyecto = {
    fechaInicioInterventoria: (resultadoInicioInterventoria as { fecha: Date | null }).fecha,
    fechaFinInterventoria: (resultadoFinInterventoria as { fecha: Date | null }).fecha,
    fechaInicioPae: (resultadoInicioPae as { fecha: Date | null }).fecha,
    fechaFinPae: (resultadoFinPae as { fecha: Date | null }).fecha,
  };

  const datos = await db.datosEmpresa.upsert({
    where: { id: ID_EMPRESA },
    update: {
      nit: nit.trim(),
      razonSocial: razonSocial.trim(),
      nombreComercial: nombreComercial?.trim() || null,
      direccion: direccion?.trim() || null,
      ciudad: ciudad?.trim() || null,
      telefono: telefono?.trim() || null,
      correo: correo?.trim() || null,
      sitioWeb: sitioWeb?.trim() || null,
      representanteLegalNombre: representanteLegalNombre?.trim() || null,
      representanteLegalCargo: representanteLegalCargo?.trim() || null,
      ...fechasProyecto,
    },
    create: {
      id: ID_EMPRESA,
      nit: nit.trim(),
      razonSocial: razonSocial.trim(),
      nombreComercial: nombreComercial?.trim() || null,
      direccion: direccion?.trim() || null,
      ciudad: ciudad?.trim() || null,
      telefono: telefono?.trim() || null,
      correo: correo?.trim() || null,
      sitioWeb: sitioWeb?.trim() || null,
      representanteLegalNombre: representanteLegalNombre?.trim() || null,
      representanteLegalCargo: representanteLegalCargo?.trim() || null,
      ...fechasProyecto,
    },
  });

  return NextResponse.json(datos);
}

export const PUT = conAuditoria(manejarPUT);
