/* ƐMU YƐ service worker: caches the app shell so it opens offline. All paths are relative to the scope. */
var CACHE = "emuye-shell-v2";
var SHELL = [
  "./",
  "index.html",
  "app.js",
  "hark.css",
  "hark-hero.css",
  "hark.js",
  "logo.webp",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf("emuye-shell-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Same-origin GETs: network first (fresh app), cache as fallback (offline). Audio streams, APIs and
   media range requests from other hosts go straight to the network. */
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || req.headers.has("range")) return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok && res.type === "basic") {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        if (req.mode !== "navigate") return Response.error();
        return caches.match("index.html").then(function (shell) { return shell || Response.error(); });
      });
    })
  );
});
