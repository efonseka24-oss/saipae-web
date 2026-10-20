export type LoteMenu = { id: string; nombre: string; departamento: { nombre: string } };

export type DetalleMenu = {
  id: string;
  orden: number;
  tipoAlimento: string;
  nombreAlimento: string;
  unidad: string;
  cantidad: number;
};

export type MenuPae = {
  id: string;
  numero: number;
  loteId: string;
  lote: LoteMenu;
  especialEtnico: boolean;
  detalles: DetalleMenu[];
};
