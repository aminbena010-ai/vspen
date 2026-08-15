/**
 * ============================================
 * VSPen Service Worker
 * Estrategia: Cache-First para assets propios
 *             Network-First para CDNs externos
 * ============================================
 */

const CACHE_NAME = 'vspen-v1';
const OFFLINE_URL = '/index.html';

// Assets críticos que SIEMPRE deben estar disponibles offline
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  
  // CSS
  '/css/design-system.css',
  '/css/themes/dark-default.css',
  '/css/themes/light-default.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/editor.css',
  
  // Core JS
  '/js/core/constants.js',
  '/js/core/event-bus.js',
  '/js/core/service-registry.js',
  '/js/core/storage-service.js',
  '/js/core/command-palette.js',
  
  // Filesystem JS
  '/js/filesystem/file-node.js',
  '/js/filesystem/serializer.js',
  '/js/filesystem/virtual-fs.js',
  '/js/filesystem/fs-watchers.js',
  
  // Editor JS
  '/js/editor/languages/typescript.js',
  '/js/editor/languages/javascript.js',
  '/js/editor/languages/css.js',
  '/js/editor/languages/html.js',
  '/js/editor/syntax-highlighter.js',
  '/js/editor/line-numbers.js',
  '/js/editor/auto-close-pairs.js',
  '/js/editor/undo-manager.js',
  '/js/editor/editor-core.js',
  
  // Compiler JS
  '/js/compiler/cache-layer.js',
  '/js/compiler/import-resolver.js',
  '/js/compiler/error-normalizer.js',
  '/js/compiler/babel-adapter.js',
  '/js/compiler/compiler-service.js',
  
  // Preview JS
  '/js/preview/sandbox-manager.js',
  '/js/preview/preview-bridge.js',
  '/js/preview/hot-reload.js',
  
  // UI JS
  '/js/ui/icon-registry.js',
  '/js/ui/component-system.js',
  '/js/ui/theme-engine.js',
  '/js/ui/layout-engine.js',
  '/js/ui/components/title-bar.js',
  '/js/ui/components/activity-bar.js',
  '/js/ui/components/file-explorer.js',
  '/js/ui/components/tab-bar.js',
  '/js/ui/components/status-bar.js',
  '/js/ui/components/error-panel.js',
  
  // Bootstrap
  '/app.js'
];

// =============================================
// INSTALL: Precache assets críticos
// =============================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching assets...');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      console.log('[SW] Precache complete');
      return self.skipWaiting();
    })
  );
});

// =============================================
// ACTIVATE: Limpiar caches antiguas
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
      console.log('[SW] Activated');
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
  
  // Ignorar cross-origin que no sean CDNs conocidos
  if (url.origin !== location.origin) {
    // Para CDNs externos (Babel, esm.sh): Network-First con fallback a cache
    if (isKnownCDN(url.hostname)) {
      event.respondWith(networkFirstWithCache(event.request));
      return;
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
 * Cache-First: Intenta cache, si falla va a red y actualiza cache
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
    // Fallback offline para navegación
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match(OFFLINE_URL);
      if (offlinePage) return offlinePage;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network-First: Intenta red, si falla usa cache
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
    return cached || new Response('Offline CDN', { status: 503 });
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
  return knownCDNs.some(cdn => hostname.endsWith(cdn));
}

// =============================================
// MESSAGE: Comunicación con la app principal
// =============================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});