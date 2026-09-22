// Mismo Web App de Apps Script que ya usa la app móvil/escritorio (acciones
// CREAR_CARPETA, SUBIR_ARCHIVO, GUARDAR_EN_SHEET, BUSCAR_VISITAS...).
const URL_API_SHEET =
  "https://script.google.com/macros/s/AKfycbzGBlv5PmmsJ750HBduaMzW-8-v-W8te3iQe4lUZAxYQvMUUY-F6pY63xVeLfkPh0jWsg/exec";

export type FotoBase64 = { base64: string; mimeType: string };

export type FilaVisita = {
  valores: string[];
  fotos: Record<string, FotoBase64>;
};

export type RespuestaBuscarVisitas = {
  estado: "OK" | "ERROR";
  filas?: FilaVisita[];
  mensaje?: string;
};

export async function buscarVisitas(
  categoria: string,
  fechaIso: string
): Promise<RespuestaBuscarVisitas> {
  try {
    const respuesta = await fetch(URL_API_SHEET, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "BUSCAR_VISITAS", categoria, fecha: fechaIso }),
      redirect: "follow",
      cache: "no-store",
    });

    if (!respuesta.ok) {
      return { estado: "ERROR", mensaje: `Código de respuesta HTTP ${respuesta.status}` };
    }

    const datos = (await respuesta.json()) as RespuestaBuscarVisitas;
    return datos;
  } catch (error) {
    return {
      estado: "ERROR",
      mensaje: error instanceof Error ? error.message : "Error de red desconocido",
    };
  }
}
