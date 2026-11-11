/**
 * Bloque principal del Marshal: empezar revisión → elegir hoyo → tocar la posición.
 * Al tocar la posición se guarda la hora exacta y se muestra al momento si van bien o lentos.
 */
import { useState } from 'react';
import { useDatos } from '../datos/DatosProvider';
import { useRonda } from '../hooks/useRonda';
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
  const { ejecutar, usuario, torneo } = useDatos();
  const ronda = useRonda(torneo?.id);
  const ahora = useAhora(5_000);
  const resumen = resumirPartida(partida, ahora);
  const hoyoEsperado = resumen.esperada.fase === 'antes_de_salir' ? null : resumen.esperada.hoyo;
  const [hoyo, setHoyo] = useState<number>(() => leerUltimoHoyo() ?? hoyoEsperado ?? partida.hoyo_salida);
  const [resultado, setResultado] = useState<{ avistamiento: Avistamiento; ventana: Ventana } | null>(null);

  const elegirHoyo = (h: number) => {
    setHoyo(h);
    recordarHoyo(h);
  };

  // Un toque en la posición basta: se apunta la hora de ese momento.
  const marcar = (posicion: Posicion) => {
    const visto = new Date();
    const r = evaluarRitmo(salidaDe(partida), hoyo, posicion, visto);
    const avistamiento: Avistamiento = {
      id: nuevoId(),
      partida_id: partida.id,
      hoyo,
      posicion,
      revision_iniciada_en: ronda.inicio,
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

  const borrar = () => {
    if (!resultado) return;
    void ejecutar({ tipo: 'eliminar_avistamiento', partidaId: partida.id, avistamientoId: resultado.avistamiento.id });
    setResultado(null);
  };

  return (
    <div className="space-y-5">
      {/* 1. Ronda de revisión (se empieza una vez para todas las partidas) */}
      {ronda.inicio ? (
        <p className="rounded-xl bg-sky-50 px-4 py-2 text-sm text-sky-950">
          Ronda de revisión desde las <strong className="cifras">{hhmm(ronda.inicio)}</strong> (
          {Math.max(0, Math.floor(minutosEntre(ronda.inicio, ahora)))} min). Toca la posición y se apunta la hora.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-700">
          <span className="flex-1">Toca la posición y se apunta la hora a la que les ves.</span>
          <button
            type="button"
            onClick={ronda.empezar}
            className="min-h-10 rounded-lg bg-sky-600 px-3 font-bold text-white hover:bg-sky-700"
          >
            ▶ Empezar ronda de revisión
          </button>
        </div>
      )}

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

      {resultado && <ResultadoAvistamiento {...resultado} onDeshacer={borrar} onCerrar={() => setResultado(null)} />}
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
        <button
          type="button"
          onClick={onDeshacer}
          className="min-h-11 rounded-lg border-2 border-red-600 bg-white px-4 font-bold text-red-700 shadow-sm hover:bg-red-50"
        >
          🗑 Borrar esta revisión
        </button>
        <button type="button" onClick={onCerrar} className="min-h-11 rounded-lg px-4 font-semibold hover:bg-white/50">
          Cerrar
        </button>
      </div>
    </div>
  );
}
