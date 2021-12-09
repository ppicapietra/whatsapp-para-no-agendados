const versionNumber = "1.3.0";
let cacheName = 'wanoa-cache-v1';
let filesToCache = [
  './images/whatsapp-16.png',
  './images/whatsapp-128.png',
  './images/whatsapp-256.png',
  './images/whatsapp-512.png',
  './whatsapp-msg.html',
  './linksUtils.js'
];

/* Start the service worker and cache all of the app's content */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(cacheName).then((cache) => {
      return cache.addAll(filesToCache);
    }).then(() => navigator.registerProtocolHandler('web+wanoa', 'https://grupopietra.com/tools/wsp-ncs/whatsapp-msg.html?q=%s',"WaNoA"))
  );
});

/* Serve cached content when offline */
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((response) => {
      return response || fetch(e.request);
    })
  );
});

/* Delete old caché when this one start working after an app update */
self.addEventListener('activate', (e) => {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames.map(function (cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );

});
/* App launched */
self.addEventListener('launch', async (e) => {

});