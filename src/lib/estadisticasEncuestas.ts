// Resuelve, para cada Visita (que solo guarda texto plano de operador/zodes/
// lote/municipio/institución), la cadena completa Departamento→Lote→Zode→
// Municipio→Institución cruzando esos textos contra el catálogo de Registro.
// Es "mejor esfuerzo": si no hay coincidencia en un nivel, cae al siguiente
// nivel disponible y marca el resto como "Sin dato".

export type AgrupacionEstadistica = "departamento" | "lote" | "zode" | "municipio" | "institucion";

export const ETIQUETAS_AGRUPACION: Record<AgrupacionEstadistica, string> = {
  departamento: "Departamento",
  lote: "Lote",
  zode: "Zode",
  municipio: "Municipio",
  institucion: "Institución",
};

export const SIN_DATO = "Sin dato";

type InstitucionRegistro = {
  nombre: string;
  municipio: { nombre: string; zode: { nombre: string; lote: { nombre: string; departamento: { nombre: string } } } };
};
type MunicipioRegistro = { nombre: string; zode: { nombre: string; lote: { nombre: string; departamento: { nombre: string } } } };
type ZodeRegistro = { nombre: string; lote: { nombre: string; departamento: { nombre: string } } };
type LoteRegistro = { nombre: string; departamento: { nombre: string } };

export type CadenaResuelta = {
  departamento: string;
  lote: string;
  zode: string;
  municipio: string;
  institucion: string;
};

export function resolverCadenaVisita(
  visita: { operador: string | null; municipio: string | null; institucion: string | null; zodes: string | null; lote: string | null },
  instituciones: InstitucionRegistro[],
  municipios: MunicipioRegistro[],
  zodes: ZodeRegistro[],
  lotes: LoteRegistro[]
): CadenaResuelta {
  const inst = visita.institucion ? instituciones.find((i) => i.nombre === visita.institucion) : undefined;
  if (inst) {
    return {
      institucion: inst.nombre,
      municipio: inst.municipio.nombre,
      zode: inst.municipio.zode.nombre,
      lote: inst.municipio.zode.lote.nombre,
      departamento: inst.municipio.zode.lote.departamento.nombre,
    };
  }

  const muni = visita.municipio ? municipios.find((m) => m.nombre === visita.municipio) : undefined;
  if (muni) {
    return {
      institucion: SIN_DATO,
      municipio: muni.nombre,
      zode: muni.zode.nombre,
      lote: muni.zode.lote.nombre,
      departamento: muni.zode.lote.departamento.nombre,
    };
  }

  const zode = visita.zodes ? zodes.find((z) => z.nombre === visita.zodes) : undefined;
  if (zode) {
    return {
      institucion: SIN_DATO,
      municipio: SIN_DATO,
      zode: zode.nombre,
      lote: zode.lote.nombre,
      departamento: zode.lote.departamento.nombre,
    };
  }

  const lote = visita.lote ? lotes.find((l) => l.nombre === visita.lote) : undefined;
  if (lote) {
    return {
      institucion: SIN_DATO,
      municipio: SIN_DATO,
      zode: SIN_DATO,
      lote: lote.nombre,
      departamento: lote.departamento.nombre,
    };
  }

  return { institucion: SIN_DATO, municipio: SIN_DATO, zode: SIN_DATO, lote: SIN_DATO, departamento: SIN_DATO };
}
