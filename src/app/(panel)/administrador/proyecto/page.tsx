import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { FinalizarProyectoForm } from "@/components/proyecto/FinalizarProyectoForm";
import { formatearFechaColombia } from "@/lib/consultaAuditoria";
import { listarRespaldosProyecto } from "@/lib/finalizarProyecto";

export const dynamic = "force-dynamic";

export default async function FinalizarProyectoPage() {
  const [visitas, peticiones, estudiantes, entregas, comprasLocales] = await Promise.all([
    db.visita.count(),
    db.peticionPqrs.count(),
    db.estudianteSimat.count(),
    db.entregaPae.count(),
    db.compraLocal.count(),
  ]);
  const respaldos = listarRespaldosProyecto();

  return (
    <div>
      <Link href="/administrador" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Administrador
      </Link>

      <PageHeader
        titulo="Finalizar proyecto"
        descripcion="Guarda una copia completa de todo lo generado en el proyecto, la descarga y deja el sistema en blanco para empezar uno nuevo."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Finalizar y empezar de cero</CardTitle>
          </CardHeader>
          <p className="text-sm text-slate-600">
            Ahora hay {visitas.toLocaleString("es-CO")} visitas, {peticiones.toLocaleString("es-CO")} PQRS, {comprasLocales.toLocaleString("es-CO")} compras
            locales, {estudiantes.toLocaleString("es-CO")} estudiantes SIMAT y {entregas.toLocaleString("es-CO")} entregas PAE.
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-800">Qué pasa al finalizar</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-600">
            <li>
              Se guarda en el servidor una copia completa (JSON de cada tabla, CSV de las respuestas de cada visita y todos los archivos y
              documentos generados) y se descarga en este equipo. Si la copia falla, <strong>no se borra nada</strong>.
            </li>
            <li>
              Se borran Registro (zodes, municipios, instituciones, sedes, operadores), esquemas y preguntas, plantillas, visitas, PQRS, CAES,
              laboratorios, compras locales, cronograma, SIMAT, menús y los archivos que generaron.
            </li>
            <li>Se conservan los usuarios (con su firma), los datos de la empresa con su logo y membrete, y la auditoría. Las fechas del proyecto quedan en blanco.</li>
          </ol>
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            Esta acción no se puede deshacer desde el sistema. Como los esquemas y las preguntas también se borran, la app móvil no tendrá
            formatos hasta que se carguen los del nuevo proyecto. La copia se puede devolver después en Administrador → Copia de seguridad →
            Restaurar.
          </p>
          <div className="mt-4">
            <FinalizarProyectoForm />
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Copias de proyectos finalizados</CardTitle>
          </CardHeader>
          {respaldos.length === 0 ? (
            <p className="text-sm text-slate-400">Todavía no se ha finalizado ningún proyecto.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {respaldos.map((r) => (
                <li key={r.nombre} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-mono text-xs text-slate-800">{r.nombre}</p>
                    <p className="text-xs text-slate-500">
                      {formatearFechaColombia(r.fecha)} · {(r.bytes / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                  <a
                    href={`/api/administrador/proyecto/respaldos/${encodeURIComponent(r.nombre)}`}
                    className="inline-flex items-center gap-1.5 font-medium text-blue-600 hover:text-blue-700"
                  >
                    <Download className="h-4 w-4" /> Descargar
                  </a>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">Se guardan en la carpeta data/respaldos-proyecto del servidor. Descárgalas también a un lugar externo.</p>
        </Card>
      </div>
    </div>
  );
}
