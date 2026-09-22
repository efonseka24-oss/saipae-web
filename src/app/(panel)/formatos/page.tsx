import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { GenerarFormatosForm } from "@/components/formatos/GenerarFormatosForm";
import { esEsquemaDeEncuesta } from "@/lib/tabulacion";

const CADENA_LOTE = { lote: { select: { id: true, nombre: true, departamento: { select: { nombre: true } } } } } as const;
const CADENA_ZODE = { zode: { select: { id: true, nombre: true, loteId: true, ...CADENA_LOTE } } } as const;
const CADENA_MUNICIPIO = { municipio: { select: { id: true, nombre: true, zodeId: true, ...CADENA_ZODE } } } as const;

export default async function FormatosPage() {
  const [todosLosEsquemas, lotes, zodes, municipios, instituciones] = await Promise.all([
    db.esquema.findMany({ orderBy: { nombre: "asc" } }),
    db.lote.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, departamento: { select: { nombre: true } } } }),
    db.zode.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, loteId: true, ...CADENA_LOTE } }),
    db.municipio.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, zodeId: true, ...CADENA_ZODE } }),
    db.institucion.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, municipioId: true, ...CADENA_MUNICIPIO },
    }),
  ]);
  // Las "Encuesta..." se generan desde Tabulación (Ver estadísticas / reportes
  // por nivel), no desde aquí.
  const esquemas = todosLosEsquemas.filter((e) => !esEsquemaDeEncuesta(e.nombre));

  return (
    <div>
      <PageHeader
        titulo="Generar Formatos"
        descripcion="Elige una visita diligenciada en Tabulación y genera su informe .docx/.pdf, armado 100% desde las preguntas y respuestas actuales."
        acciones={
          <Link
            href="/formatos/nueva"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nueva visita
          </Link>
        }
      />
      <GenerarFormatosForm esquemas={esquemas} lotes={lotes} zodes={zodes} municipios={municipios} instituciones={instituciones} />
    </div>
  );
}
