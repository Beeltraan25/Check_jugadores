/**
 * Interpreta el texto de un horario de salidas (sacado de un PDF o pegado a mano) y lo
 * convierte en partidas: hora, tee de salida y jugadores.
 *
 * Funciona con los formatos habituales:
 *   08:00  1   GARCIA LOPEZ, JUAN     CM1234567   12,4   INDEPENDIENTE   ← un jugador por línea
 *   08:00  1   MARTIN RUIZ, ANA       ...                               ← misma hora = misma partida
 *   08:10 Tee 10  Pérez, Luis   Gómez, Eva   Ruiz, Pablo                ← varios en una línea
 *   SALIDAS POR EL TEE 10                                               ← cabecera que cambia el tee
 *
 * No hace falta que acierte al 100 %: la pantalla de importación enseña el resultado y se
 * puede corregir antes de guardar.
 */

export interface PartidaImportada {
  /** "HH:MM" */
  hora: string;
  hoyoSalida: number;
  jugadores: string[];
}

export interface ResultadoImportacion {
  partidas: PartidaImportada[];
  /** Fecha encontrada en el documento (AAAA-MM-DD), si la hay. */
  fecha: string | null;
  /** Posible nombre del torneo (primera línea con aspecto de título). */
  nombre: string | null;
  /** Líneas con algo que parece un jugador pero no se ha podido colocar en ninguna partida. */
  ignoradas: string[];
}

/** En golf una partida tiene como mucho 4 jugadores. */
const MAX_JUGADORES = 4;

// Hora "08:00" en cualquier sitio (pero no "16:12:35", que es la hora de impresión),
// o "8.00" / "8h00" solo al principio de la línea.
const RE_HORA = /(?<![\d:])([01]?\d|2[0-3]):([0-5]\d)(?![\d:])/;
const RE_HORA_INICIO = /^\s*([01]?\d|2[0-3])[.hH]([0-5]\d)(?!\d)/;
const RE_TEE = /\b(?:tee|t|hoyo)\s*(?:del?\s*)?[:.º#nN°]*\s*(\d{1,2})\b/i;
const RE_CABECERA_TEE = /\b(?:tee|hoyo)\s*(?:del?\s*)?[:.º#nN°]*\s*(1|10)\b/i;

/** Palabras que nunca forman parte de un nombre: cabeceras, clubes, categorías, barras… */
const PALABRAS_NO_NOMBRE = new Set(
  [
    'hora', 'horas', 'salida', 'salidas', 'tee', 'tees', 'hoyo', 'jugador', 'jugadores', 'nombre', 'nombres', 'apellidos',
    'licencia', 'lic', 'hcp', 'hcpe', 'hándicap', 'handicap', 'exacto', 'juego', 'club', 'clubs', 'categoría', 'categoria',
    'cat', 'nivel', 'partida', 'grupo', 'barras', 'orden', 'página', 'pagina', 'fecha', 'torneo', 'prueba', 'ronda',
    'modalidad', 'stableford', 'medal', 'scratch', 'caballeros', 'damas', 'senior', 'seniors', 'junior', 'juniors',
    'infantil', 'cadete', 'alevín', 'alevin', 'masculino', 'femenino', 'masc', 'fem',
    'amarillas', 'blancas', 'azules', 'naranjas', 'hombres', 'mujeres', 'independiente', 'ind',
    'golf', 'c.g.', 'r.c.g.', 'rcg', 'cg', 'cc', 'c.c.', 'country', 'sociedad', 'asociación', 'asociacion',
    'federación', 'federacion', 'rfeg', 'total', 'resultado', 'resultados', 'clasificación', 'clasificacion', 'equipo',
  ].map((p) => p.toLowerCase()),
);

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'das', 'do', 'dos', 'van', 'von', 'di']);

const MESES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const dosCifras = (n: number) => String(n).padStart(2, '0');

/**
 * Busca la fecha del torneo (05/11/2026, 5-11-26, 01.11.2026 o "5 de noviembre de 2026") y la
 * devuelve como AAAA-MM-DD. Si hay varias, gana la que va detrás de "Fecha" y se descartan
 * las de impresión del listado ("Fecha Listado: 31/10/2026").
 */
export function detectarFecha(texto: string): string | null {
  const candidatas: { fecha: string; peso: number; posicion: number }[] = [];
  const pesoSegun = (posicion: number) => {
    const inicioLinea = texto.lastIndexOf('\n', posicion) + 1;
    const antes = texto.slice(Math.max(inicioLinea, posicion - 30), posicion);
    if (/listado|impres|emisi[oó]n|generad|actualizad/i.test(antes)) return 0;
    return /fecha/i.test(antes) ? 2 : 1;
  };

  for (const m of texto.matchAll(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4}|\d{2})\b/g)) {
    const [, d, mes, a] = m;
    const anio = a.length === 2 ? 2000 + Number(a) : Number(a);
    if (Number(mes) < 1 || Number(mes) > 12 || Number(d) < 1 || Number(d) > 31) continue;
    candidatas.push({ fecha: `${anio}-${dosCifras(Number(mes))}-${dosCifras(Number(d))}`, peso: pesoSegun(m.index), posicion: m.index });
  }
  for (const m of texto.matchAll(/\b(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de\s+|del\s+)?(\d{4})\b/gi)) {
    const mes = MESES[m[2].toLowerCase()];
    if (!mes) continue;
    candidatas.push({ fecha: `${m[3]}-${dosCifras(mes)}-${dosCifras(Number(m[1]))}`, peso: pesoSegun(m.index), posicion: m.index });
  }
  const validas = candidatas.filter((c) => c.peso > 0).sort((a, b) => b.peso - a.peso || a.posicion - b.posicion);
  return validas[0]?.fecha ?? null;
}

