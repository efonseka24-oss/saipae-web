export type Lote = { id: string; nombre: string };
export type Zode = { id: string; nombre: string; loteId: string };
export type Municipio = { id: string; nombre: string; zodeId: string };
export type Institucion = { id: string; nombre: string; numeroDane: string; municipioId: string };
export type Sede = { id: string; nombre: string; numeroDane: string; institucionId: string };

export type EstudianteSimat = {
  id: string;
  idSimat: string;
  numeroDocumento: string;
  nombre: string;
  municipioId: string;
  municipio: { id: string; nombre: string; zode: { id: string; nombre: string; lote: { id: string; nombre: string } } };
  institucionId: string;
  institucion: { id: string; nombre: string; numeroDane: string };
  sedeId: string;
  sede: { id: string; nombre: string; numeroDane: string };
};
