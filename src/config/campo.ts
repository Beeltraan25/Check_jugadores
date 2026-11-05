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
  nombre: 'Club de Golf',
  url: '/mapa-campo.svg',
};

export const HOYOS: HoyoCampo[] = [
  { numero: 1, par: 4, tee: { x: 46, y: 82 }, green: { x: 30, y: 70 } },
  { numero: 2, par: 4, tee: { x: 27, y: 66 }, green: { x: 11, y: 58 } },
  { numero: 3, par: 3, tee: { x: 9, y: 51 }, green: { x: 13, y: 33 } },
  { numero: 4, par: 5, tee: { x: 16, y: 27 }, green: { x: 11, y: 8 } },
  { numero: 5, par: 4, tee: { x: 17, y: 6 }, green: { x: 35, y: 9 } },
  { numero: 6, par: 3, tee: { x: 37, y: 14 }, green: { x: 31, y: 28 } },
  { numero: 7, par: 4, tee: { x: 33, y: 34 }, green: { x: 24, y: 50 } },
  { numero: 8, par: 5, tee: { x: 27, y: 55 }, green: { x: 42, y: 45 } },
  { numero: 9, par: 4, tee: { x: 44, y: 50 }, green: { x: 47, y: 74 } },
  { numero: 10, par: 4, tee: { x: 54, y: 82 }, green: { x: 70, y: 72 } },
  { numero: 11, par: 3, tee: { x: 73, y: 67 }, green: { x: 86, y: 62 } },
  { numero: 12, par: 5, tee: { x: 90, y: 56 }, green: { x: 87, y: 30 } },
  { numero: 13, par: 4, tee: { x: 84, y: 26 }, green: { x: 88, y: 8 } },
  { numero: 14, par: 4, tee: { x: 82, y: 6 }, green: { x: 64, y: 9 } },
  { numero: 15, par: 3, tee: { x: 61, y: 13 }, green: { x: 66, y: 27 } },
  { numero: 16, par: 4, tee: { x: 65, y: 33 }, green: { x: 77, y: 47 } },
  { numero: 17, par: 5, tee: { x: 74, y: 53 }, green: { x: 57, y: 45 } },
  { numero: 18, par: 4, tee: { x: 56, y: 51 }, green: { x: 53, y: 75 } },
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
