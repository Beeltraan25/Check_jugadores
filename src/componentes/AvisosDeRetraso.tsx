/**
 * Avisos en la oficina: cuando llega una vista nueva que pone a una partida EN ROJO
 * (15 min o más de retraso), sale un aviso arriba a la derecha y, si se activa, suena.
 * Así el Caddy Master se entera aunque no esté mirando la pantalla.
 */
import { useEffect, useRef, useState } from 'react';
import type { Partida } from '../datos/tipos';
import { hhmm } from '../lib/hora';
import { etiquetaPartida } from '../lib/partidas';
import { NOMBRE_POSICION, textoRetraso } from '../lib/ritmo';

interface Aviso {
  /** Momento (ms) en que el aviso se quita solo. */
  caduca: number;
  id: string;
  partidaId: string;
  titulo: string;
  detalle: string;
}

const CLAVE_SONIDO = 'ritmo-golf:sonido-avisos';
const DURACION_AVISO_MS = 45_000;

function leerSonido(): boolean {
  try {
    return localStorage.getItem(CLAVE_SONIDO) === '1';
  } catch {
    return false;
  }
}

/** Vistas que acaban de poner en rojo a una partida que antes no lo estaba. */
function nuevasEnRojo(partidas: Partida[], conocidas: Set<string>): Aviso[] {
  const avisos: Aviso[] = [];
  for (const p of partidas) {
    p.avistamientos.forEach((a, i) => {
      if (conocidas.has(a.id)) return;
      const anterior = p.avistamientos[i - 1];
      if (a.estado === 'retrasado' && anterior?.estado !== 'retrasado') {
        avisos.push({
          caduca: Date.now() + DURACION_AVISO_MS,
          id: a.id,
          partidaId: p.id,
          titulo: `Partida de las ${etiquetaPartida(p)} en rojo`,
          detalle: `${textoRetraso(a.retraso_min)} en el hoyo ${a.hoyo} (${NOMBRE_POSICION[a.posicion]}) a las ${hhmm(a.visto_en)}`,
        });
      }
    });
  }
  return avisos;
}

export function AvisosDeRetraso({
  partidas,
  jornadaId,
  cargando,
  onVer,
}: {
  partidas: Partida[];
  jornadaId: string | null;
  cargando: boolean;
  onVer: (partidaId: string) => void;
}) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [sonido, setSonido] = useState(leerSonido);
  const conocidas = useRef<{ jornada: string | null; ids: Set<string> } | null>(null);
  const audio = useRef<AudioContext | null>(null);

  const pitar = () => {
    const ctx = audio.current;
    if (!ctx) return;
    // Dos pitidos cortos.
    [0, 0.25].forEach((retardo) => {
      const oscilador = ctx.createOscillator();
      const volumen = ctx.createGain();
      oscilador.frequency.value = 880;
      volumen.gain.setValueAtTime(0.0001, ctx.currentTime + retardo);
      volumen.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + retardo + 0.02);
      volumen.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + retardo + 0.2);
      oscilador.connect(volumen).connect(ctx.destination);
      oscilador.start(ctx.currentTime + retardo);
      oscilador.stop(ctx.currentTime + retardo + 0.22);
    });
  };

  useEffect(() => {
    if (cargando) return;
    const idsActuales = new Set(partidas.flatMap((p) => p.avistamientos.map((a) => a.id)));
    // Primera carga (o cambio de torneo): lo que ya había no se avisa.
    if (!conocidas.current || conocidas.current.jornada !== jornadaId) {
      conocidas.current = { jornada: jornadaId, ids: idsActuales };
      setAvisos([]);
      return;
    }
    const nuevos = nuevasEnRojo(partidas, conocidas.current.ids);
    conocidas.current.ids = idsActuales;
    if (nuevos.length === 0) return;
    setAvisos((actuales) => [...nuevos, ...actuales].slice(0, 5));
    if (sonido) pitar();
    // Solo debe reaccionar a datos nuevos, no a que se active o desactive el sonido.
  }, [partidas, jornadaId, cargando]);

  // Los avisos se quitan solos pasado un rato.
  useEffect(() => {
    if (avisos.length === 0) return;
    const id = window.setInterval(() => setAvisos((actuales) => actuales.filter((a) => a.caduca > Date.now())), 5000);
    return () => window.clearInterval(id);
  }, [avisos.length]);

  const alternarSonido = () => {
    const activar = !sonido;
    setSonido(activar);
    try {
      localStorage.setItem(CLAVE_SONIDO, activar ? '1' : '0');
    } catch {
      /* nada */
    }
    if (activar) {
      // Los navegadores solo dejan sonar tras un toque del usuario: se prepara aquí.
      const Contexto = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Contexto) {
        audio.current ??= new Contexto();
        void audio.current.resume();
        pitar();
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={alternarSonido}
        aria-pressed={sonido}
        title="Sonar cuando una partida pase a rojo"
        className="min-h-10 rounded-lg bg-white/10 px-3 text-sm font-semibold hover:bg-white/20"
      >
        {sonido ? '🔔 Sonido' : '🔕 Sin sonido'}
      </button>
      {avisos.length > 0 && (
        <div className="no-imprimir fixed right-3 top-20 z-40 w-[min(22rem,calc(100vw-1.5rem))] space-y-2" role="alert" aria-live="assertive">
          {avisos.map((a) => (
            <div key={a.id} className="rounded-xl border-2 border-red-700 bg-red-600 p-3 text-white shadow-xl">
              <p className="font-bold">{a.titulo}</p>
              <p className="cifras text-sm">{a.detalle}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onVer(a.partidaId);
                    setAvisos((actuales) => actuales.filter((x) => x.id !== a.id));
                  }}
                  className="min-h-9 rounded-lg bg-white px-3 text-sm font-bold text-red-700"
                >
                  Ver partida
                </button>
                <button
                  type="button"
                  onClick={() => setAvisos((actuales) => actuales.filter((x) => x.id !== a.id))}
                  className="min-h-9 rounded-lg px-3 text-sm font-semibold hover:bg-white/10"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
