/**
 * Tipos de datos de la app. Coinciden con las tablas de supabase/schema.sql
 * (los nombres de campo son los mismos que las columnas).
 */
import type { EstadoRitmo, Posicion } from '../lib/ritmo';

export type TipoAlquiler = 'carro_electrico' | 'buggy';

export const NOMBRE_ALQUILER: Record<TipoAlquiler, string> = {
  carro_electrico: 'Carro eléctrico',
  buggy: 'Buggy',
};

/** Artículo alquilado por un jugador (máximo uno por jugador). */
export interface Alquiler {
  id: string;
  partida_id: string;
  jugador_id: string;
  tipo: TipoAlquiler;
  /** Nº del carro o del buggy. Puede quedar vacío si aún no se sabe. */
  numero: number | null;
}

export interface Jugador {
  id: string;
  partida_id: string;
  nombre: string;
  orden: number;
  alquiler: Alquiler | null;
}

/** Cada vez que el Marshal ve a una partida (la tabla de "tiempos"). */
export interface Avistamiento {
  id: string;
  partida_id: string;
  hoyo: number;
  posicion: Posicion;
  /** Cuándo empezó el Marshal a revisar a la partida (si pulsó "Empezar revisión"). */
  revision_iniciada_en: string | null;
  /** Hora exacta a la que se les vio en esa posición (la pone el dispositivo del Marshal). */
  visto_en: string;
  /** Minutos fuera de la ventana ideal en ese momento (+ tarde, − adelantados). */
  retraso_min: number;
  estado: EstadoRitmo;
  marshal: string | null;
}

/**
 * Un torneo (o una jornada de juego). Agrupa sus partidas y todo lo registrado en él:
 * avistamientos, alquileres y observaciones quedan guardados para consultarlos después.
 */
export interface Torneo {
  id: string;
  nombre: string;
  /** Quién organiza el torneo (empresa, agencia, club…). Sirve para comparar organizadores. */
  organizador: string;
  /** Día del torneo, AAAA-MM-DD. */
  fecha: string;
  notas: string;
  creado_en: string;
  /** Cuándo se dio por cerrado (null = abierto, en juego). */
  cerrado_en: string | null;
}

/** Una partida (grupo de jugadores) con todo lo que cuelga de ella. */
export interface Partida {
  id: string;
  torneo_id: string;
  /** Día de juego, en formato AAAA-MM-DD (hora local). */
  fecha: string;
  /** Hora de salida (tee time) en ISO 8601. */
  hora_salida: string;
  /** Tee por el que salen: 1 o 10. */
  hoyo_salida: number;
  /** Nombre opcional de la partida (p. ej. "Torneo socios" o "Familia García"). */
  nombre: string;
  observaciones: string;
  /** Si hay un Marshal revisándola ahora mismo, desde cuándo. */
  revision_iniciada_en: string | null;
  terminada_en: string | null;
  jugadores: Jugador[];
  avistamientos: Avistamiento[];
}
