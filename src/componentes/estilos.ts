import type { EstadoRitmo } from '../lib/ritmo';

export type EstadoVisual = EstadoRitmo | 'sin_datos';

interface EstiloEstado {
  etiqueta: string;
  /** Color sólido (pines del mapa). */
  color: string;
  /** Clases Tailwind de la etiqueta de estado. */
  badge: string;
  /** Fondo suave para tarjetas y avisos. */
  suave: string;
  /** Barra lateral de color en las tarjetas. */
  barra: string;
}

// Verde = van bien (en tiempo o adelantados), ámbar = vigilar, rojo = van lentos.
export const ESTADO_UI: Record<EstadoVisual, EstiloEstado> = {
  adelantado: {
    etiqueta: 'Adelantado',
    color: '#059669',
    badge: 'bg-emerald-600 text-white',
    suave: 'bg-emerald-50 text-emerald-950 border-emerald-300',
    barra: 'bg-emerald-600',
  },
  en_tiempo: {
    etiqueta: 'En tiempo',
    color: '#059669',
    badge: 'bg-emerald-600 text-white',
    suave: 'bg-emerald-50 text-emerald-950 border-emerald-300',
    barra: 'bg-emerald-600',
  },
  aviso: {
    etiqueta: 'Atención',
    color: '#d97706',
    badge: 'bg-amber-400 text-amber-950',
    suave: 'bg-amber-50 text-amber-950 border-amber-300',
    barra: 'bg-amber-400',
  },
  retrasado: {
    etiqueta: 'Retrasado',
    color: '#dc2626',
    badge: 'bg-red-600 text-white',
    suave: 'bg-red-50 text-red-950 border-red-300',
    barra: 'bg-red-600',
  },
  sin_datos: {
    etiqueta: 'Sin ver',
    color: '#64748b',
    badge: 'bg-slate-200 text-slate-700',
    suave: 'bg-white text-slate-800 border-slate-200',
    barra: 'bg-slate-300',
  },
};

export const estiloDe = (estado: EstadoRitmo | null | undefined) => ESTADO_UI[estado ?? 'sin_datos'];
