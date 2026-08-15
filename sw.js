/**
 * ============================================
 * VSPen Service Worker v2
 * Estrategia: Cache-First para assets propios
 *             Network-First para CDNs externos
 * CORREGIDO: Rutas /vspen/ + Precache tolerante
 * ============================================
 */

const CACHE_NAME = 'vspen-v3';
const OFFLINE_URL = '/vspen/index.html';

// Assets críticos con prefijo /vspen/ para GitHub Pages
const PRECACHE_ASSETS = [
  '/vspen/',
  '/vspen/index.html',
  '/vspen/manifest.json',
  '/vspen/js/app.js',
  '/vspen/assets/icons/favicon.svg',

  // CSS
  '/vspen/css/design-system.css',
  '/vspen/css/themes/dark-default.css',
  '/vspen/css/themes/light-default.css',
  '/vspen/css/layout.css',
  '/vspen/css/components.css',
  '/vspen/css/editor.css',

  // Core JS
  '/vspen/js/core/constants.js',
  '/vspen/js/core/event-bus.js',
  '/vspen/js/core/service-registry.js',
  '/vspen/js/core/storage-service.js',
  '/vspen/js/core/command-palette.js',

  // Filesystem JS
  '/vspen/js/filesystem/file-node.js',
  '/vspen/js/filesystem/serializer.js',
  '/vspen/js/filesystem/virtual-fs.js',
  '/vspen/js/filesystem/fs-watchers.js',

  // Editor JS
  '/vspen/js/editor/languages/typescript.js',
  '/vspen/js/editor/languages/javascript.js',
  '/vspen/js/editor/languages/css.js',
  '/vspen/js/editor/languages/html.js',
  '/vspen/js/editor/syntax-highlighter.js',
  '/vspen/js/editor/line-numbers.js',
  '/vspen/js/editor/auto-close-pairs.js',
  '/vspen/js/editor/undo-manager.js',
  '/vspen/js/editor/editor-core.js',

  // Compiler JS
  '/vspen/js/compiler/cache-layer.js',
  '/vspen/js/compiler/import-resolver.js',
  '/vspen/js/compiler/error-normalizer.js',
  '/vspen/js/compiler/babel-adapter.js',
  '/vspen/js/compiler/compiler-service.js',

  // Preview JS
  '/vspen/js/preview/sandbox-manager.js',
  '/vspen/js/preview/preview-bridge.js',
  '/vspen/js/preview/hot-reload.js',

  // UI JS
  '/vspen/js/ui/icon-registry.js',
  '/vspen/js/ui/component-system.js',
  '/vspen/js/ui/theme-engine.js',
  '/vspen/js/ui/layout-engine.js',
  '/vspen/js/ui/components/title-bar.js',
  '/vspen/js/ui/components/activity-bar.js',
  '/vspen/js/ui/components/file-explorer.js',
  '/vspen/js/ui/components/tab-bar.js',
  '/vspen/js/ui/components/status-bar.js',
  '/vspen/js/ui/components/error-panel.js'
];

// =============================================
// INSTALL: Precache tolerante a fallos
// Un solo 404 YA NO rompe todo el service worker
// =============================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Precaching assets...');

      const results = await Promise.allSettled(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            await cache.add(url);
            return { url, ok: true };
          } catch (err) {
            console.warn(`[SW] Failed to cache: ${url}`);
            return { url, ok: false, error: err.message };
          }
        })
      );

      const succeeded = results.filter((r) => r.value?.ok).length;
      const failed = results.filter((r) => !r.value?.ok);

      if (failed.length > 0) {
        console.warn(`[SW] ${failed.length} assets failed to precache:`);
        failed.forEach((f) => console.warn(`  ✗ ${f.value.url}`));
      }

      console.log(`[SW] Precache complete: ${succeeded}/${results.length} cached`);
      return self.skipWaiting();
    })
  );
});

// =============================================
// ACTIVATE: Limpiar caches antiguas + claim
// =============================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[SW] Activated:', CACHE_NAME);
      return self.clients.claim();
    })
  );
});

// =============================================
// FETCH: Estrategia híbrida
// =============================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar requests no-GET
  if (event.request.method !== 'GET') return;

  // Cross-origin: solo manejar CDNs conocidos
  if (url.origin !== location.origin) {
    if (isKnownCDN(url.hostname)) {
      event.respondWith(networkFirstWithCache(event.request));
    }
    // Otros cross-origin: dejar pasar al navegador
    return;
  }

  // Assets propios: Cache-First con fallback a network
  event.respondWith(cacheFirstWithNetwork(event.request));
});

// =============================================
// ESTRATEGIAS DE CACHE
// =============================================

/**
 * Cache-First: Intenta cache → si falla va a red → actualiza cache
 * Ideal para assets propios que cambian solo con deploy
 */
async function cacheFirstWithNetwork(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Fallback offline solo para navegación
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_URL);
      if (offlinePage) return offlinePage;
    }
    return new Response('VSPen is offline', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Network-First: Intenta red → si falla usa cache
 * Ideal para CDNs cuyo contenido puede actualizarse
 */
async function networkFirstWithCache(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('CDN unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Verificar si hostname es un CDN conocido
 */
function isKnownCDN(hostname) {
  const knownCDNs = [
    'unpkg.com',
    'esm.sh',
    'cdn.skypack.dev',
    'cdn.jsdelivr.net'
  ];
  return knownCDNs.some((cdn) => hostname.endsWith(cdn));
}

// =============================================
// MESSAGE: Comunicación con la app principal
// =============================================
self.addEventListener('message', (event) => {
  if (!event.data || !event.data.type) return;

  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      caches.delete(CACHE_NAME).then(() => {
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ success: true });
        }
      });
      break;

    case 'GET_VERSION':
      if (event.ports && event.ports[0]) {
        event.ports[0].postMessage({ version: CACHE_NAME });
      }
      break;
  }
});
