/* Cuadre · copia guardada de la app
   - La app siempre abre desde la copia guardada en el iPhone (funciona sin internet
     y aunque Netlify esté caído o pausado).
   - Una versión nueva solo se guarda si se descargó completa y es realmente la app.
   - Los movimientos NO están aquí: viven aparte en la memoria del iPhone.
   Cambia VERSION en cada actualización para que los iPhones la detecten. */
const VERSION = 'cuadre-v11';
const ARCHIVOS = ['./', 'index.html', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
const MARCA = 'name="wyt-app"';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const respuestas = await Promise.all(ARCHIVOS.map(async url => {
      const r = await fetch(url, { cache: 'reload' });
      if (!r.ok) throw new Error('Descarga incompleta: ' + url);
      return [url, r];
    }));
    // Comprobar que index.html es nuestra app y no una página de error de Netlify
    for (const [url, r] of respuestas) {
      if (url === './' || url === 'index.html') {
        const texto = await r.clone().text();
        if (!texto.includes(MARCA)) throw new Error('index.html no es la app');
      }
    }
    const cache = await caches.open(VERSION);
    await Promise.all(respuestas.map(([url, r]) => cache.put(url, r)));
  })());
  // Si falla cualquier paso, la instalación se cancela y se queda la copia anterior.
});

// La nueva versión espera hasta que el usuario toque "Actualizar"
// o hasta que la app se cierre por completo.
self.addEventListener('message', e => { if (e.data === 'ACTIVAR') self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Siempre responder desde la copia guardada; internet solo como respaldo
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    if (req.mode === 'navigate') {
      return (await cache.match('index.html')) || (await cache.match('./')) || fetch(req);
    }
    return (await cache.match(req, { ignoreSearch: true })) || fetch(req);
  })());
});
