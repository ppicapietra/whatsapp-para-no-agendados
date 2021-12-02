const versionNumber = "1.0";
let cacheName = 'wncs-pwa';
let filesToCache = [
  './images/whatsapp-16.png',
  './images/whatsapp-128.png',
  './images/whatsapp-256.png',
  './images/whatsapp-512.png',
  './whatsapp-msg.html',
  './linksUtils.js'  
];

/* Start the service worker and cache all of the app's content */
self.addEventListener( 'install', ( e ) => {
  e.waitUntil(
    caches.open( cacheName ).then( ( cache ) => {
      return cache.addAll( filesToCache );
    })
  );
});

/* Serve cached content when offline */
self.addEventListener( 'fetch', ( e ) => {
  e.respondWith(
    caches.match( e.request, { ignoreSearch: true }).then( ( response ) => {
      return response || fetch( e.request );
    })
  );
});

/* App launched */
self.addEventListener( 'launch', async ( e ) => {
  
});