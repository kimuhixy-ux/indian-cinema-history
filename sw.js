// sw.js: オフライン閲覧のためのService Worker
// データやコードを更新したら CACHE_VERSION を必ず上げること(上げ忘れると端末に古い版が残る)
const CACHE_VERSION = "indian-cinema-history-v1";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/main.js",
  "./js/router.js",
  "./js/data.js",
  "./js/components/movie-card.js",
  "./js/views/movies.js",
  "./js/views/movie-detail.js",
  "./data/movies.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

async function precache(cache, urls) {
  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok && !response.redirected) {
          await cache.put(url, response);
        }
      } catch (e) {
        // オフライン等でプリキャッシュに失敗しても致命的ではない
      }
    })
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => precache(cache, PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== location.origin) return; // JioSaavn等の外部リンクは対象外

  // HTML(ナビゲーション)とJSONはnetwork-first、それ以外(CSS/JS/画像)はcache-first
  const isJson = request.url.endsWith(".json");
  if (request.mode === "navigate" || isJson) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response.redirected) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok && !response.redirected) cache.put(request, response.clone());
    return response;
  } catch (e) {
    return (await cache.match(request)) || Response.error();
  }
}
