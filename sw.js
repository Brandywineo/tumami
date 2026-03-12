const CACHE_NAME = 'tumami-shell-v1';
const SHELL_ASSETS = [
  '/',
  '/index.php',
  '/login.php',
  '/register.php',
  '/assets/css/global.css',
  '/assets/js/header.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).catch(() => Promise.resolve())
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isLocationApi = url.pathname.endsWith('/runner_location.php') || url.pathname.endsWith('/runner_location_update.php') || url.pathname.endsWith('/client_location_update.php') || url.pathname.endsWith('/stream_client_map.php') || url.pathname.endsWith('/stream_runner_map.php');
  if (isLocationApi) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.php')))
  );
});
