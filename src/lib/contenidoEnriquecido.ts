// Modelo de texto enriquecido "tipo Word" usado por el editor de Plantillas.
// Se guarda como JSON (Parrafo[]) en Plantilla.descripcionVisitaJson: nada de
// HTML crudo en la base de datos, así el generador de Word (servidor) no
// tiene que parsear HTML, solo recorrer esta estructura simple.

export type RunTexto = { t: string; b?: boolean; i?: boolean; u?: boolean };

export type Parrafo = {
  runs: RunTexto[];
  lista?: "bullet" | "numero";
  centrado?: boolean;
};

export function contenidoVacio(): Parrafo[] {
  return [];
}

export function parsearContenido(json: string): Parrafo[] {
  try {
    const datos = JSON.parse(json);
    if (!Array.isArray(datos)) return [];
    return datos;
  } catch {
    return [];
  }
}

// --- Serialización HTML -> Parrafo[] (solo se usa en el navegador, donde sí
// hay DOM real disponible; el editor contentEditable produce este HTML). ---

function estiloDe(nodo: Node, ancestro: { b: boolean; i: boolean; u: boolean }) {
  const estilo = { ...ancestro };
  if (nodo.nodeType !== Node.ELEMENT_NODE) return estilo;
  const tag = (nodo as HTMLElement).tagName;
  if (tag === "B" || tag === "STRONG") estilo.b = true;
  if (tag === "I" || tag === "EM") estilo.i = true;
  if (tag === "U") estilo.u = true;
  return estilo;
}

// Recorre un bloque (DIV/P/LI) y devuelve una lista de "segmentos" (cada
// <br> separa un segmento, que se vuelve un párrafo propio).
function segmentosDeBloque(bloque: Node): RunTexto[][] {
  const segmentos: RunTexto[][] = [[]];

  function recorrer(nodo: Node, estilo: { b: boolean; i: boolean; u: boolean }) {
    if (nodo.nodeType === Node.TEXT_NODE) {
      const texto = nodo.textContent ?? "";
      if (texto) segmentos[segmentos.length - 1].push({ t: texto, ...estilo });
      return;
    }
    if (nodo.nodeType !== Node.ELEMENT_NODE) return;
    const tag = (nodo as HTMLElement).tagName;
    if (tag === "BR") {
      segmentos.push([]);
      return;
    }
    const nuevoEstilo = estiloDe(nodo, estilo);
    nodo.childNodes.forEach((hijo) => recorrer(hijo, nuevoEstilo));
  }

  bloque.childNodes.forEach((hijo) => recorrer(hijo, { b: false, i: false, u: false }));
  return segmentos;
}

function limpiarRuns(runs: RunTexto[]): RunTexto[] {
  return runs.filter((r) => r.t.length > 0);
}

export function htmlAContenido(raiz: HTMLElement): Parrafo[] {
  const parrafos: Parrafo[] = [];

  function agregarBloque(bloque: Node, opciones: { lista?: "bullet" | "numero"; centrado?: boolean } = {}) {
    for (const runs of segmentosDeBloque(bloque)) {
      const limpios = limpiarRuns(runs);
      if (limpios.length === 0 && parrafos.length > 0 && parrafos[parrafos.length - 1].runs.length === 0) continue;
      parrafos.push({ runs: limpios, ...opciones });
    }
  }

  raiz.childNodes.forEach((nodo) => {
    if (nodo.nodeType === Node.TEXT_NODE) {
      const texto = nodo.textContent?.trim();
      if (texto) parrafos.push({ runs: [{ t: texto }] });
      return;
    }
    if (nodo.nodeType !== Node.ELEMENT_NODE) return;
    const el = nodo as HTMLElement;
    const tag = el.tagName;
    const centrado = el.style.textAlign === "center";

    if (tag === "UL" || tag === "OL") {
      const lista = tag === "UL" ? "bullet" : "numero";
      el.querySelectorAll(":scope > li").forEach((li) => agregarBloque(li, { lista, centrado }));
      return;
    }
    if (tag === "DIV" || tag === "P") {
      agregarBloque(el, { centrado });
      return;
    }
    if (tag === "BR") return;
  });

  return parrafos;
}

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function runsAHtml(runs: RunTexto[]): string {
  return runs
    .map((r) => {
      let t = escaparHtml(r.t);
      if (r.b) t = `<b>${t}</b>`;
      if (r.i) t = `<i>${t}</i>`;
      if (r.u) t = `<u>${t}</u>`;
      return t;
    })
    .join("");
}

// Reconstruye el HTML inicial del editor a partir del contenido guardado.
export function contenidoAHtml(parrafos: Parrafo[]): string {
  if (parrafos.length === 0) return "<div><br></div>";

  const html: string[] = [];
  let listaActual: { tipo: "bullet" | "numero"; items: string[] } | null = null;

  function cerrarLista() {
    if (!listaActual) return;
    const tag = listaActual.tipo === "bullet" ? "ul" : "ol";
    html.push(`<${tag}>${listaActual.items.map((i) => `<li>${i}</li>`).join("")}</${tag}>`);
    listaActual = null;
  }

  for (const p of parrafos) {
    const contenido = runsAHtml(p.runs) || "<br>";
    if (p.lista) {
      if (!listaActual || listaActual.tipo !== p.lista) {
        cerrarLista();
        listaActual = { tipo: p.lista, items: [] };
      }
      listaActual.items.push(contenido);
      continue;
    }
    cerrarLista();
    const estilo = p.centrado ? ' style="text-align:center"' : "";
    html.push(`<div${estilo}>${contenido}</div>`);
  }
  cerrarLista();

  return html.join("");
}
