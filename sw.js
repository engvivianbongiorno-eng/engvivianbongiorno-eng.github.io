const CACHE = 'checklist-v5';
const ASSETS = [
  '/index.html',
  '/manifest.json',
  '/icon-512.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e){
  var url = e.request.url;

  // Nunca cachear OAuth, Google APIs ou callback — sempre rede
  if(url.includes('googleapis.com') ||
     url.includes('accounts.google.com') ||
     url.includes('gstatic.com') ||
     url.includes('callback.html')){
    e.respondWith(fetch(e.request).catch(function(){ return new Response('', {status:503}); }));
    return;
  }

  // Scripts CDN (jspdf, html2canvas): rede primeiro, depois cache como fallback offline
  if(url.includes('cdnjs.cloudflare.com')){
    e.respondWith(
      fetch(e.request).then(function(resp){
        var clone = resp.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, clone); });
        return resp;
      }).catch(function(){
        return caches.match(e.request);
      })
    );
    return;
  }

  // Arquivos do app: cache primeiro
  e.respondWith(
    caches.match(e.request).then(function(cached){
      return cached || fetch(e.request);
    })
  );
});
