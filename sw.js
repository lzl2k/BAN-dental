// MAS Dental Lab service worker — network-first so updates always appear
const CACHE='mas-v20261102';
self.addEventListener('install',e=>{ self.skipWaiting(); });
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET'||!r.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(r).then(res=>{ const copy=res.clone(); caches.open(CACHE).then(c=>c.put(r,copy)); return res; })
      .catch(()=>caches.match(r).then(m=>m||caches.match('index.html')))
  );
});
