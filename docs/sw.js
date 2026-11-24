// Offline-only fallback; never cache logged-in pages, chats, RPC responses or images.
const CACHE='entre-public-offline-v16-connect',OFFLINE='./offline.html';
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll([OFFLINE,'./connect-app-icon.svg','./connect-glass.svg'])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('entre-public-offline-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 if(event.request.mode!=='navigate'){
  const target=new URL(event.request.url),asset=new URL('./connect-glass.svg',self.location.href);
  if(event.request.method==='GET'&&target.href===asset.href)event.respondWith(fetch(event.request).catch(async()=>await caches.match('./connect-glass.svg')||Response.error()));
  return;
 }
 event.respondWith(fetch(event.request).catch(async()=>{
  const offline=await caches.match(OFFLINE);
  return offline||new Response('Sem conexão com a internet.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
 }));
});
