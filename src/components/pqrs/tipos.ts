export type UsuarioResponsable = { id: string; nombre: string; cargo: string | null };

export type RespuestaPqrs = {
  id: string;
  radicadoSalida: string;
  fechaRadicado: string | Date;
  texto: string;
  documentoUrl: string | null;
  documentoPdfUrl: string | null;
  generadoEn: string | Date | null;
};

export type PeticionPqrs = {
  id: string;
  radicadoEntrada: string;
  fechaRadicado: string | Date;
  peticionario: string;
  tipoPeticion: string;
  asunto: string;
  responsableId: string;
  responsable: UsuarioResponsable;
  archivoUrl: string;
  archivoNombre: string;
  respuesta: RespuestaPqrs | null;
};
