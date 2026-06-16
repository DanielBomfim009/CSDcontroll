const CACHE_NAME = "salariopro-v11";

const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./assets/css/app.css",
    "./assets/js/database/indexeddb.js",
    "./assets/js/modules/competencia.js",
    "./assets/js/modules/horas.js",
    "./assets/js/modules/folha.js",
    "./assets/js/app.js",
    "./assets/img/logo-mark.svg",
    "./assets/img/logo-full.svg",
    "./assets/img/icon.svg"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(cache => cache.addAll(APP_SHELL))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches
            .keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    if (event.request.method !== "GET") {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
                return response;
            })
            .catch(() => {
                return caches
                    .match(event.request)
                    .then(cached => cached || caches.match("./index.html"));
            })
    );
});
