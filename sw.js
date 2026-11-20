const versionNumber = "1.7.3";
const SHARE_CACHE = 'wanoa-shared-file';
const MAX_FILE_BYTES = 50 * 1024 * 1024;
let cacheName = 'wanoa-cache-v14';
let filesToCache = [
  './images/whatsapp-16.png',
  './images/whatsapp-128.png',
  './images/whatsapp-192.png',
  './images/whatsapp-256.png',
  './images/whatsapp-512.png',
  './index.html',
  './linksUtils.js',
  './storageClient.js'
];

function shareCacheUrls() {
  const scope = self.registration.scope;
  return {
    file: new URL('shared-file', scope).href,
    meta: new URL('shared-file-meta', scope).href
  };
}

function isShareTargetPost(request) {
  if (request.method !== 'POST') return false;
  const pathname = new URL(request.url).pathname;
  return pathname === '/tools/wsp-ncs/index.html' || pathname.endsWith('/index.html');
}

function sharedFiles(formData) {
  return formData.getAll('file').filter((item) => {
    return item && typeof item.size === 'number' && (item.name || item.size > 0);
  });
}

function redirectToApp(requestUrl, params) {
  const target = new URL(requestUrl.pathname, requestUrl.origin);
  params.forEach((value, key) => {
    if (value) target.searchParams.set(key, value);
  });
  return Response.redirect(target.toString(), 303);
}

async function storeSharedFile(file, extraCount) {
  const cache = await caches.open(SHARE_CACHE);
  const urls = shareCacheUrls();
  const headers = new Headers();
  if (file.type) headers.set('Content-Type', file.type);
  await cache.put(urls.file, new Response(file, { headers }));
  await cache.put(urls.meta, new Response(JSON.stringify({
    name: file.name || 'archivo',
    type: file.type || '',
    size: file.size || 0,
    extraCount: extraCount || 0
  }), {
    headers: { 'Content-Type': 'application/json' }
  }));
}

/* Start the service worker and cache all of the app's content */
self.addEventListener( 'install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open( cacheName ).then( cache => {
      return cache.addAll( filesToCache );
    } )
  );
} );

/* Delete old caché when this one start working after an app update */
self.addEventListener( 'activate', e => {
  e.waitUntil(
    caches.keys().then( function ( names ) {
      return Promise.all(
        names.map( function ( name ) {
          if ( name === SHARE_CACHE ) return Promise.resolve();
          return caches.delete( name );
        } )
      );
    } ).then( () => self.clients.claim() )
  );

} );

/* Serve cached content when offline */
self.addEventListener( 'fetch', event => {

  // 👉 Captura Web Share Target
  if ( isShareTargetPost( event.request ) ) {
    event.respondWith( ( async () => {
      const requestUrl = new URL( event.request.url );
      const params = new URLSearchParams();
      try {
        const data = await event.request.formData();
        const text = data.get( 'text' ) || '';
        const title = data.get( 'title' ) || '';
        const url = data.get( 'url' ) || '';
        if ( text ) params.set( 'text', text );
        if ( title ) params.set( 'title', title );
        if ( url ) params.set( 'url', url );

        const files = sharedFiles( data );
        if ( files.length ) {
          const file = files[ 0 ];
          if ( file.size > MAX_FILE_BYTES ) {
            params.set( 'fileError', 'size' );
          } else {
            await storeSharedFile( file, files.length - 1 );
            params.set( 'sharedFile', '1' );
          }
        }
      } catch ( err ) {
        params.set( 'fileError', 'read' );
      }

      return redirectToApp( requestUrl, params );
    } )() );
    return;
  }

  // view.php arma el HTML en el servidor. No se puede cachear: cada código es otra página.
  if ( new URL( event.request.url ).pathname.endsWith( '/view.php' ) ) {
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
