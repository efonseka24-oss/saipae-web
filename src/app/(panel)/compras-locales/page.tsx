import { db } from "@/lib/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { ComprasLocalesManager } from "@/components/compras-locales/ComprasLocalesManager";
import { INCLUIR_COMPRA_LOCAL } from "@/lib/comprasLocalesServidor";

export default async function ComprasLocalesPage() {
  const [compras, lotes, zodes, municipios, operadores] = await Promise.all([
    db.compraLocal.findMany({ orderBy: { fechaCompra: "desc" }, include: INCLUIR_COMPRA_LOCAL }),
    db.lote.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    db.zode.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, loteId: true } }),
    db.municipio.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true, zodeId: true } }),
    db.operador.findMany({ orderBy: { nombreRazonSocial: "asc" }, select: { id: true, nombreRazonSocial: true, zodeId: true } }),
  ]);

  return (
    <div>
      <PageHeader
        titulo="Compras Locales"
        descripcion="Registra las compras de materia prima a proveedores locales: proveedor, fecha, lugar, productos con cantidad y valor, y la factura de soporte."
      />
      <ComprasLocalesManager compras={compras} lotes={lotes} zodes={zodes} municipios={municipios} operadores={operadores} />
    </div>
  );
}
