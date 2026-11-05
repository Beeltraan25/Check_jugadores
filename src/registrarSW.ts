/**
 * Registra el service worker (public/sw.js) para que la app instalada abra sin cobertura.
 * Solo en la versión publicada: en desarrollo molestaría (guardaría archivos viejos).
 */
export function registrarServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const registrar = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((registro) => {
        // Guardar ya los archivos de esta primera carga (JS, CSS, mapa…).
        const urls = performance
          .getEntriesByType('resource')
          .map((r) => r.name)
          .filter((u) => u.startsWith(location.origin) && /\/assets\/|\.(png|svg|webmanifest)$/.test(u));
        registro.active?.postMessage({ tipo: 'guardar', urls });
      })
      .catch(() => {
        /* sin service worker la app funciona igual, solo que necesita red para abrir */
      });
  };
  if (document.readyState === 'complete') registrar();
  else window.addEventListener('load', registrar);
}
