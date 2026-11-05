import { Link, useParams } from 'react-router';
import { EditorAlquileres } from '../componentes/Alquileres';
import { Cabecera, EstadoBadge, Seccion } from '../componentes/basicos';
import { HistorialAvistamientos } from '../componentes/Historial';
import { EditorObservaciones } from '../componentes/Observaciones';
import { RegistroAvistamiento } from '../componentes/RegistroAvistamiento';
import { AvisoFechaTorneo } from '../componentes/SinTorneo';
import { useDatos, usePartida } from '../datos/DatosProvider';
import { useAhora } from '../hooks/useAhora';
import { etiquetaPartida, nombresJugadores, resumirPartida, tituloPartida } from '../lib/partidas';

/** Ficha de una partida para el Marshal: registrar dónde está, alquileres y observaciones. */
export function MarshalPartida() {
  const { id } = useParams();
  const partida = usePartida(id);
  const { cargando, ejecutar, torneo } = useDatos();
  const ahora = useAhora(15_000);

  if (!partida) {
    return (
      <div className="min-h-dvh">
        <Cabecera titulo="Marshal" volverA="/marshal" />
        <p className="p-8 text-center text-slate-500">
          {cargando ? 'Cargando…' : 'Esta partida no existe o es de otro torneo.'}{' '}
          <Link to="/marshal" className="font-semibold text-campo-700 underline">
            Volver a la lista
          </Link>
        </p>
      </div>
    );
  }

  const resumen = resumirPartida(partida, ahora);

  return (
    <div className="min-h-dvh pb-10">
      <Cabecera
        volverA="/marshal"
        titulo={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="cifras">{etiquetaPartida(partida)}</span>
            <span className="truncate text-base font-medium text-campo-100">{tituloPartida(partida)}</span>
          </span>
        }
      />
      <AvisoFechaTorneo torneo={torneo} />
      {/* key: al cambiar de partida se reinicia el estado local (resultado, textos a medio escribir) */}
      <main key={partida.id} className="mx-auto max-w-3xl space-y-4 px-3 py-4">
        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <EstadoBadge estado={resumen.estado} retraso={resumen.ultimo?.retraso_min} grande />
          <span>{nombresJugadores(partida)}</span>
        </div>

        {resumen.fase === 'terminada' ? (
          <Seccion titulo="Partida terminada">
            <button
              type="button"
              onClick={() => void ejecutar({ tipo: 'terminar_partida', partidaId: partida.id, cuando: null })}
              className="min-h-12 rounded-xl border border-slate-300 px-4 font-semibold"
            >
              Reabrir partida
            </button>
          </Seccion>
        ) : (
          <Seccion titulo="Registrar posición">
            <RegistroAvistamiento partida={partida} />
          </Seccion>
        )}

        <Seccion titulo="Alquileres">
          <EditorAlquileres partida={partida} />
        </Seccion>

        <Seccion titulo="Observaciones">
          <EditorObservaciones partida={partida} />
        </Seccion>

        <Seccion titulo="Historial de hoy">
          <HistorialAvistamientos partida={partida} />
        </Seccion>

        {resumen.fase !== 'terminada' && (
          <button
            type="button"
            onClick={() => void ejecutar({ tipo: 'terminar_partida', partidaId: partida.id, cuando: new Date().toISOString() })}
            className="min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50"
          >
            Marcar partida como terminada
          </button>
        )}
      </main>
    </div>
  );
}
