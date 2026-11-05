/**
 * Bloque principal del Marshal: empezar revisión → elegir hoyo → tocar la posición.
 * Al tocar la posición se guarda la hora exacta y se muestra al momento si van bien o lentos.
 */
import { useState } from 'react';
import { useDatos } from '../datos/DatosProvider';
import type { Avistamiento, Partida } from '../datos/tipos';
import { useAhora } from '../hooks/useAhora';
import { hhmm, hhmmss, minutosEntre } from '../lib/hora';
import { nuevoId } from '../lib/ids';
import { resumirPartida, salidaDe } from '../lib/partidas';
import {
  CONFIG_RITMO,
  NOMBRE_POSICION,
  POSICIONES,
  evaluarRitmo,
  textoRetraso,
  ventanaIdeal,
  type Posicion,
  type Ventana,
} from '../lib/ritmo';
import { estiloDe } from './estilos';

const CLAVE_ULTIMO_HOYO = 'ritmo-golf:ultimo-hoyo';
const NUM_HOYOS = CONFIG_RITMO.minutosPorHoyo.length;

/** El Marshal suele quedarse en un hoyo revisando varias partidas: se recuerda el último usado. */
function leerUltimoHoyo(): number | null {
  try {
    const n = Number(sessionStorage.getItem(CLAVE_ULTIMO_HOYO));
    return n >= 1 && n <= NUM_HOYOS ? n : null;
  } catch {
    return null;
  }
}

function recordarHoyo(hoyo: number) {
  try {
    sessionStorage.setItem(CLAVE_ULTIMO_HOYO, String(hoyo));
  } catch {
    /* nada */
  }
}

