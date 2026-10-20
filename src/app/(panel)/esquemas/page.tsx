import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { NuevoEsquemaForm } from "@/components/esquemas/NuevoEsquemaForm";
import { FilaEsquema } from "@/components/esquemas/FilaEsquema";
import { MenusManager } from "@/components/menus/MenusManager";
import { INCLUIR_MENU } from "@/lib/menusServidor";

export default async function EsquemasPage() {
  const [esquemas, menus, lotes] = await Promise.all([
    db.esquema.findMany({
      orderBy: { nombre: "asc" },
      include: { _count: { select: { modulos: true } } },
    }),
    db.menuPae.findMany({
      orderBy: [{ lote: { nombre: "asc" } }, { especialEtnico: "asc" }, { numero: "asc" }],
      include: INCLUIR_MENU,
    }),
    db.lote.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, departamento: { select: { nombre: true } } } }),
  ]);

  return (
    <div>
      <PageHeader
        titulo="Esquemas y Preguntas"
        descripcion="Define los esquemas de visita (RPS, RI, CCT, Bodega, ...), sus módulos y preguntas, y más abajo los menús del PAE."
        acciones={<NuevoEsquemaForm />}
      />

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Esquema</th>
                <th className="py-2 pr-4">Descripción</th>
                <th className="py-2 pr-4">Módulos</th>
                <th className="py-2 pr-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {esquemas.map((esquema) => (
                <FilaEsquema key={esquema.id} esquema={esquema} />
              ))}
              {esquemas.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-sm text-slate-400">
                    No hay esquemas todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-10">
        <MenusManager menus={menus} lotes={lotes} />
      </div>
    </div>
  );
}
