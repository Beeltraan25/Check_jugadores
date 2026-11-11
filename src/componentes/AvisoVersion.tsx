/**
 * Avisa cuando se ha publicado una versión nueva de la app mientras estaba abierta
 * (típico en la pantalla de la oficina, que pasa días encendida). Cada pocos minutos, y al
 * volver a la pestaña, mira qué archivo principal está publicado y lo compara con el cargado.
 */
import { useEffect, useState } from 'react';

const CADA_MS = 5 * 60_000;

export function AvisoVersion() {
  const [hayNueva, setHayNueva] = useState(false);

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    const cargado = document.querySelector('script[type="module"][src*="/assets/"]')?.getAttribute('src');
    if (!cargado) return;

    const comprobar = async () => {
      try {
        // El parámetro hace que el service worker no responda con su copia guardada.
        const respuesta = await fetch(`/index.html?comprobar-version=${Date.now()}`, { cache: 'no-store' });
        const publicado = (await respuesta.text()).match(/\/assets\/index-[^"']+\.js/)?.[0];
        if (publicado && publicado !== cargado) setHayNueva(true);
      } catch {
        /* sin conexión: ya se comprobará luego */
      }
    };
    const alVolver = () => {
      if (document.visibilityState === 'visible') void comprobar();
    };
    const intervalo = window.setInterval(() => void comprobar(), CADA_MS);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, []);

  if (!hayNueva) return null;
  return (
    <div
      role="status"
      style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      className="no-imprimir fixed left-3 z-50 flex max-w-sm items-center gap-3 rounded-xl bg-slate-900 p-3 text-sm text-white shadow-xl"
    >
      <span className="flex-1">Hay una versión nueva de la app.</span>
      <button type="button" onClick={() => window.location.reload()} className="min-h-10 rounded-lg bg-yellow-300 px-3 font-bold text-slate-900">
        Actualizar
      </button>
    </div>
  );
}
