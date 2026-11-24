/*
 * Offline support for the installable app (PWA).
 * The tools, their scripts and the vendor libraries are cached on install, so the
 * converter and editor open with no connection. Pages are served network-first
 * (you always get the latest when online), static files stale-while-revalidate.
 * Bump VERSION only to force-clear old caches (e.g. after renaming files).
 */
const VERSION = 'gp-animate-v1';
const CORE = [
    '/', '/index.html', '/editor.html', '/how-to-use.html', '/404.html',
    '/assets/site.css', '/assets/site.js', '/assets/converter.js', '/assets/editor.js', '/assets/showcase.js',
    '/assets/pro.js', '/assets/pro-page.js', '/assets/ai-bg.js', '/assets/ai-worker.js', '/assets/pro-tools.js', '/pro.html',
    '/assets/paw-logo-192.png', '/assets/icon-512.png',
    '/vendor/jszip.min.js', '/vendor/gif.js', '/vendor/gif.worker.js',
    '/fonts/fonts.css', '/fonts/inter-latin.woff2', '/fonts/outfit-latin.woff2',
    '/site.webmanifest'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys()
        .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
    const req = e.request;
    const url = new URL(req.url);
    // Leave ads, analytics and anything off-site to the network.
    if (req.method !== 'GET' || url.origin !== location.origin) return;
    // The showcase list should always be fresh when online.
    const networkFirst = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.startsWith('/showcase/');

    if (networkFirst) {
        e.respondWith(
            fetch(req).then(res => {
                if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
                return res;
            }).catch(() => caches.match(req, { ignoreSearch: true })
                .then(hit => hit || (req.mode === 'navigate' ? caches.match('/index.html') : Response.error())))
        );
    } else {
        // Stale-while-revalidate: answer from cache instantly, refresh it in the background,
        // so a deploy reaches users on their next visit without having to bump VERSION.
        e.respondWith(caches.open(VERSION).then(cache => cache.match(req).then(hit => {
            const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; });
            if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
            return fresh;
        })));
    }
});
