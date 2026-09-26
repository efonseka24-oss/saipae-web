export type Lote = { id: string; nombre: string };
export type Zode = { id: string; nombre: string; loteId: string };
export type Municipio = { id: string; nombre: string; zodeId: string };
export type Institucion = { id: string; nombre: string; municipioId: string };
export type Sede = { id: string; nombre: string; institucionId: string };
export type Operador = { id: string; nombreRazonSocial: string; zodeId: string };
export type Bodega = { id: string; nombre: string; operadorId: string };
export type Esquema = { id: string; nombre: string };
export type Responsable = { id: string; nombre: string; cargo: string | null };

export type CatalogosCronograma = {
  lotes: Lote[];
  zodes: Zode[];
  municipios: Municipio[];
  instituciones: Institucion[];
  sedes: Sede[];
  operadores: Operador[];
  bodegas: Bodega[];
  esquemas: Esquema[];
  usuarios: Responsable[];
};

export type VisitaProgramada = {
  id: string;
  esquemaId: string | null;
  esquema: { id: string; nombre: string } | null;
  zodeId: string;
  zode: { id: string; nombre: string; loteId: string; lote: { id: string; nombre: string } };
  municipioId: string;
  municipio: { id: string; nombre: string };
  institucionId: string | null;
  institucion: { id: string; nombre: string } | null;
  sedeId: string | null;
  sede: { id: string; nombre: string } | null;
  operadorId: string | null;
  operador: { id: string; nombreRazonSocial: string } | null;
  bodegaId: string | null;
  bodega: { id: string; nombre: string } | null;
  fechaProgramada: string | Date;
  fechaRealizacion: string | Date | null;
  observaciones: string | null;
  interventorId: string | null;
  interventor: Responsable | null;
  supervisorId: string | null;
  supervisor: Responsable | null;
};
