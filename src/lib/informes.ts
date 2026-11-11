/**
 * Informes de ritmo SIN NOMBRES: por partida, por torneo y comparando organizadores.
 *
 * Cómo se mide el ritmo real de una partida:
 *   En cada vista se sabe cuánto tiempo llevan jugando (hora vista − hora de salida) y cuánto
 *   deberían llevar para estar en ese punto del campo según el objetivo (15 min por hoyo).
 *   Con la última vista:  ritmo = objetivo × (minutos reales / minutos ideales).
 *   Ej.: vistos en el 3er golpe del hoyo 5 a los 80 min. Ideal: 4 hoyos × 15 + 9,4 = 69,4 min.
 *        Ritmo = 15 × 80 / 69,4 = 17,3 min por hoyo → la vuelta les saldría en 5 h 11 min.
 *   Si la partida se marcó como terminada, la duración es la real (terminada − salida).
 */
import type { Avistamiento, Partida, Torneo } from '../datos/tipos';
import { esSalidas } from './jornadas';
import { CONFIG_RITMO, clasificarRetraso, duracionVueltaMin, minutoInicioHoyo, type EstadoRitmo } from './ritmo';

const TOTAL_HOYOS = CONFIG_RITMO.minutosPorHoyo.length;
/** Minutos por hoyo del objetivo (15). */
export const OBJETIVO_MIN_HOYO = duracionVueltaMin() / TOTAL_HOYOS;
/** Por debajo de esto (3 hoyos jugados) la vista es demasiado temprana para estimar el ritmo de la vuelta. */
const MINUTOS_IDEALES_MINIMOS = 45;

const MS_MINUTO = 60_000;
const media = (valores: number[]) => (valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null);

/** Minutos que debería llevar jugando la partida al estar en ese hoyo y posición (mitad del tramo). */
export function minutosIdealesHasta(a: Pick<Avistamiento, 'hoyo' | 'posicion'>, hoyoSalida: number): number {
  const [desde, hasta] = CONFIG_RITMO.tramos[a.posicion];
  return minutoInicioHoyo(a.hoyo, hoyoSalida) + ((desde + hasta) / 2) * CONFIG_RITMO.minutosPorHoyo[a.hoyo - 1];
}

const VARIANTES: Record<string, string> = {
  a: '[aáàâä]',
  e: '[eéèêë]',
  i: '[iíìîï]',
  o: '[oóòôö]',
  u: '[uúùûü]',
  n: '[nñ]',
  c: '[cç]',
};

/**
 * Quita los nombres de los jugadores de un texto (observaciones): cada nombre o apellido de
 * la partida que aparezca se cambia por "[jugador]".
 */
export function anonimizarTexto(texto: string, nombres: string[]): string {
  const particulas = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'san']);
  const palabras = new Set(
    nombres
      .flatMap((n) => n.split(/[\s,]+/))
      .map((p) => p.trim())
      .filter((p) => p.length >= 3 && !particulas.has(p.toLowerCase())),
  );
  let resultado = texto;
  for (const palabra of [...palabras].sort((a, b) => b.length - a.length)) {
    // "Garcia" del PDF también tacha "García" escrito a mano (y "Nunez" a "Nuñez").
    const escapada = palabra
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/[aeiounc]/gi, (letra) => VARIANTES[letra.toLowerCase()] ?? letra);
    // Sin "lookbehind" para que funcione en Safari antiguo.
    resultado = resultado.replace(new RegExp(`(^|[^\\p{L}])${escapada}(?=[^\\p{L}]|$)`, 'giu'), '$1[jugador]');
  }
  return resultado.replace(/\[jugador\](?:[\s,]+\[jugador\])+/g, '[jugador]');
}

