/**
 * StopKm - Service Worker para suporte 100% Offline (PWA)
 * Compatível com iOS Safari / WebKit e Vercel CleanUrls
 */

const CACHE_NAME = 'stopkm-cache-v5';
const ASSETS_TO_CACHE = [
  '/',
  './manifest.json',
  './css/custom.css',
  './js/app.js',
  './js/ui.js',
  './js/store.js',
  './js/calculations.js',
  './js/charts.js',
  './js/receipt.js',
  './js/supabase.js',
  './assets/logo.svg',
  './assets/icons/icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Remove a flag interna de redirecionamento do objeto Response.
 * O Safari (iOS WebKit) lança o erro:
 * "Response served by service worker has redirections"
 * se o Service Worker retornar uma resposta onde response.redirected === true.
 */
function cleanRedirectResponse(response) {
  if (!response) return response;
  if (!response.redirected) return response;

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

self.addEventListener('fetch', (e) => {
  // 1. Ignora qualquer requisição que não seja GET (ex: Supabase Auth POST)
  if (e.request.method !== 'GET') {
    return;
  }

  const url = new URL(e.request.url);

  // 2. Não intercepta chamadas externas (Supabase API, CDNs de terceiros, fontes)
  if (url.origin !== self.location.origin) {
    return;
  }

  // 3. Tratamento seguro para navegação de página (PWA no iOS Safari)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          return cleanRedirectResponse(networkResponse);
        })
        .catch(async () => {
          const cached = await caches.match('/') || await caches.match('./index.html');
          if (cached) {
            return cleanRedirectResponse(cached);
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // 4. Scripts JS e Estilos CSS: Network-First com Fallback para Cache
  // Garante que novidades e correções cheguem imediatamente no iPhone/PWA
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    e.respondWith(
      fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, clone);
            });
          }
          return cleanRedirectResponse(networkResponse);
        })
        .catch(async () => {
          const cached = await caches.match(e.request) || await caches.match(url.pathname);
          if (cached) {
            return cleanRedirectResponse(cached);
          }
          return new Response('Offline resource', { status: 503, statusText: 'Offline' });
        })
    );
    return;
  }

  // 5. Demais recursos estáticos locais (imagens, ícones, manifest)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Atualização em segundo plano (stale-while-revalidate)
        fetch(e.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(e.request, clone);
              });
            }
          })
          .catch(() => {});
        return cleanRedirectResponse(cachedResponse);
      }

      return fetch(e.request).then((networkResponse) => {
        return cleanRedirectResponse(networkResponse);
      });
    })
  );
});
