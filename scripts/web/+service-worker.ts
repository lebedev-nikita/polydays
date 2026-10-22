/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;
declare const __PRECACHE__: ReadonlyArray<string>;
declare const __CACHE_VERSION__: string;
export {};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(__CACHE_VERSION__)
      .then((cache) => cache.addAll([...__PRECACHE__]))
      .then(() => self.skipWaiting()),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("polydays-shell-") && key !== __CACHE_VERSION__)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/trpc/")
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(__CACHE_VERSION__);
      if (request.mode === "navigate") {
        try {
          return await fetch(request);
        } catch {
          return (await cache.match("/index.html")) ?? Response.error();
        }
      }
      const stored = await cache.match(request);
      if (stored) return stored;
      return fetch(request);
    })(),
  );
});