export interface RitmoPartida {
  id: string;
  /** Nº de la partida en el torneo, por hora de salida y tee (1, 2, 3…). */
  numero: number;
  /** "Partida 05" — lo único que la identifica, sin nombres. */
  etiqueta: string;
  horaSalida: string;
  hoyoSalida: number;
  jugadores: number;
  buggies: number;
  carros: number;
  vistas: Avistamiento[];
  retrasoMedio: number | null;
  retrasoFinal: number | null;
  peorRetraso: number | null;
  /** Retraso de la última vista − el de la primera (+ fueron perdiendo tiempo). */
  evolucion: number | null;
  estadoFinal: EstadoRitmo | null;
  llegoARojo: boolean;
  /** Ritmo real estimado (minutos por hoyo). */
  minutosPorHoyo: number | null;
  /** Duración de la vuelta: real si se marcó terminada; si no, estimada con su ritmo. */
  duracionMin: number | null;
  duracionReal: boolean;
  /** Observaciones del Marshal, sin nombres. */
  observaciones: string;
  /** Si en las observaciones consta que se les avisó. */
  avisada: boolean;
}

export function ritmoDePartida(p: Partida, numero: number): RitmoPartida {
  const vistas = [...p.avistamientos].sort((a, b) => a.visto_en.localeCompare(b.visto_en));
  const retrasos = vistas.map((v) => v.retraso_min);
  const ultima = vistas.at(-1) ?? null;
  const salida = new Date(p.hora_salida).getTime();

  let minutosPorHoyo: number | null = null;
  if (ultima) {
    const ideales = minutosIdealesHasta(ultima, p.hoyo_salida);
    const reales = (new Date(ultima.visto_en).getTime() - salida) / MS_MINUTO;
    if (ideales >= MINUTOS_IDEALES_MINIMOS && reales > 0) minutosPorHoyo = (OBJETIVO_MIN_HOYO * reales) / ideales;
  }

  const realTerminada = p.terminada_en ? (new Date(p.terminada_en).getTime() - salida) / MS_MINUTO : null;
  // Una duración "real" de menos de 2 h o más de 8 h es que se marcó terminada por error.
  const duracionReal = realTerminada !== null && realTerminada >= 120 && realTerminada <= 480;
  const duracionMin = duracionReal ? realTerminada : minutosPorHoyo !== null ? minutosPorHoyo * TOTAL_HOYOS : null;

  const observaciones = anonimizarTexto(
    p.observaciones.trim(),
    p.jugadores.map((j) => j.nombre),
  );
  const retrasoFinal = ultima?.retraso_min ?? null;

  return {
    id: p.id,
    numero,
    etiqueta: `Partida ${String(numero).padStart(2, '0')}`,
    horaSalida: p.hora_salida,
    hoyoSalida: p.hoyo_salida,
    jugadores: p.jugadores.length,
    buggies: p.jugadores.filter((j) => j.alquiler?.tipo === 'buggy').length,
    carros: p.jugadores.filter((j) => j.alquiler?.tipo === 'carro_electrico').length,
    vistas,
    retrasoMedio: media(retrasos),
    retrasoFinal,
    peorRetraso: retrasos.length ? Math.max(...retrasos) : null,
    evolucion: vistas.length >= 2 ? retrasos[retrasos.length - 1] - retrasos[0] : null,
    estadoFinal: retrasoFinal === null ? null : clasificarRetraso(retrasoFinal),
    llegoARojo: retrasos.some((r) => clasificarRetraso(r) === 'retrasado'),
    minutosPorHoyo,
    duracionMin,
    duracionReal,
    observaciones,
    avisada: /avisad|aviso|juego lento/i.test(p.observaciones),
  };
}

export interface ResumenRitmoTorneo {
  partidas: RitmoPartida[];
  numPartidas: number;
  /** Partidas con al menos una vista. */
  partidasVistas: number;
  jugadores: number;
  vistas: number;
  minutosPorHoyo: number | null;
  duracionMedia: number | null;
  retrasoMedioFinal: number | null;
  enVerde: number;
  enAmbar: number;
  enRojo: number;
  llegaronARojo: number;
  avisadas: number;
  porHoyo: { hoyo: number; vistas: number; retrasoMedio: number | null }[];
  masLentas: RitmoPartida[];
  masRapidas: RitmoPartida[];
}

