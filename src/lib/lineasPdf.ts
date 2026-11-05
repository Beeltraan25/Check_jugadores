/**
 * Reconstruye las líneas de texto de una página de PDF a partir de sus trozos con posición.
 *
 * Los PDF no guardan "líneas", sino trozos de texto con su posición (x, y). Aquí:
 *  - se juntan los trozos que están a la misma altura;
 *  - cuando hay un hueco grande entre dos trozos (cambio de columna de una tabla) se
 *    separan con varios espacios, para que el intérprete lo note;
 *  - si la página tiene varias columnas de partidas en paralelo (como los horarios con dos
 *    listas lado a lado), se lee cada columna por separado. Si no, se mezclarían las
 *    partidas de la izquierda con las de la derecha.
 */

export interface TrozoTexto {
  str: string;
  x: number;
  /** En PDF la y crece hacia arriba. */
  y: number;
  ancho: number;
  alto: number;
}

const RE_HORA_SUELTA = /^\s*([01]?\d|2[0-3])[:.]([0-5]\d)\s*$/;
const esHora = (t: TrozoTexto) => RE_HORA_SUELTA.test(t.str);
/** Líneas de subrayado "_____" o "-----" que no cuentan como texto. */
const esSeparador = (t: TrozoTexto) => /^[\s_\-–—=.·]+$/.test(t.str);

function agruparEnFilas(trozos: TrozoTexto[]): string[] {
  const filas: { y: number; alto: number; trozos: TrozoTexto[] }[] = [];
  for (const t of trozos) {
    const fila = filas.find((f) => Math.abs(f.y - t.y) < Math.max(f.alto, t.alto) * 0.5);
    if (fila) fila.trozos.push(t);
    else filas.push({ y: t.y, alto: t.alto, trozos: [t] });
  }
  filas.sort((a, b) => b.y - a.y);

  const lineas: string[] = [];
  for (const fila of filas) {
    fila.trozos.sort((a, b) => a.x - b.x);
    let texto = '';
    let finAnterior: number | null = null;
    for (const t of fila.trozos) {
      if (finAnterior !== null) {
        const hueco = t.x - finAnterior;
        // Hueco grande (otra columna) o trozos que se solapan: separación clara.
        if (hueco > fila.alto * 0.9 || hueco < -1) texto += '   ';
        else if (hueco > fila.alto * 0.12 && !texto.endsWith(' ') && !t.str.startsWith(' ')) texto += ' ';
      }
      texto += t.str;
      finAnterior = t.x + t.ancho;
    }
    if (texto.trim()) lineas.push(texto.trimEnd());
  }
  return lineas;
}

/**
 * Busca columnas de partidas: horas alineadas en dos (o más) posiciones x distintas.
 * Devuelve las x por donde cortar la página (vacío si solo hay una columna).
 * Recibe solo el cuerpo de la página: un título ancho en la cabecera taparía el hueco.
 */
function cortesDeColumnas(trozos: TrozoTexto[]): number[] {
  const horas = trozos.filter(esHora).sort((a, b) => a.x - b.x);
  const grupos: TrozoTexto[][] = [];
  for (const h of horas) {
    const ultimo = grupos.at(-1);
    if (ultimo && h.x - ultimo[0].x < 20) ultimo.push(h);
    else grupos.push([h]);
  }
  const columnasDeHoras = grupos.filter((g) => g.length >= 2);
  if (columnasDeHoras.length < 2) return [];

  const ocupados = trozos.map((t) => [t.x, t.x + t.ancho] as const);
  const cortes: number[] = [];
  for (let i = 0; i < columnasDeHoras.length - 1; i++) {
    // El corte va en el hueco vacío más ancho entre una columna de horas y la siguiente.
    const desde = Math.max(...columnasDeHoras[i].map((h) => h.x + h.ancho));
    const hasta = Math.min(...columnasDeHoras[i + 1].map((h) => h.x));
    const tramos = ocupados.filter(([a, b]) => b > desde && a < hasta).sort((p, q) => p[0] - q[0]);
    let mejor = { inicio: desde, ancho: 0 };
    let cursor = desde;
    for (const [a, b] of tramos) {
      if (a - cursor > mejor.ancho) mejor = { inicio: cursor, ancho: a - cursor };
      cursor = Math.max(cursor, b);
    }
    if (hasta - cursor > mejor.ancho) mejor = { inicio: cursor, ancho: hasta - cursor };
    cortes.push(mejor.inicio + mejor.ancho / 2);
  }
  return cortes;
}

export function construirLineas(trozosPagina: TrozoTexto[]): string[] {
  // Fuera los vacíos y las líneas de subrayado: no aportan nada y, si caen a la misma altura
  // que un nombre, se le pegarían ("_____FANTOVA SICRE, …").
  const trozos = trozosPagina.filter((t) => t.str.trim() !== '' && !esSeparador(t));
  const horas = trozos.filter(esHora);
  if (horas.length < 4) return agruparEnFilas(trozos);

  // La cabecera (título, fecha…) está por encima de la primera hora y ocupa todo el ancho:
  // va entera y antes que las columnas.
  const techo = Math.max(...horas.map((h) => h.y)) + Math.max(...horas.map((h) => h.alto)) * 1.5;
  const cabecera = trozos.filter((t) => t.y > techo);
  const cuerpo = trozos.filter((t) => t.y <= techo);
  const cortes = cortesDeColumnas(cuerpo);
  if (cortes.length === 0) return agruparEnFilas(trozos);

  const columnas: TrozoTexto[][] = Array.from({ length: cortes.length + 1 }, () => []);
  for (const t of cuerpo) columnas[cortes.filter((c) => t.x >= c).length].push(t);
  return [...agruparEnFilas(cabecera), ...columnas.flatMap(agruparEnFilas)];
}
