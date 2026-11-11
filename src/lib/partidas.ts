/** Funciones de ayuda sobre una partida: su estado actual, su etiqueta, etc. */
import { NOMBRE_ALQUILER, type Avistamiento, type Partida, type TipoAlquiler } from '../datos/tipos';
import { hhmm } from './hora';
import { duracionVueltaMin, type EstadoRitmo, type PosicionEsperada, posicionEsperada } from './ritmo';

/** Si nadie marca una partida como terminada, se da por terminada este tiempo después de su fin ideal. */
const MARGEN_FIN_AUTOMATICO_MIN = 60;

export type Fase = 'pendiente' | 'en_juego' | 'terminada';

export interface ResumenPartida {
  fase: Fase;
  /** Último avistamiento registrado (o null si nadie les ha visto aún). */
  ultimo: Avistamiento | null;
  /** Estado del último avistamiento; null = sin datos todavía. */
  estado: EstadoRitmo | null;
  /** Dónde deberían estar ahora mismo si fueran a su ritmo. */
  esperada: PosicionEsperada;
}

export const salidaDe = (p: Partida) => ({ horaSalida: new Date(p.hora_salida), hoyoSalida: p.hoyo_salida });

export function ultimoAvistamiento(p: Partida): Avistamiento | null {
  return p.avistamientos.at(-1) ?? null;
}

export function resumirPartida(p: Partida, ahora: Date): ResumenPartida {
  const ultimo = ultimoAvistamiento(p);
  const esperada = posicionEsperada(salidaDe(p), ahora);
  const minutosDesdeSalida = (ahora.getTime() - new Date(p.hora_salida).getTime()) / 60_000;
  let fase: Fase = 'en_juego';
  if (p.terminada_en || minutosDesdeSalida > duracionVueltaMin() + MARGEN_FIN_AUTOMATICO_MIN) fase = 'terminada';
  else if (esperada.fase === 'antes_de_salir' && !ultimo) fase = 'pendiente';
  return { fase, ultimo, estado: ultimo?.estado ?? null, esperada };
}

/** "10:20" o "10:20 · T10" si salen por el tee del 10. */
export function etiquetaPartida(p: Partida): string {
  const hora = hhmm(p.hora_salida);
  return p.hoyo_salida === 1 ? hora : `${hora} · T${p.hoyo_salida}`;
}

export function nombresJugadores(p: Partida): string {
  return p.jugadores.map((j) => j.nombre).join(', ') || 'Sin jugadores';
}

/**
 * Apellido para títulos cortos: "García López, Juan" → "García"; "Ana Ruiz Gil" → "Ruiz";
 * "Ana Ruiz" → "Ruiz".
 */
export function apellidoPrincipal(nombre: string): string {
  const limpio = nombre.trim();
  const palabras = limpio.includes(',') ? limpio.split(',')[0].trim().split(/\s+/) : limpio.split(/\s+/);
  const inicio = limpio.includes(',') ? 0 : palabras.length >= 3 ? 1 : palabras.length - 1;
  // "De la Fuente": las partículas van con el apellido que les sigue.
  const apellido: string[] = [];
  for (const palabra of palabras.slice(inicio)) {
    apellido.push(palabra);
    if (!PARTICULAS.has(palabra.toLowerCase())) break;
  }
  return apellido.join(' ');
}

const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'da', 'das', 'do', 'dos', 'van', 'von', 'di']);

/** Título legible: el nombre de la partida o, si no tiene, los apellidos de los jugadores. */
export function tituloPartida(p: Partida): string {
  if (p.nombre.trim()) return p.nombre.trim();
  // Los jugadores apuntados sin nombre ("Jugador 2") no cuentan para el título.
  const conNombre = p.jugadores.filter((j) => !/^jugador \d+$/i.test(j.nombre.trim()));
  const sinNombre = p.jugadores.length - conNombre.length;
  const apellidos = conNombre.map((j) => apellidoPrincipal(j.nombre)).filter(Boolean);
  if (apellidos.length === 0) return p.jugadores.length ? 'Sin nombres' : 'Partida sin jugadores';
  return apellidos.join(' · ') + (sinNombre ? ` +${sinNombre}` : '');
}

