import { Link } from 'react-router';
import type { Partida } from '../datos/tipos';
import { useRecienCambiado } from '../hooks/useAhora';
import { haceCuanto, hhmm } from '../lib/hora';
import { etiquetaPartida, resumirPartida, tituloPartida } from '../lib/partidas';
import { NOMBRE_POSICION } from '../lib/ritmo';
import { ResumenAlquileres } from './Alquileres';
import { EstadoBadge } from './basicos';
import { estiloDe } from './estilos';

interface Props {
  partida: Partida;
  ahora: Date;
  /** Enlace (Marshal) o acción al pulsar (Oficina). */
  to?: string;
  onClick?: () => void;
  activa?: boolean;
  /** Durante una ronda de revisión: true = ya vista en esta ronda, false = falta por ver. */
  vistaEnRonda?: boolean;
}

export function TarjetaPartida({ partida, ahora, to, onClick, activa = false, vistaEnRonda }: Props) {
  const r = resumirPartida(partida, ahora);
  const estilo = estiloDe(r.estado);
  // Destello amarillo cuando entra un avistamiento nuevo en tiempo real.
  const recien = useRecienCambiado(r.ultimo?.id);
  const ultimaNota = partida.observaciones.trim().split('\n').at(-1);

  const contenido = (
    <>
      <span className={`w-1.5 shrink-0 self-stretch rounded-full ${r.fase === 'en_juego' ? estilo.barra : 'bg-slate-200'}`} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="cifras text-lg font-bold leading-none text-slate-900">{etiquetaPartida(partida)}</span>
          {r.fase === 'pendiente' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Por salir</span>}
          {r.fase === 'terminada' && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">Terminada</span>}
          {r.fase === 'en_juego' && <EstadoBadge estado={r.estado} retraso={r.ultimo?.retraso_min} />}
        </div>
        <p className="truncate text-sm font-medium text-slate-700">
          {tituloPartida(partida)} <span className="font-normal text-slate-500">· {partida.jugadores.length} jug.</span>
        </p>
        <p className="text-xs text-slate-500">
          {r.ultimo ? (
            <>
              Visto en <strong className="text-slate-700">H{r.ultimo.hoyo}</strong> · {NOMBRE_POSICION[r.ultimo.posicion]} ·{' '}
              <span className="cifras">{hhmm(r.ultimo.visto_en)}</span> ({haceCuanto(r.ultimo.visto_en, ahora)})
            </>
          ) : r.fase === 'pendiente' ? (
            <>Sale a las {hhmm(partida.hora_salida)} por el tee del {partida.hoyo_salida}</>
          ) : (
            'Sin ver todavía'
          )}
          {r.fase === 'en_juego' && r.esperada.fase === 'jugando' && (
            <> · Deberían ir por el <strong className="text-slate-700">H{r.esperada.hoyo}</strong></>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {vistaEnRonda !== undefined && r.fase === 'en_juego' && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                vistaEnRonda ? 'bg-sky-600 text-white' : 'bg-white text-sky-800 ring-1 ring-sky-600'
              }`}
            >
              {vistaEnRonda ? '✓ Vista en esta ronda' : 'Falta por ver'}
            </span>
          )}
          <ResumenAlquileres partida={partida} />
          {partida.revision_iniciada_en && (
            <span className="rounded-md bg-sky-100 px-1.5 py-0.5 text-[11px] font-semibold text-sky-900">
              Marshal revisando desde {hhmm(partida.revision_iniciada_en)}
            </span>
          )}
        </div>
        {ultimaNota && <p className="truncate text-xs italic text-slate-600">“{ultimaNota}”</p>}
      </div>
    </>
  );

  const clases = `flex w-full gap-3 rounded-xl border p-3 text-left transition ${
    activa ? 'border-campo-600 bg-campo-50 ring-2 ring-campo-200' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
  } ${recien ? 'destello' : ''} ${r.fase === 'terminada' ? 'opacity-70' : ''}`;

  return to ? (
    <Link to={to} className={clases}>
      {contenido}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={clases}>
      {contenido}
    </button>
  );
}
