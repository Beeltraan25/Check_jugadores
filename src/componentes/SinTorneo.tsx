import { Link } from 'react-router';
import { useDatos } from '../datos/DatosProvider';
import type { Torneo } from '../datos/tipos';
import { useAhora } from '../hooks/useAhora';
import { fechaLocal } from '../lib/hora';
import { fechaLarga } from '../lib/textos';

/** Aviso cuando todavía no hay ningún torneo ni día de salidas con el que trabajar. */
export function SinTorneo() {
  const { abrirSalidasDeHoy } = useDatos();
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-lg font-bold text-slate-900">No hay nada en juego todavía</p>
      <p className="mt-1 text-slate-600">
        Empieza a apuntar las salidas normales de hoy, o importa el PDF de un torneo.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => abrirSalidasDeHoy()}
          className="min-h-12 rounded-xl bg-sky-700 px-5 font-bold text-white hover:bg-sky-800"
        >
          Salidas normales de hoy
        </button>
        <Link
          to="/torneos"
          className="inline-flex min-h-12 items-center rounded-xl bg-campo-700 px-5 font-bold text-white hover:bg-campo-800"
        >
          Torneos
        </Link>
      </div>
    </div>
  );
}

/** Nombre del torneo en la cabecera, con enlace para cambiarlo. */
export function TituloTorneo({ seccion, nombre }: { seccion: string; nombre?: string }) {
  return (
    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
      <span>{seccion}</span>
      {nombre && (
        <Link to="/torneos" className="truncate text-base font-medium text-campo-100 underline-offset-2 hover:underline">
          · {nombre}
        </Link>
      )}
    </span>
  );
}

/**
 * Aviso si el torneo en uso no es de hoy: los tiempos se calculan con su fecha, así que
 * registrar avistamientos en un torneo de otro día daría retrasos sin sentido.
 */
export function AvisoFechaTorneo({ torneo }: { torneo: Torneo | null }) {
  const hoy = fechaLocal(useAhora(60_000));
  if (!torneo || torneo.fecha === hoy) return null;
  const pasado = torneo.fecha < hoy;
  return (
    <div role="note" className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
      Estás viendo <strong>{torneo.nombre}</strong>, que {pasado ? 'fue el' : 'es el'} {fechaLarga(torneo.fecha).toLowerCase()}.{' '}
      {pasado ? 'Consulta su informe o ' : 'Los tiempos no cuadrarán hasta ese día. '}
      <Link to="/torneos" className="font-semibold underline">
        {pasado ? 'elige el torneo de hoy' : 'Cambiar de torneo'}
      </Link>
      .
    </div>
  );
}
