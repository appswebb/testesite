/* entre. Lives · LiveKit host + one approved guest + spectators. */
(function(){
'use strict';
const s={rows:[],loading:false,active:null,room:null,localRole:null,joining:false,camera:true,mic:true,timer:null,remoteTracks:new Map(),title:'',error:''};
let sdkPromise=null;
async function sdk(){
 if(window.LivekitClient?.Room)return window.LivekitClient;
 if(!sdkPromise)sdkPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/livekit-client@2.25.0/dist/livekit-client.umd.min.js';
  script.async=true;script.onload=()=>window.LivekitClient?.Room?resolve(window.LivekitClient):reject(Error('LiveKit não foi carregado.'));
  script.onerror=()=>reject(Error('Não foi possível carregar o vídeo.'));document.head.appendChild(script);
 });
 return sdkPromise;
}
function card(l){
 const host=l.is_host,guest=l.is_guest;
 return '<article class="camera-live-card"><div class="camera-live-cover"><span class="camera-live-label">● AO VIVO</span><span class="camera-live-camera">'+ico('camera',32)+'</span></div><div class="camera-live-info"><strong>'+esc(l.title)+'</strong><small>com '+esc(l.host_name)+(l.guest_name?' e '+esc(l.guest_name):'')+'</small><button type="button" data-live-action="join" data-id="'+esc(l.id)+'">'+(host?'Voltar para minha live':guest?'Entrar como convidado':'Assistir à live')+' '+ico('arrow',15)+'</button></div></article>';
}
function viewer(){
 if(!s.active)return '';
 const l=s.active,role=s.localRole||'viewer',publisher=role==='host'||role==='guest';
 const source=s.rows.find(x=>x.id===l.id)||l;
 return '<section class="camera-live-stage"><header class="camera-live-stage-head"><div><span class="camera-live-pill">● AO VIVO · '+(publisher?'CÂMERA':'ASSISTINDO')+'</span><h3>'+esc(source.title||'Live')+'</h3><p>'+esc(source.host_name||'Pessoa')+(source.guest_name?' · com '+esc(source.guest_name):'')+'</p></div><button type="button" data-live-action="leave" class="camera-live-back">'+ico('close',18)+' Sair</button></header>'+
 '<div class="camera-live-grid" id="cameraLiveVideos"><div class="camera-live-wait"><span>✳</span><p>'+(s.joining?'Conectando ao vídeo…':'Aguardando a câmera do apresentador…')+'</p></div></div>'+
 '<div class="camera-live-tools">'+(publisher?'<button type="button" data-live-action="mic" class="'+(s.mic?'':'muted')+'">'+ico('mic',17)+' '+(s.mic?'Microfone':'Microfone desligado')+'</button><button type="button" data-live-action="camera" class="'+(s.camera?'':'muted')+'">'+ico('camera',17)+' '+(s.camera?'Câmera':'Câmera desligada')+'</button>':'')+
 (role==='host'&&source.guest_requested_by&&!source.guest_id?'<div class="camera-live-invite"><strong>Alguém quer participar da transmissão</strong><button type="button" data-live-action="approve">Aceitar</button><button type="button" data-live-action="reject">Recusar</button></div>':'')+
 (role==='viewer'&&!source.guest_id?'<button type="button" data-live-action="request" '+(source.requested?'disabled':'')+'>'+ico('users',17)+' '+(source.requested?'Pedido enviado':'Pedir para entrar com câmera')+'</button>':'')+
 (role==='host'?'<button type="button" class="camera-live-danger" data-live-action="end">Encerrar live</button>':'')+'</div>'+
 '<p class="camera-live-security">Transmissão em tempo real. Só o apresentador e o convidado aceito podem compartilhar câmera e microfone. Nada é gravado pelo entre.</p></section>';
}
function view(){
 return heading('TRANSMISSÕES AO VIVO','Lives de <em>câmera.</em>','Assista a transmissões ou convide outra pessoa para participar da mesma live.')+
 '<section class="camera-live-shell">'+(s.active?viewer(): '<div class="camera-live-hero"><div><span>✳ UMA COMUNIDADE, AO VIVO</span><h3>Compartilhe um momento <em>real.</em></h3><p>Você pode transmitir com sua câmera ou convidar uma pessoa. O público assiste sem precisar liberar a própria câmera.</p></div><form id="cameraLiveStartForm"><label for="cameraLiveTitle">Título da sua live</label><input id="cameraLiveTitle" name="title" minlength="3" maxlength="90" required placeholder="Sobre o que vamos conversar?" value="'+esc(s.title)+'"><button type="submit">'+ico('camera',19)+' Começar live</button></form></div>')+
 '<div class="camera-live-list-head"><h3>Transmissões acontecendo</h3><button type="button" data-live-action="refresh">'+ico('refresh',17)+' Atualizar</button></div>'+
 (s.rows.length?'<div class="camera-live-list">'+s.rows.map(card).join('')+'</div>':
 '<div class="camera-live-empty"><span>'+ico('camera',26)+'</span><strong>'+(s.loading?'Carregando lives…':'Nenhuma live no momento')+'</strong><p>Quando alguém iniciar uma transmissão, ela aparece aqui.</p></div>')+
 '</section>';
}
async function refresh(paint=true){
 if(s.loading||!state.session)return;
 s.loading=true;
 try{
  const {data,error}=await db.rpc('entre_lives_list');if(error)throw error;
  s.rows=Array.isArray(data)?data:[];
  if(s.active){
   const found=s.rows.find(x=>x.id===s.active.id);
   if(!found){await leave(false);toast('A transmissão foi encerrada.');}
   else{
    const oldRole=s.localRole;
    s.active={...s.active,...found};
    if(oldRole==='viewer'&&found.is_guest){await join(found.id);}
   }
  }
  if(paint&&state.view==='lives')renderView();
 }catch(e){console.warn('Lives indisponíveis',e);s.error=infoError(e);}
 finally{s.loading=false;}
}
function attach(participant,track,unique){
 const root=document.getElementById('cameraLiveVideos');if(!root||!track)return;
 const id=unique||participant.identity+'-'+track.kind;
 let frame=root.querySelector('[data-live-track="'+id+'"]');
 if(!frame){
  frame=document.createElement('div');frame.className='camera-live-video';frame.dataset.liveTrack=id;
  frame.innerHTML='<span class="camera-live-video-name"></span>';
  root.querySelector('.camera-live-wait')?.remove();
  root.appendChild(frame);
 }
 frame.querySelector('.camera-live-video-name').textContent=participant.name||'Pessoa';
 const el=track.attach();
 el.autoplay=true;el.playsInline=true;
 if(track.kind==='video'){el.muted=participant===s.room?.localParticipant;frame.querySelector('video')?.remove();frame.appendChild(el);}
 else {el.muted=participant===s.room?.localParticipant;frame.appendChild(el);}
}
function attachAll(){
 if(!s.room)return;
 const local=s.room.localParticipant;
 for(const pub of local.trackPublications.values())if(pub.track)attach(local,pub.track,local.identity+'-'+pub.kind);
 for(const p of s.room.remoteParticipants.values())for(const pub of p.trackPublications.values())if(pub.track)attach(p,pub.track,p.identity+'-'+pub.kind);
}
async function join(id){
 if(s.joining)return;
 s.joining=true;
 try{
  const {data,error}=await db.functions.invoke('entre-camera-live-token',{body:{live_id:id}});
  if(error||!data?.token||!data.url)throw Error(data?.error==='livekit_not_configured'?'O servidor LiveKit ainda não está configurado.':'Não foi possível entrar nesta transmissão.');
  await disconnect();
  const live=s.rows.find(x=>x.id===id);
  if(!live)throw Error('Essa transmissão foi encerrada.');
  s.active={...live};
  s.localRole=data.role;s.camera=true;s.mic=true;
  if(state.view==='lives')renderView();
  const lk=await sdk();
  const room=new lk.Room({adaptiveStream:true,dynacast:true,stopLocalTrackOnUnpublish:true});
  s.room=room;
  room.on(lk.RoomEvent.TrackSubscribed,(track,publication,participant)=>{if(s.room===room)attach(participant,track);});
  room.on(lk.RoomEvent.TrackUnsubscribed,(track,publication,participant)=>{
   track.detach().forEach(el=>el.remove());
   document.querySelectorAll('[data-live-track="'+participant.identity+'-'+track.kind+'"]').forEach(x=>x.remove());
  });
  room.on(lk.RoomEvent.ParticipantDisconnected,participant=>{
   document.querySelectorAll('[data-live-track^="'+participant.identity+'-"]').forEach(el=>el.remove());
  });
  room.on(lk.RoomEvent.Disconnected,()=>{if(s.room===room){void leave(false);toast('Conexão da live encerrada.');}});
  await room.connect(data.url,data.token,{autoSubscribe:true});
  if(data.role==='host'||data.role==='guest')await room.localParticipant.enableCameraAndMicrophone();
  if(state.view==='lives'){renderView();attachAll();}
 }catch(e){
  const msg=e?.message||'Falha ao conectar à live.';
  await disconnect();s.active=null;s.localRole=null;
  if(state.view==='lives')renderView();toast(msg,true);
  throw e;
 }finally{s.joining=false;}
}
async function disconnect(){
 const r=s.room;s.room=null;
 if(r){try{r.removeAllListeners();await r.disconnect();}catch(e){}}
}
async function leave(remote=true){
 const id=s.active?.id,role=s.localRole;
 await disconnect();s.active=null;s.localRole=null;
 if(remote&&id&&(role==='host'||role==='guest')){
  const {error}=await db.rpc('entre_live_exit',{_live:id});if(error)toast(infoError(error),true);
 }
 if(state.view==='lives')renderView();
}
async function start(form){
 const title=String(form.elements.title.value||'').trim();
 if(s.joining)return;
 const btn=form.querySelector('[type=submit]');if(btn)btn.disabled=true;
 try{
  const {data,error}=await db.rpc('entre_live_start',{_title:title});if(error)throw error;
  s.title=title;
  await refresh(false);
  try{await join(data);}catch(e){await db.rpc('entre_live_exit',{_live:data});throw e;}
 }catch(e){toast(infoError(e),true)}finally{if(btn?.isConnected)btn.disabled=false;}
}
async function action(type,button){
 if(type==='refresh'){await refresh();return;}
 if(type==='join'){try{await join(button.dataset.id);}catch(e){}return;}
 if(type==='leave'){await leave();await refresh();return;}
 if(type==='end'){if(confirm('Encerrar sua live agora?')){await leave();await refresh();}return;}
 if(type==='request'){
  const {error}=await db.rpc('entre_live_request_guest',{_live:s.active?.id});if(error)throw error;toast('Pedido enviado. Aguarde o apresentador.');await refresh();return;
 }
 if(type==='approve'||type==='reject'){
  const {error}=await db.rpc('entre_live_review_guest',{_live:s.active?.id,_approve:type==='approve'});
  if(error)throw error;toast(type==='approve'?'Convidado aceito.':'Pedido recusado.');await refresh();return;
 }
 if((type==='mic'||type==='camera')&&s.room&&(s.localRole==='host'||s.localRole==='guest')){
  if(type==='mic'){s.mic=!s.mic;await s.room.localParticipant.setMicrophoneEnabled(s.mic);}
  else{s.camera=!s.camera;await s.room.localParticipant.setCameraEnabled(s.camera);}
  if(state.view==='lives'){renderView();attachAll();}
 }
}
document.addEventListener('submit',event=>{if(event.target?.id!=='cameraLiveStartForm')return;event.preventDefault();void start(event.target);});
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-live-action]');if(!button)return;
 void action(button.dataset.liveAction,button).catch(e=>toast(infoError(e),true));
});
function beginPolling(){
 if(s.timer)clearInterval(s.timer);
 s.timer=setInterval(()=>{if(state.view==='lives'&&!document.hidden)void refresh(!s.active);},8000);
}
async function enter(){await refresh();beginPolling();}
function stop(){if(s.timer)clearInterval(s.timer);s.timer=null;}
window.entreLives={view,enter,stop,leave,refresh,isActive:()=>Boolean(s.active)};
})();