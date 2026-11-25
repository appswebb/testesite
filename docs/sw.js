// Offline-only fallback; never cache logged-in pages, chats, RPC responses or images.
const CACHE='entre-public-offline-v23-connect',OFFLINE='./offline.html';
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

/* Web Push intentionally uses generic text; never display private message content. */
self.addEventListener('push',event=>{
 event.waitUntil(self.registration.showNotification('CONNECT',{body:'Você tem uma nova atividade.',icon:'./connect-app-icon.svg',badge:'./connect-app-icon.svg',tag:'connect-activity',data:{path:'./?push=1'}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{const url=new URL('./?push=1',self.registration.scope).href;const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of clients){if(new URL(client.url).origin===new URL(url).origin){await client.navigate(url);return client.focus();}}return self.clients.openWindow(url);})());
});
