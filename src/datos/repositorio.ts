/**
 * Contrato común de las dos fuentes de datos (demo local y Supabase).
 * El resto de la app solo habla con esta interfaz, así que cambiar de base de datos
 * (por ejemplo a Firebase) solo exige escribir otra implementación.
 */
import type { Operacion } from './operaciones';
import type { Partida, Torneo } from './tipos';

export type EstadoConexion = 'demo' | 'conectando' | 'en_directo' | 'sin_conexion';

/** Torneo con un pequeño resumen para listarlo sin cargar todas sus partidas. */
export interface TorneoConResumen extends Torneo {
  num_partidas: number;
}

export interface Repositorio {
  modo: 'demo' | 'supabase';
  /** Todos los torneos guardados, del más reciente al más antiguo. */
  listarTorneos(): Promise<TorneoConResumen[]>;
  /** Partidas de un torneo con jugadores, alquileres y avistamientos. */
  cargarTorneo(torneoId: string): Promise<Partida[]>;
  /** Avisa cada vez que algo cambia en la base de datos (tiempo real). Devuelve cómo dejar de escuchar. */
  suscribir(alCambiar: () => void): () => void;
  /** Guarda un cambio. Con Supabase pasa por la cola offline. */
  ejecutar(op: Operacion): Promise<void>;
  /** Operaciones guardadas en este dispositivo que la pantalla debe mostrar ya aplicadas. */
  operacionesLocales(): Operacion[];
  /** Cuántas operaciones esperan a que vuelva la conexión. */
  pendientes(): number;
  /** Tras una recarga que empezó en `instante`, olvida las operaciones ya enviadas antes. */
  confirmarHasta(instante: number): void;
  /** Avisa cuando cambia la cola local, el estado de la conexión o hay un error al enviar. */
  alCambiarEstado(oyente: (evento: EventoRepositorio) => void): () => void;
  conexion(): EstadoConexion;
}

export type EventoRepositorio = { tipo: 'estado' } | { tipo: 'error'; mensaje: string };

/** Pequeño emisor de eventos reutilizado por las dos implementaciones. */
export function crearEmisor<T>() {
  const oyentes = new Set<(valor: T) => void>();
  return {
    escuchar(oyente: (valor: T) => void) {
      oyentes.add(oyente);
      return () => {
        oyentes.delete(oyente);
      };
    },
    emitir(valor: T) {
      oyentes.forEach((o) => o(valor));
    },
  };
}
