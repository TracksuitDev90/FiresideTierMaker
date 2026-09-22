/* FIRESIDE service worker — keeps the app usable on flaky or offline
   connections without ever serving a stale mix of files.
   - Same-origin files: network-first. Online you always get the latest
     deploy; the cached copy is used only when the network fails.
   - Google Fonts CSS: stale-while-revalidate.
   - Font files and the version-pinned CDN export library: cache-first
     (their URLs are immutable).
   - Everything else (image search APIs, pasted image URLs) is left alone. */
var VERSION = 'fireside-v2';
var SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'style.css', 'quadrant.css', 'image-search.css', 'battles.css',
  'script.js', 'image-search.js', 'battles.js', 'quadrant.js',
  'vendor/html-to-image.min.js',
  'icons/pen-2-svgrepo-com.svg',
  'icons/app/favicon.svg', 'icons/app/icon-192.png'
];

self.addEventListener('install', function(event){
  event.waitUntil(
    caches.open(VERSION).then(function(cache){
      // One missing file must not abort the whole install
      return Promise.all(SHELL.map(function(u){ return cache.add(u).catch(function(){}); }));
    }).then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== VERSION; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

function networkFirst(req){
  return fetch(req).then(function(res){
    if (res && res.ok && res.type === 'basic') {
      var copy = res.clone();
      caches.open(VERSION).then(function(c){ c.put(req, copy); });
    }
    return res;
  }).catch(function(){
    return caches.match(req, { ignoreSearch: true }).then(function(hit){
      if (hit) return hit;
      if (req.mode === 'navigate') return caches.match('index.html');
      return Response.error();
    });
  });
}
function cacheFirst(req){
  return caches.match(req).then(function(hit){
    return hit || fetch(req).then(function(res){
      if (res && (res.ok || res.type === 'opaque')) {
        var copy = res.clone();
        caches.open(VERSION).then(function(c){ c.put(req, copy); });
      }
      return res;
    });
  });
}
function staleWhileRevalidate(req){
  return caches.match(req).then(function(hit){
    var net = fetch(req).then(function(res){
      if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function(c){ c.put(req, copy); }); }
      return res;
    }).catch(function(){ return hit; });
    return hit || net;
  });
}

self.addEventListener('fetch', function(event){
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin) { event.respondWith(networkFirst(req)); return; }
  if (url.hostname === 'fonts.googleapis.com') { event.respondWith(staleWhileRevalidate(req)); return; }
  if (url.hostname === 'fonts.gstatic.com' ||
      (url.hostname === 'cdn.jsdelivr.net' && url.pathname.indexOf('/npm/html-to-image@1.11.11/') === 0) ||
      (url.hostname === 'unpkg.com' && url.pathname.indexOf('/html-to-image@1.11.11/') === 0)) {
    event.respondWith(cacheFirst(req));
  }
});
