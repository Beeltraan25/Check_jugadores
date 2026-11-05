/** Piezas pequeñas de interfaz reutilizadas en varias pantallas. */
import { Link } from 'react-router';
import type { ReactNode } from 'react';
import { useDatos } from '../datos/DatosProvider';
import { useAhora } from '../hooks/useAhora';
import { hhmmss } from '../lib/hora';
import { textoRetraso, type EstadoRitmo } from '../lib/ritmo';
import { estiloDe } from './estilos';

export function EstadoBadge({
  estado,
  retraso,
  grande = false,
}: {
  estado: EstadoRitmo | null;
  retraso?: number;
  grande?: boolean;
}) {
  const estilo = estiloDe(estado);
  const conRetraso = estado && retraso !== undefined && Math.round(retraso) !== 0;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full font-semibold ${estilo.badge} ${
        grande ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
      }`}
    >
      {estilo.etiqueta}
      {conRetraso && <span className="cifras font-bold">{textoRetraso(retraso)}</span>}
    </span>
  );
}

export function IndicadorConexion() {
  const { conexion, pendientes } = useDatos();
  const estilos = {
    demo: { punto: 'bg-slate-400', texto: 'Demo local' },
    conectando: { punto: 'bg-amber-400', texto: 'Conectando…' },
    en_directo: { punto: 'bg-emerald-500 animate-pulse', texto: 'En directo' },
    sin_conexion: { punto: 'bg-red-500', texto: 'Sin conexión' },
  }[conexion];
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium" title={estilos.texto}>
      <span className={`h-2.5 w-2.5 rounded-full ${estilos.punto}`} aria-hidden />
      <span className="sr-only sm:not-sr-only">{estilos.texto}</span>
      {pendientes > 0 && (
        <span className="rounded-full bg-amber-400 px-2 text-amber-950" title="Cambios guardados en este dispositivo">
          {pendientes} sin enviar
        </span>
      )}
    </span>
  );
}

export function Reloj() {
  const ahora = useAhora(1000);
  return <span className="cifras text-base font-semibold tracking-tight sm:text-lg">{hhmmss(ahora)}</span>;
}

/** Barra superior verde con título, reloj y estado de la conexión. */
export function Cabecera({
  titulo,
  volverA,
  acciones,
}: {
  titulo: ReactNode;
  volverA?: string;
  acciones?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 bg-campo-800 text-white shadow-md">
      <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        {volverA && (
          <Link
            to={volverA}
            className="-ml-1 grid h-10 w-10 place-items-center rounded-full text-2xl hover:bg-white/10"
            aria-label="Volver"
          >
            ‹
          </Link>
        )}
        <div className="min-w-0 flex-1 text-lg font-bold leading-tight">{titulo}</div>
        {acciones}
        <IndicadorConexion />
        <Reloj />
      </div>
    </header>
  );
}

export function Seccion({ titulo, extra, children }: { titulo: string; extra?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{titulo}</h2>
        {extra}
      </div>
      {children}
    </section>
  );
}