/** "GARCIA LOPEZ, JUAN" → "Garcia Lopez, Juan". Si ya viene en minúsculas/mixto, se deja igual. */
export function formatearNombre(nombre: string): string {
  const limpio = nombre.replace(/\s*,\s*/g, ', ').replace(/\s+/g, ' ').replace(/^[,.\s]+|[,.\s]+$/g, '');
  if (limpio !== limpio.toUpperCase()) return limpio;
  return limpio
    .toLowerCase()
    .split(' ')
    .map((palabra, i) =>
      i > 0 && PARTICULAS.has(palabra.replace(',', ''))
        ? palabra
        : palabra.replace(/(^|[-'])(\p{L})/gu, (_, sep: string, letra: string) => sep + letra.toUpperCase()),
    )
    .join(' ');
}

/** Como formatearNombre, pero respeta los números romanos de los títulos ("XXV Torneo…"). */
export function formatearTitulo(titulo: string): string {
  const romanos = new Set(titulo.split(/\s+/).filter((p) => /^[IVXLCDM]{2,}$/.test(p)));
  return formatearNombre(titulo)
    .split(' ')
    .map((p) => (romanos.has(p.toUpperCase()) ? p.toUpperCase() : p))
    .join(' ');
}

const esPalabraDeNombre = (token: string) => {
  const sinPuntuacion = token.replace(/[,.]/g, '');
  return (
    /^[\p{L}'´`\-.,]+$/u.test(token) &&
    /\p{L}{2,}/u.test(sinPuntuacion) &&
    !PALABRAS_NO_NOMBRE.has(token.toLowerCase().replace(/,$/, '')) &&
    !PALABRAS_NO_NOMBRE.has(sinPuntuacion.toLowerCase())
  );
};

/**
 * Candidatos a nombre de una línea. Se separa en "celdas" (huecos de 2+ espacios, tabuladores,
 * barras o punto y coma) y en cada celda se busca el tramo más largo de palabras que parecen
 * un nombre (sin números ni palabras de cabecera/club).
 */
function candidatosDeLinea(texto: string): string[] {
  const celdas = texto
    .replace(/,(?=\S)/g, ', ') // "GARCIA,JUAN" → "GARCIA, JUAN"
    .split(/\s{2,}|\t|\s*\|\s*|\s*;\s*/)
    .filter((c) => c.trim());
  const nombres: string[] = [];
  for (const celda of celdas) {
    const tramos: string[][] = [[]];
    for (const token of celda.trim().split(/\s+/)) {
      if (esPalabraDeNombre(token)) tramos[tramos.length - 1].push(token);
      else if (tramos[tramos.length - 1].length) tramos.push([]);
    }
    const validos = tramos.filter((t) => t.length >= 2); // nombre + apellido como mínimo
    if (validos.length === 0) continue;
    // Preferencia: el que tiene coma ("Apellidos, Nombre"), luego el más largo, luego el primero.
    validos.sort((a, b) => Number(b.join(' ').includes(',')) - Number(a.join(' ').includes(',')) || b.length - a.length);
    nombres.push(validos[0].join(' '));
  }
  return nombres;
}

interface LineaAnalizada {
  original: string;
  hora: string | null;
  tee: number | null;
  nombres: string[];
  cabeceraTee: number | null;
}

function analizarLinea(linea: string): LineaAnalizada {
  const original = linea.trim();
  let hora: string | null = null;
  let resto = original;

  const m = original.match(RE_HORA) ?? original.match(RE_HORA_INICIO);
  if (m && m.index !== undefined) {
    hora = `${dosCifras(Number(m[1]))}:${m[2]}`;
    resto = original.slice(m.index + m[0].length);
  }

  let tee: number | null = null;
  const conPalabra = original.match(RE_TEE);
  if (conPalabra && Number(conPalabra[1]) >= 1 && Number(conPalabra[1]) <= 18) {
    tee = Number(conPalabra[1]);
    resto = resto.replace(conPalabra[0], ' ');
  } else if (hora) {
    // Número suelto justo después de la hora: "08:00  10  GARCIA…" (columna "Tee").
    // Solo 1 o 10: otro número ahí suele ser el nº de partida, no el tee.
    const suelto = resto.match(/^\s*(1|10)(?=\s{2,}|\t|\s*\||\s*$|\s+\p{L})/u);
    if (suelto) {
      tee = Number(suelto[1]);
      resto = resto.slice(suelto[0].length);
    }
  }

  const cabecera = !hora ? original.match(RE_CABECERA_TEE) : null;
  return {
    original,
    hora,
    tee,
    nombres: candidatosDeLinea(resto),
    cabeceraTee: cabecera ? Number(cabecera[1]) : null,
  };
}

const RE_TITULO = /\b(torneo|copa|trofeo|campeonato|open|liga|memorial|premio|circuito|pro-?am|match|social|ranking|torneig|clásico|clasico)\b/i;

const quitarFecha = (texto: string) =>
  texto
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[-–,]?\s*\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b.*$/, '')
    .replace(/\s*[-–,]?\s*\b\d{1,2}\s+de\s+\p{L}+\s+(?:de\s+|del\s+)?\d{4}\b.*$/iu, '');

/**
 * Nombre del torneo: primero se busca una línea con "Torneo", "Copa", "Trofeo"…; si no hay,
 * la primera línea con pinta de título (sin hora, sin ser cabecera de tabla).
 */
function detectarNombre(lineas: LineaAnalizada[]): string | null {
  const primeras = lineas.slice(0, 15).filter((l) => !l.hora && l.original.length >= 4);
  const conPalabraClave = primeras.find((l) => RE_TITULO.test(l.original) && quitarFecha(l.original).length >= 4);
  if (conPalabraClave) return formatearTitulo(quitarFecha(conPalabraClave.original));
  for (const l of primeras) {
    const palabras = l.original.split(/\s+/);
    const cabecera = palabras.filter((p) => PALABRAS_NO_NOMBRE.has(p.toLowerCase().replace(/[.:]$/, ''))).length;
    if (/\p{L}{3,}/u.test(l.original) && cabecera < palabras.length / 2 && !/^\d/.test(l.original)) {
      return formatearTitulo(quitarFecha(l.original));
    }
  }
  return null;
}

export function interpretarHorario(lineas: string[]): ResultadoImportacion {
  const analizadas = lineas.map(analizarLinea).filter((l) => l.original);

  // Si la mayoría de nombres vienen como "Apellidos, Nombre", lo que no lleve coma
  // (p. ej. el nombre del club en otra columna) no se toma como jugador.
  const todos = analizadas.flatMap((l) => (l.hora || l.nombres.length ? l.nombres : []));
  const conComa = todos.filter((n) => n.includes(',')).length;
  const exigirComa = todos.length >= 4 && conComa / todos.length >= 0.6;

  const partidas: PartidaImportada[] = [];
  const ignoradas: string[] = [];
  let teeActual = 1;

  for (const l of analizadas) {
    // Con "exigir coma" se acepta también un nombre sin coma si es lo único de la línea y
    // tiene 3 palabras o más (nombres largos cortados, p. ej. "LADRON DE GUEVARA LUCA DE TENA").
    const nombres = (
      exigirComa
        ? l.nombres.filter((n) => n.includes(',') || (l.nombres.length === 1 && n.split(/\s+/).length >= 3))
        : l.nombres
    ).map(formatearNombre);

    if (!l.hora) {
      if (l.cabeceraTee) {
        teeActual = l.cabeceraTee;
        continue;
      }
      const actual = partidas.at(-1);
      if (actual && nombres.length && actual.jugadores.length + nombres.length <= MAX_JUGADORES) {
        actual.jugadores.push(...nombres);
      } else if (nombres.length && partidas.length) {
        // Cabeceras, nº de página o trozos de nombres de club partidos no se avisan.
        ignoradas.push(l.original);
      }
      continue;
    }

    const tee = l.tee ?? teeActual;
    const anterior = partidas.at(-1);
    const mismaPartida =
      anterior &&
      anterior.hora === l.hora &&
      anterior.hoyoSalida === tee &&
      anterior.jugadores.length + nombres.length <= MAX_JUGADORES;
    if (mismaPartida) anterior.jugadores.push(...nombres);
    else partidas.push({ hora: l.hora, hoyoSalida: tee, jugadores: nombres });
  }

  // Huecos vacíos del horario: se quitan si el resto se ha leído bien. Si casi ninguna partida
  // tiene jugadores, se dejan todas para rellenarlas a mano.
  const conJugadores = partidas.filter((p) => p.jugadores.length > 0);
  const textoCompleto = lineas.join('\n');
  const resultado = conJugadores.length >= partidas.length / 2 ? conJugadores : partidas;
  return {
    // Ordenadas por hora y tee (en salidas a tiro hay muchas partidas a la misma hora).
    partidas: resultado.sort((a, b) => a.hora.localeCompare(b.hora) || a.hoyoSalida - b.hoyoSalida),
    fecha: detectarFecha(textoCompleto),
    nombre: detectarNombre(analizadas),
    ignoradas,
  };
}
