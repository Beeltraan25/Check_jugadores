/**
 * Lógica del ritmo de juego.
 *
 * Idea: cada hoyo tiene un tiempo asignado (15 min por defecto). Si una partida sale a las
 * 10:00 por el tee del 1, debería terminar el hoyo 1 a las 10:15, el 2 a las 10:30, etc.
 *
 * Cada posición dentro del hoyo ocupa un tramo de esos 15 minutos (su "ventana ideal"):
 *
 *   Tee de salida  0:00 – 3:45
 *   2º golpe       3:45 – 7:30
 *   3er golpe      7:30 – 11:15
 *   Green         11:15 – 15:00
 *
 * Retraso = cuánto se sale la hora real de esa ventana:
 *   - visto después del final de la ventana → retraso positivo (van lentos)
 *   - visto antes del inicio de la ventana  → retraso negativo (van adelantados)
 *   - visto dentro de la ventana            → 0 (van en tiempo)
 *
 * Colores (en minutos enteros de retraso):
 *   🟢 verde  hasta +5 min         (en tiempo; más de 5 min por delante = "adelantado", también verde)
 *   🟠 ámbar  de +6 a +14 min      (atención)
 *   🔴 rojo   desde +15 min        (retrasado)
 *
 * Todo son funciones puras (sin base de datos ni React), así se pueden probar con tests.
 */

export const POSICIONES = ['tee', 'segundo_golpe', 'tercer_golpe', 'green'] as const;
export type Posicion = (typeof POSICIONES)[number];

export const NOMBRE_POSICION: Record<Posicion, string> = {
  tee: 'Tee de salida',
  segundo_golpe: '2º golpe',
  tercer_golpe: '3er golpe',
  green: 'Green',
};

export type EstadoRitmo = 'adelantado' | 'en_tiempo' | 'aviso' | 'retrasado';

export interface ConfigRitmo {
  /** Minutos asignados a cada hoyo (índice 0 = hoyo 1). */
  minutosPorHoyo: number[];
  /** Tramo de cada posición como fracción del hoyo: [desde, hasta). */
  tramos: Record<Posicion, readonly [number, number]>;
  /** Hasta estos minutos de retraso la partida sigue en verde ("en tiempo"). */
  limiteVerde: number;
  /** Desde estos minutos de retraso la partida pasa a rojo ("retrasado"). Entre medias, ámbar. */
  limiteRojo: number;
  /** Más de estos minutos por delante del horario = "adelantado" (también verde). */
  margenAdelanto: number;
}

export const CONFIG_RITMO: ConfigRitmo = {
  minutosPorHoyo: Array<number>(18).fill(15),
  tramos: {
    tee: [0, 0.25],
    segundo_golpe: [0.25, 0.5],
    tercer_golpe: [0.5, 0.75],
    green: [0.75, 1],
  },
  limiteVerde: 5,
  limiteRojo: 15,
  margenAdelanto: 5,
};

const MS_MINUTO = 60_000;
const sumarMinutos = (fecha: Date, minutos: number) => new Date(fecha.getTime() + minutos * MS_MINUTO);
const siguienteHoyo = (hoyo: number, total: number) => (hoyo % total) + 1;

/** Datos mínimos de una partida para calcular su ritmo. */
export interface SalidaPartida {
  /** Hora de salida (tee time). */
  horaSalida: Date;
  /** Hoyo por el que empiezan (1 normalmente, 10 si salen por el tee del 10). */
  hoyoSalida: number;
}

/** Minutos desde la salida hasta que la partida debería EMPEZAR el hoyo indicado. */
export function minutoInicioHoyo(hoyo: number, hoyoSalida: number, cfg: ConfigRitmo = CONFIG_RITMO): number {
  const total = cfg.minutosPorHoyo.length;
  if (hoyo < 1 || hoyo > total) throw new RangeError(`Hoyo fuera de rango: ${hoyo}`);
  let minutos = 0;
  for (let h = hoyoSalida; h !== hoyo; h = siguienteHoyo(h, total)) {
    minutos += cfg.minutosPorHoyo[h - 1];
  }
  return minutos;
}

export interface Ventana {
  desde: Date;
  hasta: Date;
}

