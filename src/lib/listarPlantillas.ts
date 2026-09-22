import fs from "node:fs";
import path from "node:path";
import { CATEGORIAS_DISPONIBLES, mapaParaCategoria, nombrePlantilla, type CategoriaFormato } from "@/lib/mapasPlantillas";
import { extraerMarcadores } from "@/lib/marcadoresPlantilla";

export type InfoPlantilla = {
  categoria: CategoriaFormato;
  etiqueta: string;
  archivo: string;
  existe: boolean;
  tamanoBytes: number;
  actualizadoEl: string | null;
  totalMarcadores: number;
  marcadoresSinMapear: number;
};

export function listarPlantillas(): InfoPlantilla[] {
  const carpetaTemplates = path.join(process.cwd(), "templates");

  return CATEGORIAS_DISPONIBLES.map((c) => {
    const archivo = nombrePlantilla(c.valor);
    const ruta = path.join(carpetaTemplates, archivo);
    const existe = fs.existsSync(ruta);

    let tamanoBytes = 0;
    let actualizadoEl: string | null = null;
    let totalMarcadores = 0;
    let marcadoresSinMapear = 0;

    if (existe) {
      const stat = fs.statSync(ruta);
      tamanoBytes = stat.size;
      actualizadoEl = stat.mtime.toISOString();

      const mapa = mapaParaCategoria(c.valor);
      try {
        const marcadores = extraerMarcadores(fs.readFileSync(ruta));
        totalMarcadores = marcadores.length;
        marcadoresSinMapear = mapa ? marcadores.filter((m) => !(m in mapa)).length : marcadores.length;
      } catch {
        // Si el archivo no es un .docx válido, se deja en 0 y se reporta igual.
      }
    }

    return {
      categoria: c.valor,
      etiqueta: c.etiqueta,
      archivo,
      existe,
      tamanoBytes,
      actualizadoEl,
      totalMarcadores,
      marcadoresSinMapear,
    };
  });
}
