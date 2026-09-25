// Opciones de las preguntas cuyo origen es el módulo Registro (lote, zode,
// municipio, institución, sede, operador) o los usuarios del panel. Las de
// Registro se filtran en cascada según lo ya respondido en la visita: una
// pregunta mira la respuesta MÁS CERCANA ANTERIOR del nivel superior (así, en
// CCT, la sede del comedor satélite se filtra por la institución del comedor
// satélite). El operador pertenece a un zode: se filtra por el zode (o lote)
// de la respuesta de Registro más cercana anterior.
//
// La app móvil replica esta misma lógica en Kotlin (OpcionesRegistro.kt).

export type ItemRegistro = { id: string; nombre: string; padreId: string | null };

export type CatalogoRegistro = {
  lotes: ItemRegistro[];
  zodes: ItemRegistro[];
  municipios: ItemRegistro[];
  instituciones: ItemRegistro[];
  sedes: ItemRegistro[];
  // padreId = id del zode del operador.
  operadores: ItemRegistro[];
};

export type UsuarioCorreo = { correo: string | null; nombre: string };

// Pregunta en el orden de la encuesta, con su respuesta actual.
export type PreguntaFlujo = { id: string; fuenteOpciones: string; valor: string | null | undefined };

const NIVELES = ["LOTE", "ZODE", "MUNICIPIO", "INSTITUCION", "SEDE"] as const;
type Nivel = (typeof NIVELES)[number];

function itemsDe(catalogo: CatalogoRegistro, nivel: Nivel): ItemRegistro[] {
  switch (nivel) {
    case "LOTE":
      return catalogo.lotes;
    case "ZODE":
      return catalogo.zodes;
    case "MUNICIPIO":
      return catalogo.municipios;
    case "INSTITUCION":
      return catalogo.instituciones;
    case "SEDE":
      return catalogo.sedes;
  }
}

// ¿El item (de nivel `nivel`) desciende del item `ancestroId` de nivel `nivelAncestro`?
function desciendeDe(catalogo: CatalogoRegistro, item: ItemRegistro, nivel: number, ancestroId: string, nivelAncestro: number) {
  let actual: ItemRegistro | undefined = item;
  for (let k = nivel; k > nivelAncestro && actual; k--) {
    const padreId: string | null = actual.padreId;
    actual = padreId ? itemsDe(catalogo, NIVELES[k - 1]).find((i) => i.id === padreId) : undefined;
  }
  return actual?.id === ancestroId;
}

// Items posibles para la pregunta en la posición `posicion` del flujo.
function candidatos(catalogo: CatalogoRegistro, flujo: PreguntaFlujo[], posicion: number): ItemRegistro[] {
  const nivel = NIVELES.indexOf(flujo[posicion].fuenteOpciones as Nivel);
  if (nivel < 0) return [];
  const todos = itemsDe(catalogo, NIVELES[nivel]);

  for (let k = nivel - 1; k >= 0; k--) {
    // Respuesta más cercana anterior del nivel k.
    for (let i = posicion - 1; i >= 0; i--) {
      const previa = flujo[i];
      if (previa.fuenteOpciones !== NIVELES[k] || !previa.valor) continue;
      const elegido = candidatos(catalogo, flujo, i).find((item) => item.nombre === previa.valor);
      if (!elegido) break; // respuesta que ya no existe en Registro: se ignora ese nivel
      return todos.filter((item) => desciendeDe(catalogo, item, nivel, elegido.id, k));
    }
  }
  return todos;
}

// Operadores del zode (o lote) de la respuesta de Registro más cercana anterior;
// todos si todavía no se ha respondido ninguna.
function operadoresPara(catalogo: CatalogoRegistro, flujo: PreguntaFlujo[], posicion: number): ItemRegistro[] {
  for (let i = posicion - 1; i >= 0; i--) {
    const previa = flujo[i];
    const nivel = NIVELES.indexOf(previa.fuenteOpciones as Nivel);
    if (nivel < 0 || !previa.valor) continue;
    const elegido = candidatos(catalogo, flujo, i).find((item) => item.nombre === previa.valor);
    if (!elegido) continue;
    if (nivel === 0) {
      const zodesDelLote = new Set(catalogo.zodes.filter((z) => z.padreId === elegido.id).map((z) => z.id));
      return catalogo.operadores.filter((o) => o.padreId !== null && zodesDelLote.has(o.padreId));
    }
    let zode: ItemRegistro | undefined = elegido;
    for (let k = nivel; k > 1 && zode; k--) {
      const padreId: string | null = zode.padreId;
      zode = padreId ? itemsDe(catalogo, NIVELES[k - 1]).find((item) => item.id === padreId) : undefined;
    }
    if (zode) return catalogo.operadores.filter((o) => o.padreId === zode.id);
  }
  return catalogo.operadores;
}

// Opciones (nombres) para una pregunta; null si sus opciones no vienen de
// Registro/usuarios (se usan las escritas en la pregunta).
export function opcionesDesdeRegistro(
  preguntaId: string,
  flujo: PreguntaFlujo[],
  catalogo: CatalogoRegistro,
  usuarios: UsuarioCorreo[]
): string[] | null {
  const posicion = flujo.findIndex((p) => p.id === preguntaId);
  if (posicion < 0) return null;
  const fuente = flujo[posicion].fuenteOpciones;
  if (fuente === "USUARIO") return usuarios.map((u) => u.correo).filter((c): c is string => Boolean(c));
  if (fuente === "OPERADOR") return [...new Set(operadoresPara(catalogo, flujo, posicion).map((i) => i.nombre))];
  if (!NIVELES.includes(fuente as Nivel)) return null;
  return [...new Set(candidatos(catalogo, flujo, posicion).map((i) => i.nombre))];
}
