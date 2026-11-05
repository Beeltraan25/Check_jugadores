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
  /** Color de texto para números (indicadores). */
  texto: string;
}

// Verde = hasta +5 min (o adelantados), ámbar = de +6 a +14 min, rojo = desde +15 min.
export const ESTADO_UI: Record<EstadoVisual, EstiloEstado> = {
  adelantado: {
    etiqueta: 'Adelantado',
    color: '#059669',
    badge: 'bg-emerald-600 text-white',
    suave: 'bg-emerald-50 text-emerald-950 border-emerald-300',
    barra: 'bg-emerald-600',
    texto: 'text-emerald-700',
  },
  en_tiempo: {
    etiqueta: 'En tiempo',
    color: '#059669',
    badge: 'bg-emerald-600 text-white',
    suave: 'bg-emerald-50 text-emerald-950 border-emerald-300',
    barra: 'bg-emerald-600',
    texto: 'text-emerald-700',
  },
  aviso: {
    etiqueta: 'Atención',
    color: '#d97706',
    badge: 'bg-amber-400 text-amber-950',
    suave: 'bg-amber-50 text-amber-950 border-amber-300',
    barra: 'bg-amber-400',
    texto: 'text-amber-600',
  },
  retrasado: {
    etiqueta: 'Retrasado',
    color: '#dc2626',
    badge: 'bg-red-600 text-white',
    suave: 'bg-red-50 text-red-950 border-red-300',
    barra: 'bg-red-600',
    texto: 'text-red-700',
  },
  sin_datos: {
    etiqueta: 'Sin ver',
    color: '#64748b',
    badge: 'bg-slate-200 text-slate-700',
    suave: 'bg-white text-slate-800 border-slate-200',
    barra: 'bg-slate-300',
    texto: 'text-slate-500',
  },
};

export const estiloDe = (estado: EstadoRitmo | null | undefined) => ESTADO_UI[estado ?? 'sin_datos'];
