import { useDatos } from '../datos/DatosProvider';
import type { Partida } from '../datos/tipos';
import { hhmm } from '../lib/hora';
import { NOMBRE_POSICION } from '../lib/ritmo';
import { EstadoBadge } from './basicos';

/**
 * Lista de avistamientos (revisiones) de una partida, del más reciente al más antiguo.
 * Con `editable`, cada una tiene un botón para borrarla (por si se apuntó por error).
 */
export function HistorialAvistamientos({ partida, editable = false }: { partida: Partida; editable?: boolean }) {
  const { ejecutar } = useDatos();
  if (partida.avistamientos.length === 0) {
    return <p className="text-sm text-slate-500">Todavía nadie ha visto a esta partida.</p>;
  }
  const borrar = (id: string, texto: string) => {
    if (window.confirm(`¿Borrar la revisión de las ${texto}? No se puede deshacer.`)) {
      void ejecutar({ tipo: 'eliminar_avistamiento', partidaId: partida.id, avistamientoId: id });
    }
  };
  return (
    <ol className="divide-y divide-slate-100">
      {[...partida.avistamientos].reverse().map((a) => (
        <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
          <span className="cifras w-12 font-bold text-slate-900">{hhmm(a.visto_en)}</span>
          <span className="min-w-0 flex-1 text-sm text-slate-700">
            <strong>Hoyo {a.hoyo}</strong> · {NOMBRE_POSICION[a.posicion]}
            {(a.revision_iniciada_en || a.marshal) && (
              <span className="block text-xs text-slate-500">
                {a.revision_iniciada_en ? `Ronda desde las ${hhmm(a.revision_iniciada_en)}` : ''}
                {a.revision_iniciada_en && a.marshal ? ' · ' : ''}
                {a.marshal ?? ''}
              </span>
            )}
          </span>
          <EstadoBadge estado={a.estado} retraso={a.retraso_min} />
          {editable && (
            <button
              type="button"
              onClick={() => borrar(a.id, `${hhmm(a.visto_en)} (hoyo ${a.hoyo})`)}
              aria-label={`Borrar la revisión de las ${hhmm(a.visto_en)}`}
              className="min-h-10 min-w-10 rounded-lg px-2 text-lg text-red-700 hover:bg-red-50"
            >
              🗑
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}
