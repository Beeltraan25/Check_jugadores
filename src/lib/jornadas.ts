/**
 * SALIDAS NORMALES: los días de juego que no son torneo.
 *
 * Hay una jornada de salidas por día. Se guarda en la misma tabla que los torneos, pero con
 * un identificador fijo que depende solo de la fecha. Ventajas:
 *  - no hace falta cambiar la base de datos;
 *  - si dos dispositivos abren "Salidas de hoy" a la vez, crean la MISMA jornada (no dos).
 * Ejemplo: las salidas del 11/11/2026 son siempre 5a11da50-0000-4000-8000-000020261111.
 */
import type { Torneo } from '../datos/tipos';
import { fechaLarga } from './textos';

const PREFIJO_SALIDAS = '5a11da50-0000-4000-8000-0000';

export const idSalidasDelDia = (fecha: string) => PREFIJO_SALIDAS + fecha.replaceAll('-', '');

/** ¿Es una jornada de salidas normales (y no un torneo)? */
export const esSalidas = (t: Pick<Torneo, 'id'>) => t.id.startsWith(PREFIJO_SALIDAS);

/** La jornada de salidas normales de un día (lista para crearla si aún no existe). */
export function jornadaDeSalidas(fecha: string): Torneo {
  return {
    id: idSalidasDelDia(fecha),
    nombre: `Salidas del ${fechaLarga(fecha).toLowerCase().replace(/ de \d{4}$/, '')}`,
    organizador: '',
    fecha,
    notas: '',
    // Fijo para la fecha: así la jornada es idéntica la cree quien la cree.
    creado_en: new Date(`${fecha}T00:00:00`).toISOString(),
    cerrado_en: null,
  };
}

/** Texto para etiquetas: "Torneo" o "Salidas normales". */
export const tipoDeJornada = (t: Pick<Torneo, 'id'>) => (esSalidas(t) ? 'Salidas normales' : 'Torneo');

/**
 * Jornada que usa un dispositivo:
 *  1. la que eligió (salvo unas salidas de otro día: esas ya no se usan para apuntar);
 *  2. si no, un torneo abierto de hoy; si no, las salidas de hoy;
 *  3. si no, el torneo abierto más reciente; y si no hay ninguno abierto, el más reciente.
 * `torneos` viene ordenado del más reciente al más antiguo.
 */
export function resolverJornada(torneos: Torneo[], elegido: string | null, hoy: string): Torneo | null {
  const salidasDeOtroDia = (t: Torneo) => esSalidas(t) && t.fecha !== hoy;
  const laElegida = torneos.find((t) => t.id === elegido);
  if (laElegida && !salidasDeOtroDia(laElegida)) return laElegida;

  const abiertas = torneos.filter((t) => !t.cerrado_en && !salidasDeOtroDia(t));
  return (
    abiertas.find((t) => t.fecha === hoy && !esSalidas(t)) ??
    abiertas.find((t) => t.fecha === hoy) ??
    abiertas[0] ??
    torneos.find((t) => !esSalidas(t)) ??
    torneos[0] ??
    null
  );
}

/** Nombre sin mayúsculas, tildes ni espacios de más, para comparar torneos. */
const nombreComparable = (nombre: string) =>
  nombre.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Torneos ya guardados que parecen el mismo: misma fecha y mismo nombre (p. ej. un PDF importado dos veces). */
export function torneosRepetidos(torneos: Torneo[], nombre: string, fecha: string): Torneo[] {
  const buscado = nombreComparable(nombre);
  return torneos.filter((t) => !esSalidas(t) && t.fecha === fecha && nombreComparable(t.nombre) === buscado);
}

/** Torneos (no salidas) abiertos en un día: si hay más de uno, cada dispositivo podría estar en uno distinto. */
export const torneosAbiertosDelDia = (torneos: Torneo[], fecha: string) =>
  torneos.filter((t) => !esSalidas(t) && !t.cerrado_en && t.fecha === fecha);
