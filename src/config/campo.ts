/**
 * Configuración del campo: imagen del mapa y posición de cada hoyo sobre ella.
 *
 * CÓMO PONER TU MAPA
 *  1. Copia la imagen de tu campo en /public (por ejemplo /public/mapa-campo.jpg).
 *  2. Cambia MAPA.url a '/mapa-campo.jpg'.
 *  3. Abre la app en /calibrar, haz clic en el tee y en el green de cada hoyo y pega
 *     aquí el código que te genera (sustituye el array HOYOS).
 *
 * Las coordenadas son porcentajes del ancho (x) y del alto (y) de la imagen, así los pines
 * caen en su sitio aunque el mapa se vea más grande o más pequeño según la pantalla.
 */
import type { Posicion } from '../lib/ritmo';

export interface Punto {
  /** % desde el borde izquierdo de la imagen (0–100). */
  x: number;
  /** % desde el borde superior de la imagen (0–100). */
  y: number;
}

export interface HoyoCampo {
  numero: number;
  par: 3 | 4 | 5;
  tee: Punto;
  green: Punto;
  /** Opcional: punto exacto del 2º golpe (útil en hoyos con dogleg). Si no, se calcula. */
  segundo?: Punto;
  /** Opcional: punto exacto del 3er golpe. */
  tercero?: Punto;
}

export const MAPA = {
  nombre: 'Montealvar',
  url: '/mapa-campo.png',
};

/**
 * Coordenadas medidas sobre public/mapa-campo.png (569 × 466 px).
 * Par confirmados con la tarjeta de Montealvar (ida 36 + vuelta 36 = 72).
 * Los hoyos 4 y 11 tienen dogleg, por eso llevan los puntos del 2º y 3er golpe fijados a mano.
 */
export const HOYOS: HoyoCampo[] = [
  { numero: 1, par: 5, tee: { x: 70.3, y: 65.0 }, green: { x: 39.0, y: 75.8 } },
  { numero: 2, par: 3, tee: { x: 36.6, y: 76.2 }, green: { x: 28.6, y: 78.1 } },
  { numero: 3, par: 4, tee: { x: 22.8, y: 92.7 }, green: { x: 10.2, y: 67.8 } },
  { numero: 4, par: 5, tee: { x: 10.9, y: 63.7 }, green: { x: 35.0, y: 32.0 }, segundo: { x: 22.8, y: 54.9 }, tercero: { x: 29.5, y: 43.6 } },
  { numero: 5, par: 4, tee: { x: 35.7, y: 38.2 }, green: { x: 19.3, y: 67.2 } },
  { numero: 6, par: 4, tee: { x: 22.5, y: 70.8 }, green: { x: 37.8, y: 42.9 } },
  { numero: 7, par: 4, tee: { x: 41.5, y: 44.0 }, green: { x: 27.8, y: 71.2 } },
  { numero: 8, par: 4, tee: { x: 32.2, y: 72.1 }, green: { x: 56.2, y: 63.7 } },
  { numero: 9, par: 3, tee: { x: 60.6, y: 63.9 }, green: { x: 70.7, y: 62.0 } },
  { numero: 10, par: 4, tee: { x: 65.4, y: 55.2 }, green: { x: 44.5, y: 59.4 } },
  { numero: 11, par: 5, tee: { x: 44.3, y: 53.2 }, green: { x: 55.7, y: 14.6 }, segundo: { x: 45.2, y: 37.8 }, tercero: { x: 50.4, y: 25.5 } },
  { numero: 12, par: 3, tee: { x: 49.2, y: 18.9 }, green: { x: 41.7, y: 29.8 } },
  { numero: 13, par: 4, tee: { x: 37.8, y: 26.8 }, green: { x: 54.7, y: 7.1 } },
  { numero: 14, par: 5, tee: { x: 57.3, y: 8.2 }, green: { x: 83.3, y: 33.9 } },
  { numero: 15, par: 3, tee: { x: 86.1, y: 34.3 }, green: { x: 87.5, y: 48.1 } },
  { numero: 16, par: 4, tee: { x: 84.0, y: 41.8 }, green: { x: 61.9, y: 19.3 } },
  { numero: 17, par: 4, tee: { x: 58.3, y: 18.5 }, green: { x: 50.3, y: 48.1 } },
  { numero: 18, par: 4, tee: { x: 50.1, y: 53.2 }, green: { x: 67.0, y: 47.6 } },
];

/** Por dónde suele caer cada golpe entre el tee y el green (0 = tee, 1 = green), según el par. */
const AVANCE_GOLPES: Record<HoyoCampo['par'], { segundo: number; tercero: number }> = {
  3: { segundo: 0.8, tercero: 0.9 },
  4: { segundo: 0.5, tercero: 0.82 },
  5: { segundo: 0.38, tercero: 0.7 },
};

const interpolar = (a: Punto, b: Punto, t: number): Punto => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});

/** Punto del mapa donde se dibuja una partida vista en (hoyo, posición). */
export function puntoEnMapa(numeroHoyo: number, posicion: Posicion): Punto {
  const hoyo = HOYOS.find((h) => h.numero === numeroHoyo);
  if (!hoyo) return { x: 50, y: 50 };
  const avance = AVANCE_GOLPES[hoyo.par];
  switch (posicion) {
    case 'tee':
      return hoyo.tee;
    case 'segundo_golpe':
      return hoyo.segundo ?? interpolar(hoyo.tee, hoyo.green, avance.segundo);
    case 'tercer_golpe':
      return hoyo.tercero ?? interpolar(hoyo.tee, hoyo.green, avance.tercero);
    case 'green':
      return hoyo.green;
  }
}