export function resumirRitmoTorneo(partidas: Partida[]): ResumenRitmoTorneo {
  const ordenadas = [...partidas].sort(
    (a, b) => a.hora_salida.localeCompare(b.hora_salida) || a.hoyo_salida - b.hoyo_salida,
  );
  const ritmos = ordenadas.map((p, i) => ritmoDePartida(p, i + 1));
  const vistas = ritmos.flatMap((r) => r.vistas);
  const conRitmo = ritmos.filter((r) => r.minutosPorHoyo !== null);
  const porRitmo = [...conRitmo].sort((a, b) => a.minutosPorHoyo! - b.minutosPorHoyo!);

  return {
    partidas: ritmos,
    numPartidas: ritmos.length,
    partidasVistas: ritmos.filter((r) => r.vistas.length).length,
    jugadores: ritmos.reduce((s, r) => s + r.jugadores, 0),
    vistas: vistas.length,
    minutosPorHoyo: media(conRitmo.map((r) => r.minutosPorHoyo!)),
    duracionMedia: media(ritmos.flatMap((r) => (r.duracionMin === null ? [] : [r.duracionMin]))),
    retrasoMedioFinal: media(ritmos.flatMap((r) => (r.retrasoFinal === null ? [] : [r.retrasoFinal]))),
    enVerde: ritmos.filter((r) => r.estadoFinal === 'en_tiempo' || r.estadoFinal === 'adelantado').length,
    enAmbar: ritmos.filter((r) => r.estadoFinal === 'aviso').length,
    enRojo: ritmos.filter((r) => r.estadoFinal === 'retrasado').length,
    llegaronARojo: ritmos.filter((r) => r.llegoARojo).length,
    avisadas: ritmos.filter((r) => r.avisada).length,
    porHoyo: Array.from({ length: TOTAL_HOYOS }, (_, i) => {
      const delHoyo = vistas.filter((v) => v.hoyo === i + 1);
      return { hoyo: i + 1, vistas: delHoyo.length, retrasoMedio: media(delHoyo.map((v) => v.retraso_min)) };
    }),
    masLentas: porRitmo.slice(-3).reverse(),
    masRapidas: porRitmo.slice(0, 3),
  };
}

// --- Comparativa de organizadores -------------------------------------------------

export const SIN_ORGANIZADOR = 'Sin organizador';
/** Nombre con el que se agrupan los días de juego normal (sin torneo) en la comparativa. */
export const SALIDAS_NORMALES = 'Salidas normales (sin torneo)';

/** Para agrupar "Golf Events", "golf events " y "Gólf Events" como el mismo organizador. */
const claveOrganizador = (nombre: string) =>
  nombre.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ');

export interface ResumenOrganizador {
  nombre: string;
  /** true = no es un organizador: es el juego normal, que sirve de referencia para comparar. */
  referencia: boolean;
  torneos: { torneo: Torneo; resumen: ResumenRitmoTorneo }[];
  numPartidas: number;
  partidasConRitmo: number;
  /** Media de todas sus partidas (no de sus torneos), para no dar el mismo peso a un torneo de 5 partidas que a uno de 30. */
  minutosPorHoyo: number | null;
  duracionMedia: number | null;
  retrasoMedioFinal: number | null;
  /** % de sus partidas vistas que llegaron a rojo en algún momento. */
  porcentajeRojo: number | null;
  avisadas: number;
}

