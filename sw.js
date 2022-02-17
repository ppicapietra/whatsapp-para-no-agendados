const versionNumber = "1.6.3";
let cacheName = 'wanoa-cache-v4';
let filesToCache = [
  './images/whatsapp-16.png',
  './images/whatsapp-128.png',
  './images/whatsapp-192.png',
  './images/whatsapp-256.png',
  './images/whatsapp-512.png',
  './index.html',
  './linksUtils.js'
];

/* Start the service worker and cache all of the app's content */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      return cache.addAll(filesToCache);
    })
  );
});

/* Delete old caché when this one start working after an app update */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );

});

/* Serve cached content when offline */
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((response) => {
      if (response !== undefined) {
        return response;
      }
      else {    
        return fetch(e.request)
          .then(response => {
            let responseClone = response.clone();
            if((e.request.url.indexOf('chrome-extension') == -1)){ 
              caches.open(cacheName)
              .then(cache => cache.put(e.request, responseClone));
          }
            return response;
          })
          .catch(() => caches.match('./images/whatsapp-128.png'));
      }
    })
  );
});