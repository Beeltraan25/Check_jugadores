/** Utilidades de fechas y horas (siempre en la hora local del dispositivo). */

const dosCifras = (n: number) => String(n).padStart(2, '0');

/** Fecha local en formato AAAA-MM-DD (no usar toISOString: daría el día en UTC). */
export function fechaLocal(fecha: Date = new Date()): string {
  return `${fecha.getFullYear()}-${dosCifras(fecha.getMonth() + 1)}-${dosCifras(fecha.getDate())}`;
}

/** Une una fecha AAAA-MM-DD y una hora HH:MM locales en un ISO 8601. */
export function combinarFechaHora(fecha: string, hora: string): string {
  return new Date(`${fecha}T${hora}:00`).toISOString();
}

/** "10:20" */
export function hhmm(fecha: string | Date): string {
  return new Date(fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** "10:20:05" */
export function hhmmss(fecha: string | Date): string {
  return new Date(fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/** "ahora mismo", "hace 12 min", "hace 1 h 5 min" */
export function haceCuanto(fecha: string | Date, ahora: Date): string {
  const minutos = Math.floor((ahora.getTime() - new Date(fecha).getTime()) / 60_000);
  if (minutos < 1) return 'ahora mismo';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto ? `hace ${horas} h ${resto} min` : `hace ${horas} h`;
}

export function minutosEntre(desde: string | Date, hasta: Date): number {
  return (hasta.getTime() - new Date(desde).getTime()) / 60_000;
}