/** Ventana de tiempo en la que la partida debería estar en ese hoyo y posición. */
export function ventanaIdeal(
  salida: SalidaPartida,
  hoyo: number,
  posicion: Posicion,
  cfg: ConfigRitmo = CONFIG_RITMO,
): Ventana {
  const inicioHoyo = minutoInicioHoyo(hoyo, salida.hoyoSalida, cfg);
  const duracion = cfg.minutosPorHoyo[hoyo - 1];
  const [desde, hasta] = cfg.tramos[posicion];
  return {
    desde: sumarMinutos(salida.horaSalida, inicioHoyo + desde * duracion),
    hasta: sumarMinutos(salida.horaSalida, inicioHoyo + hasta * duracion),
  };
}

/**
 * Estado según el retraso. Se usan minutos enteros (los mismos que se ven en pantalla), así
 * "+15 min" es siempre rojo aunque por dentro sean 14,6.
 */
export function clasificarRetraso(retrasoMin: number, cfg: ConfigRitmo = CONFIG_RITMO): EstadoRitmo {
  const minutos = Math.round(retrasoMin);
  if (minutos >= cfg.limiteRojo) return 'retrasado';
  if (minutos > cfg.limiteVerde) return 'aviso';
  if (minutos < -cfg.margenAdelanto) return 'adelantado';
  return 'en_tiempo';
}

export interface ResultadoRitmo {
  /** Minutos fuera de la ventana: + van tarde, − van adelantados, 0 en tiempo. Redondeado a 0,1. */
  retrasoMin: number;
  estado: EstadoRitmo;
  ventana: Ventana;
}

/**
 * Función principal: compara la hora a la que se ha visto a la partida en (hoyo, posición)
 * con la hora ideal calculada a partir de su hora de salida.
 */
export function evaluarRitmo(
  salida: SalidaPartida,
  hoyo: number,
  posicion: Posicion,
  vistoEn: Date,
  cfg: ConfigRitmo = CONFIG_RITMO,
): ResultadoRitmo {
  const ventana = ventanaIdeal(salida, hoyo, posicion, cfg);
  const visto = vistoEn.getTime();
  let retrasoMs = 0;
  if (visto > ventana.hasta.getTime()) retrasoMs = visto - ventana.hasta.getTime();
  else if (visto < ventana.desde.getTime()) retrasoMs = visto - ventana.desde.getTime();
  // "+ 0" evita devolver -0 cuando el retraso negativo se redondea a cero.
  const retrasoMin = Math.round((retrasoMs / MS_MINUTO) * 10) / 10 + 0;
  return { retrasoMin, estado: clasificarRetraso(retrasoMin, cfg), ventana };
}

export type FaseEsperada = 'antes_de_salir' | 'jugando' | 'terminado';

export interface PosicionEsperada {
  fase: FaseEsperada;
  hoyo: number;
  posicion: Posicion;
}

/** Dónde debería estar la partida en un momento dado si fuera exactamente a su ritmo. */
export function posicionEsperada(
  salida: SalidaPartida,
  ahora: Date,
  cfg: ConfigRitmo = CONFIG_RITMO,
): PosicionEsperada {
  const total = cfg.minutosPorHoyo.length;
  let minutos = (ahora.getTime() - salida.horaSalida.getTime()) / MS_MINUTO;
  if (minutos < 0) return { fase: 'antes_de_salir', hoyo: salida.hoyoSalida, posicion: 'tee' };

  let hoyo = salida.hoyoSalida;
  for (let jugados = 0; jugados < total; jugados++) {
    const duracion = cfg.minutosPorHoyo[hoyo - 1];
    if (minutos < duracion) {
      const fraccion = minutos / duracion;
      const posicion = POSICIONES.find((p) => fraccion < cfg.tramos[p][1]) ?? 'green';
      return { fase: 'jugando', hoyo, posicion };
    }
    minutos -= duracion;
    hoyo = siguienteHoyo(hoyo, total);
  }
  const ultimoHoyo = salida.hoyoSalida === 1 ? total : salida.hoyoSalida - 1;
  return { fase: 'terminado', hoyo: ultimoHoyo, posicion: 'green' };
}

/** Duración total ideal de la vuelta en minutos (18 × 15 = 270 min = 4 h 30 min). */
export const duracionVueltaMin = (cfg: ConfigRitmo = CONFIG_RITMO) =>
  cfg.minutosPorHoyo.reduce((suma, m) => suma + m, 0);

/** Texto corto del retraso: "+6 min", "−4 min" o "0 min". */
export function textoRetraso(retrasoMin: number): string {
  const redondeado = Math.round(retrasoMin);
  if (redondeado > 0) return `+${redondeado} min`;
  if (redondeado < 0) return `−${Math.abs(redondeado)} min`;
  return '0 min';
}
