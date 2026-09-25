import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ETIQUETAS_TIPO_AUDITORIA, MESES_CONSERVAR_AUDITORIA, type TipoAuditoria } from "@/lib/auditoria";
import { formatearFechaColombia, leerFiltrosAuditoria, whereAuditoria } from "@/lib/consultaAuditoria";

const POR_PAGINA = 50;

const VARIANTE_TIPO: Record<TipoAuditoria, "slate" | "blue" | "green" | "amber" | "red"> = {
  SESION: "blue",
  NAVEGACION: "slate",
  ACCION: "amber",
  APP: "green",
  RESPALDO: "red",
  SISTEMA: "slate",
};

const CLASE_CAMPO =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export default async function AuditoriaPage(props: PageProps<"/administrador/auditoria">) {
  const parametros = await props.searchParams;
  const filtros = leerFiltrosAuditoria(parametros);
  const paginaTexto = Array.isArray(parametros.pagina) ? parametros.pagina[0] : parametros.pagina;
  const pagina = Math.max(1, Number(paginaTexto) || 1);
  const where = whereAuditoria(filtros);

  const [registros, total, usuarios] = await Promise.all([
    db.auditoria.findMany({ where, orderBy: { fecha: "desc" }, skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
    db.auditoria.count({ where }),
    db.auditoria.findMany({ distinct: ["usuario"], select: { usuario: true, nombre: true }, orderBy: { usuario: "asc" } }),
  ]);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  // Enlaces que conservan los filtros actuales.
  const conFiltros = (extra: Record<string, string | number>) => {
    const busqueda = new URLSearchParams();
    for (const [clave, valor] of Object.entries({ ...filtros, ...extra })) {
      if (valor !== undefined && valor !== "") busqueda.set(clave, String(valor));
    }
    return busqueda.toString();
  };

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
        titulo="Auditoría"
        descripcion={`Registro de lo que hace cada usuario en el sistema: inicios de sesión, páginas que abre, cambios, descargas, copias de seguridad y visitas que llegan desde la app. Horas en hora de Colombia. Se conservan los últimos ${MESES_CONSERVAR_AUDITORIA} meses; lo anterior se borra solo.`}
        acciones={
          <a
            href={`/api/administrador/auditoria/csv?${conFiltros({})}`}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Exportar a Excel
          </a>
        }
      />

      <Card className="mb-4">
        <form className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6" method="get">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-600">Buscar</label>
            <input name="q" defaultValue={filtros.q ?? ""} placeholder="Texto, módulo, IP..." className={CLASE_CAMPO} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Usuario</label>
            <select name="usuario" defaultValue={filtros.usuario ?? ""} className={CLASE_CAMPO}>
              <option value="">Todos</option>
              {usuarios.map((u) => (
                <option key={u.usuario} value={u.usuario}>
                  {u.nombre ? `${u.nombre} (${u.usuario})` : u.usuario}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Tipo</label>
            <select name="tipo" defaultValue={filtros.tipo ?? ""} className={CLASE_CAMPO}>
              <option value="">Todos</option>
              {Object.entries(ETIQUETAS_TIPO_AUDITORIA).map(([valor, etiqueta]) => (
                <option key={valor} value={valor}>
                  {etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Desde</label>
            <input type="date" name="desde" defaultValue={filtros.desde ?? ""} className={CLASE_CAMPO} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Hasta</label>
            <input type="date" name="hasta" defaultValue={filtros.hasta ?? ""} className={CLASE_CAMPO} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Resultado</label>
            <select name="resultado" defaultValue={filtros.resultado ?? ""} className={CLASE_CAMPO}>
              <option value="">Todos</option>
              <option value="ok">Correcto</option>
              <option value="error">Con error</option>
            </select>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-5">
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Filtrar
            </button>
            <Link href="/administrador/auditoria" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Limpiar
            </Link>
            <span className="ml-auto text-sm text-slate-500">{total.toLocaleString("es-CO")} registro(s)</span>
          </div>
        </form>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Fecha</th>
                <th className="py-2 pr-4">Usuario</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Módulo</th>
                <th className="py-2 pr-4">Qué hizo</th>
                <th className="py-2 pr-4">Resultado</th>
                <th className="py-2 pr-4">IP</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 align-top last:border-0">
                  <td className="whitespace-nowrap py-2 pr-4 text-slate-600">{formatearFechaColombia(r.fecha)}</td>
                  <td className="py-2 pr-4">
                    <div className="font-medium text-slate-900">{r.nombre ?? r.usuario}</div>
                    {r.nombre && <div className="text-xs text-slate-500">{r.usuario}</div>}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge variante={VARIANTE_TIPO[r.tipo as TipoAuditoria] ?? "slate"}>
                      {ETIQUETAS_TIPO_AUDITORIA[r.tipo as TipoAuditoria] ?? r.tipo}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{r.modulo ?? "—"}</td>
                  <td className="py-2 pr-4 text-slate-800">
                    {r.descripcion}
                    {r.ruta && <div className="text-xs text-slate-400">{r.metodo ? `${r.metodo} ` : ""}{r.ruta}</div>}
                  </td>
                  <td className="py-2 pr-4">
                    {r.exito ? <Badge variante="green">Correcto</Badge> : <Badge variante="red">Error{r.estado ? ` ${r.estado}` : ""}</Badge>}
                  </td>
                  <td className="whitespace-nowrap py-2 pr-4 text-xs text-slate-500" title={r.agente ?? undefined}>
                    {r.ip ?? "—"}
                  </td>
                </tr>
              ))}
              {registros.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-slate-400">
                    No hay registros con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {paginas > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            {pagina > 1 ? (
              <Link href={`/administrador/auditoria?${conFiltros({ pagina: pagina - 1 })}`} className="font-medium text-blue-600 hover:text-blue-700">
                ← Más recientes
              </Link>
            ) : (
              <span />
            )}
            <span className="text-slate-500">
              Página {pagina} de {paginas}
            </span>
            {pagina < paginas ? (
              <Link href={`/administrador/auditoria?${conFiltros({ pagina: pagina + 1 })}`} className="font-medium text-blue-600 hover:text-blue-700">
                Más antiguos →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
