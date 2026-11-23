/* entre. Lives · LiveKit host + one approved guest + spectators. */
(function(){
'use strict';
const s={rows:[],loading:false,active:null,room:null,localRole:null,joining:false,camera:true,mic:true,timer:null,remoteTracks:new Map(),title:'',error:'',region:'global',state:'',city:'',showCreate:false,search:''};
const UFS='AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const filtered=()=>s.rows.filter(l=>{
 const locationOk=s.region==='global'||(s.state&&l.state_code===s.state&&(s.region==='state'||(s.city&&normalize(l.city_name)===normalize(s.city))));
 const query=normalize(s.search);
 return locationOk&&(!query||normalize(l.title+' '+l.host_name+' '+(l.guest_name||'')).includes(query));
});

const filterMarkup=()=>'<div class="camera-live-filters">'+
 '<label class="live-search-field">Pesquisar live<input data-live-filter="search" type="search" maxlength="90" placeholder="Título ou apresentador" value="'+esc(s.search)+'" autocomplete="off"></label>'+
 '<label>Explorar<select data-live-filter="region"><option value="global" '+(s.region==='global'?'selected':'')+'>Global · todas as lives</option><option value="state" '+(s.region==='state'?'selected':'')+'>Por estado</option><option value="city" '+(s.region==='city'?'selected':'')+'>Por cidade</option></select></label>'+
 (s.region!=='global'?'<label>Estado<select data-live-filter="state"><option value="">Selecione o estado</option>'+UFS.map(uf=>'<option value="'+uf+'" '+(s.state===uf?'selected':'')+'>'+uf+'</option>').join('')+'</select></label>':'')+
 (s.region==='city'?'<label>Cidade<input data-live-filter="city" maxlength="100" placeholder="Digite sua cidade" value="'+esc(s.city)+'" autocomplete="off"></label>':'')+'</div>';

let sdkPromise=null;
async function sdk(){
 if(window.LivekitClient?.Room)return window.LivekitClient;
 if(!sdkPromise)sdkPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/livekit-client@2.25.0/dist/livekit-client.umd.min.js';
  script.async=true;script.onload=()=>window.LivekitClient?.Room?resolve(window.LivekitClient):reject(Error('LiveKit não foi carregado.'));
  script.onerror=()=>reject(Error('Não foi possível carregar o vídeo.'));document.head.appendChild(script);
 });
 return sdkPromise.catch(error=>{sdkPromise=null;throw error;});
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
function discoveryResults(){
 const rows=filtered();
 if(rows.length)return '<div class="camera-live-list">'+rows.map(card).join('')+'</div>';
 const where=s.region==='global'?'no momento':s.region==='state'?'neste estado':'nesta cidade';
 return '<div class="camera-live-empty" role="status"><span>'+ico('camera',27)+'</span><strong>'+(s.loading?'Buscando transmissões…':s.error?'Não foi possível carregar as lives':'Nenhuma transmissão '+where)+'</strong><p>'+(s.error?'Confira a conexão e toque em Atualizar.':s.rows.length?'Tente outra região ou volte ao filtro global.':'Quando alguém começar uma live, ela aparecerá aqui.')+'</p>'+(s.region!=='global'?'<button type="button" data-live-action="resetFilters">Ver lives globais</button>':'')+'</div>';
}
function updateDiscovery(){
 const result=document.getElementById('liveDiscoverResults');
 if(result)result.innerHTML=discoveryResults();
 const count=document.getElementById('liveDiscoverCount');
 if(count)count.textContent=String(filtered().length);
}
function view(){
 if(s.active)return heading('TRANSMITINDO AGORA','Sala <em>ao vivo.</em>','Acompanhe o apresentador e participe quando for convidado.')+
 '<section class="camera-live-shell live-discovery-screen">'+viewer()+'</section>';
 return heading('PESSOAS TRANSMITINDO','Descubra as <em>lives.</em>','Assista a transmissões reais de toda a comunidade ou encontre pessoas perto de você.')+
 '<section class="camera-live-shell live-discovery-screen">'+
 '<header class="live-discovery-intro"><div class="live-discovery-copy"><span class="live-discovery-kicker"><i aria-hidden="true"></i> TRANSMISSÕES EM TEMPO REAL</span><h2>Todo mundo tem uma história para contar.</h2><p>Entre para assistir, conheça quem está transmitindo ou abra sua própria live. Só quem transmite precisa ativar a câmera.</p></div><div class="live-discovery-stat"><strong>'+s.rows.length+'</strong><span>live'+(s.rows.length===1?'':'s')+' ativa'+(s.rows.length===1?'':'s')+'</span></div></header>'+
 '<div class="live-discovery-board"><div class="camera-live-list-head"><div><span class="live-discovery-section-eyebrow">EXPLORAR</span><h3>Lives acontecendo <small id="liveDiscoverCount">'+filtered().length+'</small></h3></div><div class="camera-live-head-actions"><button type="button" data-live-action="refresh">'+ico('refresh',17)+' Atualizar</button><button type="button" data-live-action="create" aria-expanded="'+String(s.showCreate)+'" aria-controls="cameraLiveComposer">'+ico('camera',17)+' '+(s.showCreate?'Fechar':'Iniciar live')+'</button></div></div>'+
 filterMarkup()+'<div id="liveDiscoverResults">'+discoveryResults()+'</div></div>'+
 '<div class="camera-live-hero live-create-composer" id="cameraLiveComposer" '+(s.showCreate?'':'hidden')+'><div><span>✳ SUA VEZ DE TRANSMITIR</span><h3>Comece uma conversa <em>ao vivo.</em></h3><p>Defina um título e autorize o acesso à câmera somente quando a transmissão começar.</p></div><form id="cameraLiveStartForm"><label for="cameraLiveTitle">Título da live</label><input id="cameraLiveTitle" name="title" minlength="3" maxlength="90" required placeholder="Sobre o que vamos conversar?" value="'+esc(s.title)+'"><button type="submit">'+ico('camera',19)+' Começar transmissão</button></form></div>'+
 '</section>';
}