/** Texto para buscar una partida por nombre, jugador o nº de carro/buggy. */
export function textoBusqueda(p: Partida): string {
  const alquileres = p.jugadores
    .flatMap((j) => (j.alquiler ? [`${j.alquiler.tipo === 'buggy' ? 'buggy' : 'carro'} ${j.alquiler.numero ?? ''}`] : []))
    .join(' ');
  return `${p.nombre} ${nombresJugadores(p)} ${hhmm(p.hora_salida)} ${alquileres}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function normalizarBusqueda(texto: string): string {
  return texto.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

/**
 * Si ese carro/buggy ya lo lleva otra partida que sigue jugando, devuelve un aviso.
 * (Dentro de la misma partida sí se puede repetir: dos jugadores comparten buggy.)
 */
export function avisoAlquilerOcupado(
  partidas: Partida[],
  tipo: TipoAlquiler | null,
  numero: number | null,
  partidaActualId?: string,
): string | null {
  if (!tipo || numero === null) return null;
  const otra = partidas.find(
    (p) =>
      p.id !== partidaActualId &&
      !p.terminada_en &&
      p.jugadores.some((j) => j.alquiler?.tipo === tipo && j.alquiler.numero === numero),
  );
  return otra ? `${NOMBRE_ALQUILER[tipo]} nº ${numero} ya lo lleva la partida de las ${etiquetaPartida(otra)}.` : null;
}

/** Minutos que lleva una partida sin que nadie la vea (desde su última vista o, si no hay, desde que salió). */
export function minutosSinVer(p: Partida, ahora: Date): number {
  const desde = ultimoAvistamiento(p)?.visto_en ?? p.hora_salida;
  return (ahora.getTime() - new Date(desde).getTime()) / 60_000;
}

/**
 * Orden "más urgentes" para el Marshal: primero las partidas en rojo (la más retrasada antes),
 * después las que llevan más tiempo sin ver. Las que aún no han salido o ya terminaron, al final.
 */
export function compararUrgencia(a: Partida, b: Partida, ahora: Date): number {
  const ra = resumirPartida(a, ahora);
  const rb = resumirPartida(b, ahora);
  const grupo = (r: ResumenPartida) => (r.fase !== 'en_juego' ? (r.fase === 'pendiente' ? 2 : 3) : r.estado === 'retrasado' ? 0 : 1);
  if (grupo(ra) !== grupo(rb)) return grupo(ra) - grupo(rb);
  if (grupo(ra) === 0) return (rb.ultimo?.retraso_min ?? 0) - (ra.ultimo?.retraso_min ?? 0);
  if (grupo(ra) === 1) return minutosSinVer(b, ahora) - minutosSinVer(a, ahora);
  return a.hora_salida.localeCompare(b.hora_salida);
}

/**
 * Orden de los tees para recorrer el campo: primero el 1 y después 18, 17, 16 … hasta el 2.
 * (Con 18 hoyos: tee 1 → 0, tee 18 → 1, tee 17 → 2 … tee 2 → 17.)
 */
export const posicionDeTee = (tee: number) => (tee === 1 ? 0 : 19 - tee);

/** Orden "por tee" del Marshal: tee 1, 18, 17 … 2; dentro del mismo tee, por hora de salida. */
export function compararPorTee(a: Partida, b: Partida): number {
  return posicionDeTee(a.hoyo_salida) - posicionDeTee(b.hoyo_salida) || a.hora_salida.localeCompare(b.hora_salida);
}

/** ¿Se ha visto a la partida desde `desde` (inicio de la ronda de revisión)? */
export const vistaDesde = (p: Partida, desde: string) => p.avistamientos.some((a) => a.visto_en >= desde);