export function RegistroAvistamiento({ partida }: { partida: Partida }) {
  const { ejecutar, usuario } = useDatos();
  const ahora = useAhora(5_000);
  const resumen = resumirPartida(partida, ahora);
  const hoyoEsperado = resumen.esperada.fase === 'antes_de_salir' ? null : resumen.esperada.hoyo;
  const [hoyo, setHoyo] = useState<number>(() => leerUltimoHoyo() ?? hoyoEsperado ?? partida.hoyo_salida);
  const [resultado, setResultado] = useState<{ avistamiento: Avistamiento; ventana: Ventana } | null>(null);

  const revisandoDesde = partida.revision_iniciada_en;

  const elegirHoyo = (h: number) => {
    setHoyo(h);
    recordarHoyo(h);
  };

  const marcar = (posicion: Posicion) => {
    const visto = new Date();
    const r = evaluarRitmo(salidaDe(partida), hoyo, posicion, visto);
    const avistamiento: Avistamiento = {
      id: nuevoId(),
      partida_id: partida.id,
      hoyo,
      posicion,
      revision_iniciada_en: revisandoDesde,
      visto_en: visto.toISOString(),
      retraso_min: r.retrasoMin,
      estado: r.estado,
      marshal: usuario,
    };
    setResultado({ avistamiento, ventana: r.ventana });
    recordarHoyo(hoyo);
    navigator.vibrate?.(r.estado === 'retrasado' ? [90, 60, 90] : 40);
    void ejecutar({ tipo: 'registrar_avistamiento', avistamiento });
  };

  const deshacer = () => {
    if (!resultado) return;
    void ejecutar({ tipo: 'eliminar_avistamiento', partidaId: partida.id, avistamientoId: resultado.avistamiento.id });
    if (resultado.avistamiento.revision_iniciada_en) {
      void ejecutar({ tipo: 'iniciar_revision', partidaId: partida.id, cuando: resultado.avistamiento.revision_iniciada_en });
    }
    setResultado(null);
  };

  return (
    <div className="space-y-5">
      {/* 1. Revisión */}
      <div className="flex flex-wrap items-center gap-3">
        {revisandoDesde ? (
          <>
            <div className="flex-1 rounded-xl bg-sky-50 px-4 py-3 text-sky-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Revisando desde</p>
              <p className="cifras text-2xl font-bold">
                {hhmmss(revisandoDesde)}{' '}
                <span className="text-base font-medium text-sky-800">
                  ({Math.max(0, Math.floor(minutosEntre(revisandoDesde, ahora)))} min)
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => void ejecutar({ tipo: 'iniciar_revision', partidaId: partida.id, cuando: null })}
              className="min-h-12 rounded-xl border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancelar revisión
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              setResultado(null);
              void ejecutar({ tipo: 'iniciar_revision', partidaId: partida.id, cuando: new Date().toISOString() });
            }}
            className="min-h-14 w-full rounded-xl bg-sky-600 px-5 text-lg font-bold text-white shadow hover:bg-sky-700 sm:w-auto"
          >
            ▶ Empezar revisión
          </button>
        )}
      </div>

      {/* 2. Hoyo */}
      <div>
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-bold text-slate-800">Hoyo</h3>
          <p className="text-xs text-slate-500">
            {hoyoEsperado && <>Deberían estar en el <strong>{hoyoEsperado}</strong>. </>}
            {resumen.ultimo && <>Vistos por última vez en el <strong>{resumen.ultimo.hoyo}</strong>.</>}
          </p>
        </div>
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
          {Array.from({ length: NUM_HOYOS }, (_, i) => i + 1).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => elegirHoyo(h)}
              aria-pressed={h === hoyo}
              className={`cifras relative min-h-12 rounded-lg text-lg font-bold transition ${
                h === hoyo ? 'bg-campo-800 text-white shadow-md' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
              }`}
            >
              {h}
              {h === hoyoEsperado && (
                <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" title="Hoyo esperado" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Posición: un toque y queda registrado */}
      <div>
        <h3 className="mb-2 font-bold text-slate-800">¿Dónde les ves? (toca para registrar la hora)</h3>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {POSICIONES.map((posicion) => {
            const v = ventanaIdeal(salidaDe(partida), hoyo, posicion);
            return (
              <button
                key={posicion}
                type="button"
                onClick={() => marcar(posicion)}
                className="flex min-h-20 flex-col items-center justify-center rounded-xl border-2 border-campo-700 bg-campo-50 px-2 py-2 text-campo-900 shadow-sm active:scale-[0.98] hover:bg-campo-100"
              >
                <span className="text-lg font-bold">{NOMBRE_POSICION[posicion]}</span>
                <span className="cifras text-xs text-campo-700">
                  ideal {hhmm(v.desde)}–{hhmm(v.hasta)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {resultado && <ResultadoAvistamiento {...resultado} onDeshacer={deshacer} onCerrar={() => setResultado(null)} />}
    </div>
  );
}

function ResultadoAvistamiento({
  avistamiento,
  ventana,
  onDeshacer,
  onCerrar,
}: {
  avistamiento: Avistamiento;
  ventana: Ventana;
  onDeshacer: () => void;
  onCerrar: () => void;
}) {
  const estilo = estiloDe(avistamiento.estado);
  const lento = avistamiento.estado === 'retrasado' || avistamiento.estado === 'aviso';
  return (
    <div role="status" className={`rounded-2xl border-2 p-4 ${estilo.suave}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full text-2xl font-black ${estilo.badge}`} aria-hidden>
          {lento ? '!' : '✓'}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-black uppercase tracking-tight">
            {estilo.etiqueta} <span className="cifras">{textoRetraso(avistamiento.retraso_min)}</span>
          </p>
          <p className="cifras text-sm">
            Vistos a las <strong>{hhmmss(avistamiento.visto_en)}</strong> en el hoyo {avistamiento.hoyo} (
            {NOMBRE_POSICION[avistamiento.posicion]}). Ideal: {hhmm(ventana.desde)}–{hhmm(ventana.hasta)}.
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onDeshacer} className="min-h-11 rounded-lg bg-white/80 px-4 font-semibold shadow-sm hover:bg-white">
          Deshacer
        </button>
        <button type="button" onClick={onCerrar} className="min-h-11 rounded-lg px-4 font-semibold hover:bg-white/50">
          Cerrar
        </button>
      </div>
    </div>
  );
}
