/** Funciones de ayuda sobre una partida: su estado actual, su etiqueta, etc. */
import { NOMBRE_ALQUILER, type Avistamiento, type Partida, type TipoAlquiler } from '../datos/tipos';
import { hhmm } from './hora';
import { type EstadoRitmo, type PosicionEsperada, posicionEsperada } from './ritmo';

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
  let fase: Fase = 'en_juego';
  if (p.terminada_en) fase = 'terminada';
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

/** Título legible: el nombre de la partida o, si no tiene, los apellidos de los jugadores. */
export function tituloPartida(p: Partida): string {
  if (p.nombre.trim()) return p.nombre.trim();
  const apellidos = p.jugadores.map((j) => j.nombre.trim().split(/\s+/).at(-1)).filter(Boolean);
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
