// Build replaces this marker with a content hash. Old games finish before updates activate.
const CACHE = 'zero-hour-__BUILD_HASH__';
const CORE = ['./','./index.html','./play.html','./styles.css','./src/app.js','./src/core.js','./src/storage.js','./src/art.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png'];
const ROOT = new URL('./', self.location.href);
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE))));
self.addEventListener('activate', event => event.waitUntil((async()=>{
  for(const key of await caches.keys()) if(key.startsWith('zero-hour-')&&key!==CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==ROOT.origin||!url.pathname.startsWith(ROOT.pathname))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),cached=await cache.match(event.request,{ignoreSearch:true});
    if(cached)return cached;
    try{return await fetch(event.request);}catch(error){
      if(event.request.mode==='navigate')return await cache.match(new URL('./index.html',ROOT).href);
      throw error;
    }
  })());
});
