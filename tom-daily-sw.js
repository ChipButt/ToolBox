/* Offline support for Tom's Daily. */
const CACHE="tom-daily-cache-v3-motivation-20261020";
const CORE=["./tom-daily.html","./tom-daily-v2.css","./tom-daily-v2.js","./tom-daily-icon.svg","./tom-daily-icon-192.png","./tom-daily-icon-512.png","./tom-daily.webmanifest"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("tom-daily-cache-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET"||new URL(event.request.url).origin!==self.location.origin)return;
  const pathname=new URL(event.request.url).pathname;
  if(!CORE.some(path=>pathname.endsWith(path.slice(1))))return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request)));
});