async function refresh(paint=true){
 if(s.loading||!state.session)return;
 s.loading=true;
 try{
  const {data,error}=await db.rpc('entre_lives_list');if(error)throw error;
  s.rows=Array.isArray(data)?data:[];s.error='';
  if(s.active){
   const found=s.rows.find(x=>x.id===s.active.id);
   if(!found){await leave(false);toast('A transmissão foi encerrada.');}
   else{
    const oldRole=s.localRole;
    const updated=found.guest_requested_by!==s.active.guest_requested_by||found.guest_id!==s.active.guest_id||found.requested!==s.active.requested;
    s.active={...s.active,...found};
    if(oldRole==='viewer'&&found.is_guest){await join(found.id);}
    else if(updated&&state.view==='lives'){renderView();attachAll();}
   }
  }
  if(paint&&state.view==='lives'){renderView();if(s.active)attachAll();}
 }catch(e){console.warn('Lives indisponíveis',e);s.error=infoError(e);if(paint&&state.view==='lives'&&!s.active)renderView();}
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
 if(type==='create'){s.showCreate=!s.showCreate;if(state.view==='lives'){renderView();if(s.showCreate)document.getElementById('cameraLiveTitle')?.focus();}return;}
 if(type==='resetFilters'){s.region='global';s.state='';s.city='';s.search='';if(state.view==='lives')renderView();return;}
 if(type==='join'){try{await join(button.dataset.id);}catch(e){}return;}
 if(type==='leave'){if(s.localRole==='host'&&!confirm('Sair agora encerrará sua transmissão. Encerrar a live?'))return;await leave();await refresh();return;}
 if(type==='end'){if(confirm('Encerrar sua live agora?')){await leave();await refresh();}return;}
 if(type==='request'){
  const {error}=await db.rpc('entre_live_request_guest',{_live:s.active?.id});if(error)throw error;toast('Pedido enviado. Aguarde o apresentador.');await refresh();return;
 }
 if(type==='approve'||type==='reject'){
  const {error}=await db.rpc('entre_live_review_guest',{_live:s.active?.id,_approve:type==='approve'});
  if(error)throw error;toast(type==='approve'?'Convidado aceito.':'Pedido recusado.');await refresh();return;
 }
 if((type==='mic'||type==='camera')&&s.room&&(s.localRole==='host'||s.localRole==='guest')){
  if(type==='mic'){const next=!s.mic;await s.room.localParticipant.setMicrophoneEnabled(next);s.mic=next;}
  else{const next=!s.camera;await s.room.localParticipant.setCameraEnabled(next);s.camera=next;}
  if(state.view==='lives'){renderView();attachAll();}
 }
}
document.addEventListener('change',event=>{
 const el=event.target.closest?.('[data-live-filter]');if(!el)return;
 const k=el.dataset.liveFilter;
 if(k==='region'){s.region=['global','state','city'].includes(el.value)?el.value:'global';s.city='';}
 else if(k==='state'){s.state=UFS.includes(el.value)?el.value:'';s.city='';}
 else if(k==='city')s.city=el.value.trim();
 else if(k==='search')s.search=el.value.trim();
 if(state.view==='lives')renderView();
});
document.addEventListener('input',event=>{
 const el=event.target;
 if(!el?.dataset?.liveFilter)return;
 if(el.dataset.liveFilter==='city')s.city=el.value.trim();
 else if(el.dataset.liveFilter==='search')s.search=el.value.trim();
 else return;
 updateDiscovery(); 
});
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