export type Lote = { id: string; nombre: string };

export type Zode = {
  id: string;
  nombre: string;
  loteId: string;
  lote: { id: string; nombre: string; departamento: { id: string; nombre: string } };
};

export type Municipio = { id: string; nombre: string; zodeId: string };

export type Institucion = { id: string; nombre: string; numeroDane: string; municipioId: string };

export type Sede = { id: string; nombre: string; numeroDane: string; institucionId: string };

export type Operador = { id: string; nombreRazonSocial: string; zodeId: string };

export type Esquema = { id: string; nombre: string };

export type DetalleMuestra = {
  id: string;
  orden: number;
  producto: string | null;
  examen: string | null;
  cumplimiento: string | null;
};

export type Laboratorio = {
  id: string;
  zodeId: string;
  zode: { id: string; nombre: string; lote: { id: string; nombre: string; departamento: { id: string; nombre: string } } };
  municipioId: string;
  municipio: { id: string; nombre: string };
  institucionId: string;
  institucion: { id: string; nombre: string; numeroDane: string };
  sedeId: string;
  sede: { id: string; nombre: string; numeroDane: string };
  operadorId: string | null;
  operador: { id: string; nombreRazonSocial: string } | null;
  esquemaId: string;
  esquema: { id: string; nombre: string };
  fechaTomaMuestra: string | Date;
  nombreLaboratorio: string;
  resultado: string;
  fechaResultado: string | Date;
  observaciones: string | null;
  archivoUrl: string;
  archivoNombre: string;
  detalles: DetalleMuestra[];
};
