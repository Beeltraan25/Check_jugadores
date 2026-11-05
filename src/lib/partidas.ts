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
  const apellidos = p.jugadores.map((j) => apellidoPrincipal(j.nombre)).filter(Boolean);
  return apellidos.join(' · ') || 'Partida sin nombre';
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
