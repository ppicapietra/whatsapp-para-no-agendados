const versionNumber = "1.6.18";
let cacheName = 'wanoa-cache-v10';
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
self.addEventListener( 'install', e => {
  e.waitUntil(
    caches.open( cacheName ).then( cache => {
      return cache.addAll( filesToCache );
    } )
  );
} );

/* Delete old caché when this one start working after an app update */
self.addEventListener( 'activate', e => {
  e.waitUntil(
    caches.keys().then( function ( cacheNames ) {
      return Promise.all(
        cacheNames.map( function ( cacheName ) {
          return caches.delete( cacheName );
        } )
      );
    } )
  );

} );

/* Serve cached content when offline */
self.addEventListener( 'fetch', event => {

  // 👉 Captura Web Share Target
  if (
    event.request.method === 'POST' &&
    new URL( event.request.url ).pathname === '/tools/wsp-ncs/index.html'
  ) {
    event.respondWith( ( async () => {
      const data = await event.request.formData();
      const text = data.get( 'text' ) || '';
      const title = data.get( 'title' ) || '';
      const url = data.get( 'url' ) || '';

      const params = new URLSearchParams();
      if ( text ) params.set( 'text', text );
      if ( title ) params.set( 'title', title );
      if ( url ) params.set( 'url', url );

      return Response.redirect(
        `/tools/wsp-ncs/index.html?${ params.toString() }`,
        303
      );
    } )() );
    return;
  }

  // 👉 Tu lógica original de cache
  // Solo cachear peticiones GET (el Cache API no soporta POST)
  if ( event.request.method !== 'GET' ) {
    return;
  }

  event.respondWith(
    caches.match( event.request, { ignoreSearch: true } ).then( response => {
      if ( response ) return response;

      return fetch( event.request )
        .then( networkResponse => {
          if ( !event.request.url.includes( 'chrome-extension' ) ) {
            const clone = networkResponse.clone();
            caches.open( cacheName ).then( cache => cache.put( event.request, clone ) );
          }
          return networkResponse;
        } )
        .catch( () => caches.match( './images/whatsapp-128.png' ) );
    } )
  );
} );