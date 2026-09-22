export type Departamento = { id: string; nombre: string; _count: { lotes: number } };

export type Lote = {
  id: string;
  nombre: string;
  departamentoId: string;
  departamento: { id: string; nombre: string };
  _count: { zodes: number };
};

export type Zode = {
  id: string;
  nombre: string;
  loteId: string;
  lote: { id: string; nombre: string; departamento: { id: string; nombre: string } };
  _count: { municipios: number };
};

export type Municipio = {
  id: string;
  nombre: string;
  zodeId: string;
  zode: { id: string; nombre: string; lote: { id: string; nombre: string; departamento: { id: string; nombre: string } } };
  _count: { instituciones: number };
};

export type Institucion = {
  id: string;
  numeroDane: string;
  nombre: string;
  municipioId: string;
  habilitadaPae: boolean;
  tiposRacion: string;
  municipio: {
    id: string;
    nombre: string;
    zode: { id: string; nombre: string; lote: { id: string; nombre: string; departamento: { id: string; nombre: string } } };
  };
  _count: { sedes: number };
};

export type Sede = {
  id: string;
  numeroDane: string;
  nombre: string;
  institucionId: string;
  habilitadaPae: boolean;
  tiposRacion: string;
  institucion: {
    id: string;
    nombre: string;
    numeroDane: string;
    municipio: {
      id: string;
      nombre: string;
      zode: { id: string; nombre: string; lote: { id: string; nombre: string; departamento: { id: string; nombre: string } } };
    };
  };
};

export type Operador = {
  id: string;
  nit: string;
  nombreRazonSocial: string;
  zodeId: string;
  zode: { id: string; nombre: string; lote: { id: string; nombre: string; departamento: { id: string; nombre: string } } };
  _count: { bodegas: number };
};

export type Bodega = {
  id: string;
  nombre: string;
  operadorId: string;
  operador: {
    id: string;
    nit: string;
    nombreRazonSocial: string;
    zode: { id: string; nombre: string; lote: { id: string; nombre: string; departamento: { id: string; nombre: string } } };
  };
};
