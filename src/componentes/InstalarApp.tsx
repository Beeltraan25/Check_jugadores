/**
 * Invita a instalar la app en el dispositivo (icono en la pantalla de inicio, a pantalla
 * completa y abriendo sin cobertura):
 *  - Android y ordenadores con Chrome/Edge: botón "Instalar" (el navegador lo permite).
 *  - iPhone y iPad: Apple no deja hacerlo con un botón; se explican los dos toques.
 */
import { useEffect, useState } from 'react';

interface EventoInstalar extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const CLAVE_OCULTO = 'ritmo-golf:instalar-oculto';

function leerOculto(): boolean {
  try {
    return localStorage.getItem(CLAVE_OCULTO) === '1';
  } catch {
    return false;
  }
}

const yaInstalada = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPhone, iPod o iPad (los iPad modernos se presentan como Mac con pantalla táctil). */
const esAppleMovil = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

export function InstalarApp() {
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [oculto, setOculto] = useState(leerOculto);

  useEffect(() => {
    const guardarEvento = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    window.addEventListener('beforeinstallprompt', guardarEvento);
    return () => window.removeEventListener('beforeinstallprompt', guardarEvento);
  }, []);

  if (oculto || yaInstalada()) return null;
  const ios = esAppleMovil();
  if (!evento && !ios) return null;

  const ocultar = () => {
    setOculto(true);
    try {
      localStorage.setItem(CLAVE_OCULTO, '1');
    } catch {
      /* nada */
    }
  };

  return (
    <aside className="flex flex-wrap items-center gap-3 rounded-2xl border border-campo-200 bg-campo-50 p-4 text-sm text-campo-900">
      <img src="/apple-touch-icon.png" alt="" className="h-12 w-12 rounded-xl" />
      <div className="min-w-0 flex-1">
        <p className="font-bold">Instala la app en este dispositivo</p>
        {evento ? (
          <p>Tendrás el icono en la pantalla de inicio y se abrirá aunque no haya cobertura.</p>
        ) : (
          <p>
            Toca el botón <strong>Compartir</strong>{' '}
            <span aria-hidden className="inline-block rounded border border-campo-700 px-1 leading-4">
              ⬆
            </span>{' '}
            y elige <strong>«Añadir a pantalla de inicio»</strong>.
          </p>
        )}
      </div>
      <div className="flex gap-2">
        {evento && (
          <button
            type="button"
            onClick={() => {
              void evento.prompt();
              void evento.userChoice.finally(() => setEvento(null));
            }}
            className="min-h-11 rounded-xl bg-campo-700 px-4 font-bold text-white hover:bg-campo-800"
          >
            Instalar
          </button>
        )}
        <button type="button" onClick={ocultar} className="min-h-11 rounded-xl px-3 font-semibold text-campo-800 hover:bg-campo-100">
          Ahora no
        </button>
      </div>
    </aside>
  );
}
