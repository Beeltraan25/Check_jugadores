import type { Partida } from '../datos/tipos';
import { hhmm, minutosEntre } from '../lib/hora';
import { NOMBRE_POSICION } from '../lib/ritmo';
import { EstadoBadge } from './basicos';

/** Lista de avistamientos de una partida, del más reciente al más antiguo. */
export function HistorialAvistamientos({ partida }: { partida: Partida }) {
  if (partida.avistamientos.length === 0) {
    return <p className="text-sm text-slate-500">Todavía nadie ha visto a esta partida.</p>;
  }
  return (
    <ol className="divide-y divide-slate-100">
      {[...partida.avistamientos].reverse().map((a) => (
        <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
          <span className="cifras w-12 font-bold text-slate-900">{hhmm(a.visto_en)}</span>
          <span className="min-w-0 flex-1 text-sm text-slate-700">
            <strong>Hoyo {a.hoyo}</strong> · {NOMBRE_POSICION[a.posicion]}
            {a.revision_iniciada_en && (
              <span className="block text-xs text-slate-500">
                Revisión desde {hhmm(a.revision_iniciada_en)} ({Math.max(0, Math.round(minutosEntre(a.revision_iniciada_en, new Date(a.visto_en))))} min)
                {a.marshal ? ` · ${a.marshal}` : ''}
              </span>
            )}
          </span>
          <EstadoBadge estado={a.estado} retraso={a.retraso_min} />
        </li>
      ))}
    </ol>
  );
}
