import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { RestaurarRespaldoForm } from "@/components/respaldo/RestaurarRespaldoForm";
import { formatearFechaColombia } from "@/lib/consultaAuditoria";

export default async function RespaldoPage() {
  const [visitas, respuestas, usuarios, ultimos] = await Promise.all([
    db.visita.count(),
    db.respuesta.count(),
    db.usuario.count(),
    db.auditoria.findMany({
      where: { tipo: "RESPALDO" },
      orderBy: { fecha: "desc" },
      take: 5,
      select: { id: true, fecha: true, descripcion: true, nombre: true, usuario: true, exito: true },
    }),
  ]);

  return (
    <div>
      <Link
        href="/administrador"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Administrador
      </Link>

      <PageHeader
        titulo="Copia de seguridad"
        descripcion="Descarga en este equipo un ZIP con toda la información del sistema, o restaura una copia si se perdió la información del servidor."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Descargar copia</CardTitle>
          </CardHeader>
          <p className="text-sm text-slate-600">
            Incluye la base de datos completa ({visitas.toLocaleString("es-CO")} visitas, {respuestas.toLocaleString("es-CO")} respuestas,{" "}
            {usuarios} usuarios, Registro, esquemas, PQRS, CAES, laboratorios y auditoría), todos los archivos cargados y todos los
            informes y documentos generados.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>
              <strong>visitas/</strong>: una carpeta por visita (esquema, fecha, municipio y sede) con sus respuestas en JSON y en CSV para
              Excel, sus fotos y archivos (con el nombre de la pregunta) y sus documentos generados.
            </li>
            <li>
              <strong>archivos-cargados/</strong> y <strong>documentos-generados/</strong>: firmas, actas CAES, PQRS, laboratorios,
              logos y demás documentos.
            </li>
            <li>
              <strong>datos/</strong>: cada tabla en JSON; <strong>base-de-datos/</strong>: la copia exacta que se usa para restaurar.
            </li>
            <li>
              <strong>LEEME.txt</strong> explica el contenido y cómo restaurar.
            </li>
          </ul>
          <a
            href="/api/administrador/respaldo"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Descargar copia de seguridad (.zip)
          </a>
          <p className="mt-2 text-xs text-slate-500">
            La descarga empieza de inmediato y se arma mientras baja; con muchas fotos puede tardar varios minutos. Guárdela fuera del
            servidor (disco externo, nube).
          </p>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restaurar copia</CardTitle>
          </CardHeader>
          <RestaurarRespaldoForm />
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Últimas copias y restauraciones</CardTitle>
          <Link href="/administrador/auditoria?tipo=RESPALDO" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Ver todo en auditoría
          </Link>
        </CardHeader>
        {ultimos.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no se ha descargado ni restaurado ninguna copia.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {ultimos.map((r) => (
              <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
                <span className={r.exito ? "text-slate-800" : "text-red-600"}>{r.descripcion}</span>
                <span className="text-xs text-slate-500">
                  {formatearFechaColombia(r.fecha)} · {r.nombre ?? r.usuario}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