export function compararOrganizadores(datos: { torneo: Torneo; partidas: Partida[] }[]): ResumenOrganizador[] {
  const grupos = new Map<string, { nombres: string[]; torneos: { torneo: Torneo; resumen: ResumenRitmoTorneo }[] }>();
  for (const { torneo, partidas } of datos) {
    const nombre = esSalidas(torneo) ? SALIDAS_NORMALES : torneo.organizador.trim() || SIN_ORGANIZADOR;
    const clave = claveOrganizador(nombre);
    const grupo = grupos.get(clave) ?? { nombres: [], torneos: [] };
    grupo.nombres.push(nombre);
    grupo.torneos.push({ torneo, resumen: resumirRitmoTorneo(partidas) });
    grupos.set(clave, grupo);
  }

  const resumenes = [...grupos.values()].map(({ nombres, torneos }): ResumenOrganizador => {
    const partidas = torneos.flatMap((t) => t.resumen.partidas);
    const vistas = partidas.filter((p) => p.vistas.length);
    const conRitmo = partidas.filter((p) => p.minutosPorHoyo !== null);
    // Nombre más repetido (por si se escribió de varias formas).
    const nombre = [...nombres].sort((a, b) => nombres.filter((n) => n === b).length - nombres.filter((n) => n === a).length)[0];
    return {
      nombre,
      referencia: torneos.every((t) => esSalidas(t.torneo)),
      torneos: [...torneos].sort((a, b) => b.torneo.fecha.localeCompare(a.torneo.fecha)),
      numPartidas: partidas.length,
      partidasConRitmo: conRitmo.length,
      minutosPorHoyo: media(conRitmo.map((p) => p.minutosPorHoyo!)),
      duracionMedia: media(partidas.flatMap((p) => (p.duracionMin === null ? [] : [p.duracionMin]))),
      retrasoMedioFinal: media(partidas.flatMap((p) => (p.retrasoFinal === null ? [] : [p.retrasoFinal]))),
      porcentajeRojo: vistas.length ? (100 * vistas.filter((p) => p.llegoARojo).length) / vistas.length : null,
      avisadas: partidas.filter((p) => p.avisada).length,
    };
  });

  // Del más rápido al más lento; los que no tienen datos, al final.
  return resumenes.sort((a, b) => {
    if (a.minutosPorHoyo === null) return 1;
    if (b.minutosPorHoyo === null) return -1;
    return a.minutosPorHoyo - b.minutosPorHoyo;
  });
}

// --- Formatos ----------------------------------------------------------------------

/** 291 → "4 h 51 min" */
export function textoDuracion(minutos: number | null): string {
  if (minutos === null) return '—';
  const total = Math.round(minutos);
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, '0')} min`;
}

/** 16.27 → "16,3 min/hoyo" */
export function textoRitmo(minutosPorHoyo: number | null): string {
  if (minutosPorHoyo === null) return '—';
  return `${minutosPorHoyo.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} min/hoyo`;
}

/** Color de un ritmo: lo que tardarían de más en la vuelta completa, con los mismos límites que el retraso. */
export function estadoDeRitmo(minutosPorHoyo: number | null): EstadoRitmo | null {
  if (minutosPorHoyo === null) return null;
  return clasificarRetraso((minutosPorHoyo - OBJETIVO_MIN_HOYO) * TOTAL_HOYOS);
}

/** Resumen en frases para encabezar el informe de un torneo. */
export function conclusionTorneo(r: ResumenRitmoTorneo): string[] {
  if (r.vistas === 0) return ['Todavía no hay vistas del Marshal en este torneo.'];
  const frases: string[] = [];
  if (r.minutosPorHoyo !== null) {
    const objetivo = duracionVueltaMin();
    const vuelta = r.minutosPorHoyo * TOTAL_HOYOS;
    const diferencia = Math.round(vuelta - objetivo);
    frases.push(
      `De media, las partidas jugaron a ${textoRitmo(r.minutosPorHoyo)} (objetivo: ${textoRitmo(OBJETIVO_MIN_HOYO)}). ` +
        `A ese ritmo la vuelta dura ${textoDuracion(vuelta)}, ` +
        (diferencia > 0
          ? `${diferencia} min más de lo previsto.`
          : diferencia < 0
            ? `${-diferencia} min menos de lo previsto.`
            : 'justo lo previsto.'),
    );
  }
  frases.push(
    `${r.partidasVistas} de ${r.numPartidas} partidas tienen vistas del Marshal (${r.vistas} vistas en total). ` +
      `Al final de su última vista iban: ${r.enVerde} en verde, ${r.enAmbar} en ámbar y ${r.enRojo} en rojo.`,
  );
  if (r.llegaronARojo) frases.push(`${r.llegaronARojo} partidas llegaron a ir con 15 min de retraso o más en algún momento.`);
  if (r.avisadas) frases.push(`Se avisó por juego lento a ${r.avisadas} partidas (según las observaciones).`);
  const conDatos = r.porHoyo.filter((h) => h.retrasoMedio !== null && h.vistas >= 2);
  if (conDatos.length) {
    const peor = conDatos.reduce((a, b) => (b.retrasoMedio! > a.retrasoMedio! ? b : a));
    if (peor.retrasoMedio! > 0) {
      frases.push(`El hoyo con más retraso fue el ${peor.hoyo} (${Math.round(peor.retrasoMedio!)} min de media).`);
    }
  }
  return frases;
}
