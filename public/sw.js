/*
 * Service worker de "Ritmo de juego".
 *
 * Sirve para que la app instalada (iPhone, iPad, Android, ordenador) abra aunque no haya
 * cobertura en el campo:
 *  - Páginas: primero la red (para tener siempre la última versión); sin red, la copia guardada.
 *  - Archivos de la app (/assets/…, llevan un código en el nombre y nunca cambian): de la copia.
 *  - Iconos, mapa y demás: de la copia, y se actualiza por detrás.
 *  - Los datos (Supabase) no pasan por aquí: los gestiona la propia app con su cola offline.
 */
const CACHE = 'ritmo-v3';
// Los archivos guardados sirven para cualquier petición de la misma URL (aunque cambien
// cabeceras como Origin): son estáticos.
const BUSQUEDA = { ignoreVary: true };
const BASICOS = ['/', '/index.html', '/manifest.webmanifest', '/icono.svg', '/apple-touch-icon.png', '/mapa-campo.png'];
const ESPERA_RED_MS = 4000;

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(BASICOS)));
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

// La app avisa de los archivos que ya ha cargado para guardarlos desde la primera visita.
self.addEventListener('message', (evento) => {
  if (evento.data?.tipo === 'guardar' && Array.isArray(evento.data.urls)) {
    evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(evento.data.urls).catch(() => {})));
  }
});

function conTiempoMaximo(promesa, ms) {
  return Promise.race([promesa, new Promise((_, rechazar) => setTimeout(() => rechazar(new Error('lento')), ms))]);
}

self.addEventListener('fetch', (evento) => {
  const peticion = evento.request;
  if (peticion.method !== 'GET') return;
  const url = new URL(peticion.url);
  if (url.origin !== self.location.origin) return;
  // La comprobación de "¿hay versión nueva?" debe ir siempre a la red, sin copia.
  if (url.searchParams.has('comprobar-version')) return;

  if (peticion.mode === 'navigate') {
    evento.respondWith(
      conTiempoMaximo(fetch(peticion), ESPERA_RED_MS)
        .then((respuesta) => {
          const copia = respuesta.clone();
          caches.open(CACHE).then((cache) => cache.put('/index.html', copia));
          return respuesta;
        })
        .catch(() => caches.match('/index.html', BUSQUEDA)),
    );
    return;
  }

  if (url.pathname.startsWith('/assets/')) {
    evento.respondWith(
      caches.match(peticion, BUSQUEDA).then(
        (guardada) =>
          guardada ??
          fetch(peticion).then((respuesta) => {
            if (respuesta.ok) {
              const copia = respuesta.clone();
              caches.open(CACHE).then((cache) => cache.put(peticion, copia));
            }
            return respuesta;
          }),
      ),
    );
    return;
  }

  evento.respondWith(
    caches.match(peticion, BUSQUEDA).then((guardada) => {
      const deRed = fetch(peticion)
        .then((respuesta) => {
          if (respuesta.ok) {
            const copia = respuesta.clone();
            caches.open(CACHE).then((cache) => cache.put(peticion, copia));
          }
          return respuesta;
        })
        .catch(() => guardada);
      return guardada ?? deRed;
    }),
  );
});
