import type { EstadoRitmo } from './ritmo';

/** Nombre de cada estado para mostrar o exportar. */
export const ESTADO_TEXTO: Record<EstadoRitmo, string> = {
  adelantado: 'Adelantado',
  en_tiempo: 'En tiempo',
  aviso: 'Atención',
  retrasado: 'Retrasado',
};

/** "sábado, 15 de noviembre de 2026" a partir de "2026-11-15". */
export function fechaLarga(fecha: string): string {
  const [a, m, d] = fecha.split('-').map(Number);
  const texto = new Date(a, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
