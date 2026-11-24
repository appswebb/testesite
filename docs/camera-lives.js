/* entre. Lives · LiveKit host + one approved guest + spectators. */
(function(){
'use strict';
const s={rows:[],loading:false,active:null,room:null,localRole:null,joining:false,camera:true,mic:true,timer:null,remoteTracks:new Map(),title:'',error:'',region:'global',state:'',city:'',showCreate:false,showRegion:false,search:'',category:'all',images:new Map(),avatars:new Map(),preview:null};
const UFS='AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const CATEGORIES=[['all','Todas'],['conversa','Conversa'],['musica','Música'],['games','Games'],['criatividade','Criatividade'],['outros','Outros']];
const categoryLabel=value=>CATEGORIES.find(item=>item[0]===value)?.[1]||'Conversa';
const categoryChips=()=>'<div class="live-explore-categories" role="group" aria-label="Filtrar lives por assunto">'+
 CATEGORIES.map(([key,label])=>'<button type="button" data-live-action="category" data-category="'+key+'" class="'+(s.category===key?'active':'')+'" aria-pressed="'+String(s.category===key)+'">'+esc(label)+'</button>').join('')+'</div>';
const filtered=()=>s.rows.filter(l=>{
 const locationOk=s.region==='global'||(s.state&&l.state_code===s.state&&(s.region==='state'||(s.city&&normalize(l.city_name)===normalize(s.city))));
 const query=normalize(s.search),categoryOk=s.category==='all'||(l.category||'conversa')===s.category;
 return locationOk&&categoryOk&&(!query||normalize(l.title+' '+l.host_name+' '+(l.guest_name||'')).includes(query));
});
const filterMarkup=()=>'<div class="camera-live-filters live-region-panel" id="liveRegionFilters" '+(s.showRegion?'':'hidden')+'>'+
 '<label>Localização<select data-live-filter="region"><option value="global" '+(s.region==='global'?'selected':'')+'>Brasil inteiro</option><option value="state" '+(s.region==='state'?'selected':'')+'>Estado</option><option value="city" '+(s.region==='city'?'selected':'')+'>Cidade</option></select></label>'+
 (s.region!=='global'?'<label>Estado<select data-live-filter="state"><option value="">Selecionar estado</option>'+UFS.map(uf=>'<option value="'+uf+'" '+(s.state===uf?'selected':'')+'>'+uf+'</option>').join('')+'</select></label>':'')+
 (s.region==='city'?'<label>Cidade<input data-live-filter="city" maxlength="100" placeholder="Nome da cidade" value="'+esc(s.city)+'" autocomplete="off"></label>':'')+
 '<button type="button" class="live-region-reset" data-live-action="resetFilters">Limpar</button></div>';
function fresh(map,path){const item=map.get(path);return item&&item.until>Date.now()?item.url:'';}
async function hydrateImages(rows){
 const batches=[['entre-live-covers','cover_path',s.images],['entre-avatars','host_avatar_path',s.avatars]];
 await Promise.all(batches.map(async([bucket,field,cache])=>{
  const paths=[...new Set(rows.map(row=>row[field]).filter(Boolean))].filter(path=>!fresh(cache,path));
  if(!paths.length)return;
  try{
   const {data,error}=await db.storage.from(bucket).createSignedUrls(paths,300);
   if(error)throw error;
   (data||[]).forEach((item,index)=>{
    if(item?.signedUrl)cache.set(paths[index],{url:item.signedUrl,until:Date.now()+260000});
   });
  }catch(error){console.warn('Miniaturas privadas indisponíveis:',error);}
 }));
}
function locationLabel(l){
 return [l.city_name,l.state_code].filter(Boolean).join(' · ');
}
function clearPreview(){
 if(s.preview){URL.revokeObjectURL(s.preview);s.preview=null;}
}
function coverPreview(file){
 clearPreview();
 const target=document.getElementById('liveCoverPreview');
 if(!target)return;
 if(!file){target.hidden=true;target.replaceChildren();return;}
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('Capa: JPG, PNG ou WebP de até 12 MB.');
 s.preview=URL.createObjectURL(file);
 const image=document.createElement('img');
 image.src=s.preview;image.alt='Prévia da capa';
 target.replaceChildren(image);target.hidden=false;
}
async function prepareCover(file){
 if(!file)return null;
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12*1024*1024)throw Error('Escolha uma capa JPG, PNG ou WebP de até 12 MB.');
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Não foi possível ler a imagem.'));image.src=url;});
  if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>36000000)throw Error('A imagem é grande demais.');
  const scale=Math.min(1,1400/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
  canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Não foi possível preparar a capa.');
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.84));
  if(!blob||blob.size>3145728)throw Error('A capa ultrapassou 3 MB. Escolha outra imagem.');
  return blob;
 }finally{URL.revokeObjectURL(url);}
}

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
 const cover=fresh(s.images,l.cover_path),avatar=fresh(s.avatars,l.host_avatar_path);
 const hostInitial=esc(String(l.host_name||'P').slice(0,1).toUpperCase());
 const image=cover||avatar;
 const region=locationLabel(l);
 return '<article class="camera-live-card live-visual-card">'+
 '<button type="button" class="live-visual-open" data-live-action="join" data-id="'+esc(l.id)+'" aria-label="'+esc((host?'Voltar para':'Assistir à')+' live: '+l.title)+'">'+
 '<div class="camera-live-cover live-visual-cover">'+
 (image?'<img class="live-visual-picture" src="'+esc(image)+'" alt="" loading="lazy" decoding="async">':
 '<div class="live-visual-placeholder" aria-hidden="true"><span>'+hostInitial+'</span>'+ico('camera',32)+'</div>')+
 '<span class="live-visual-badge"><i aria-hidden="true"></i> AO VIVO</span>'+
 '<span class="live-visual-category">'+esc(categoryLabel(l.category))+'</span>'+
 '<div class="live-visual-gradient" aria-hidden="true"></div>'+
 '</div><div class="live-visual-details"><strong>'+esc(l.title)+'</strong>'+
 '<span class="live-visual-byline">'+
 (avatar?'<img'+profileTarget(l.host_id,l.host_username)+' src="'+esc(avatar)+'" alt="" loading="lazy">':'<b'+profileTarget(l.host_id,l.host_username)+'>'+hostInitial+'</b>')+
 '<span>'+profileName(l.host_id,l.host_name,l.host_username)+(l.guest_name?' + '+profileName(l.guest_id,l.guest_name,l.guest_username):'')+'</span></span>'+
 (region?'<small>'+ico('compass',13)+' '+esc(region)+'</small>':'')+
 '<span class="live-visual-watch">'+(host?'Minha live':guest?'Entrar como convidado':'Assistir')+' '+ico('arrow',15)+'</span>'+
 '</div></button></article>';
}
const interaction={comments:[],hearts:0,comments_enabled:true,draft:'',timer:null,busy:false,ready:false,error:false};
const liveNumber=n=>Number(n||0).toLocaleString('pt-BR');
function liveComment(c){
 return '<div class="connect-live-comment" data-live-comment-id="'+esc(c.id)+'"><span><b>'+esc(c.name)+'</b> '+esc(c.body)+'</span>'+(c.can_delete?'<button type="button" data-live-action="comment-delete" data-id="'+esc(c.id)+'" aria-label="Excluir comentário">×</button>':'')+'</div>';
}
function liveMessages(){
 return interaction.comments.length?interaction.comments.map(liveComment).join(''):'<p class="connect-live-hint">'+(interaction.error?'Interações temporariamente indisponíveis.':interaction.ready?'Seja a primeira pessoa a comentar.':'Carregando comentários…')+'</p>';
}
function liveMeta(){
 return '<div class="connect-live-meta"><span id="connectLivePeople">'+liveNumber(s.room?1+s.room.remoteParticipants.size:0)+' conectados</span><span id="connectLiveHearts">♥ '+liveNumber(interaction.hearts)+'</span><span id="connectLiveClock"></span></div>';
}
function liveSocial(tools){
 return '<section class="connect-live-social" aria-label="Interações da live"><div id="connectLiveMessages" class="connect-live-messages" role="log" aria-live="polite" aria-label="Comentários"><div class="connect-live-message-stack">'+liveMessages()+'</div></div>'+tools+'<form id="connectLiveCommentForm"><input aria-label="Comentar na live" name="comment" maxlength="250" autocomplete="off" placeholder="'+(interaction.comments_enabled?'Comentar…':'Comentários desativados')+'" value="'+esc(interaction.draft)+'" '+(!interaction.comments_enabled?'disabled':'')+'><button type="submit" aria-label="Enviar comentário" title="Enviar" '+(!interaction.comments_enabled?'disabled':'')+'>'+ico('send',19)+'</button><button type="button" class="connect-live-heart" data-live-action="heart" aria-label="Curtir live" title="Curtir">'+ico('heart',21)+'</button></form></section>';
}
let lastMessageList=null;
function paintInteractions(){
 const list=document.getElementById('connectLiveMessages');
 if(list){
  const stack=list.querySelector('.connect-live-message-stack');
  if(stack){
   const first=list!==lastMessageList;
   const nearBottom=first||list.scrollHeight-list.scrollTop-list.clientHeight<48;
   lastMessageList=list;
   if(!interaction.comments.length){const markup=liveMessages();if(stack.innerHTML!==markup)stack.innerHTML=markup;}
   else{
    stack.querySelector('.connect-live-hint')?.remove();
    const ids=new Set(interaction.comments.map(c=>String(c.id)));
    const existing=new Map(Array.from(stack.children).map(el=>[el.dataset.liveCommentId,el]));
    for(const [id,node] of existing)if(!ids.has(id))node.remove();
    for(const c of interaction.comments){
     if(existing.has(String(c.id)))continue;
     const t=document.createElement('template');t.innerHTML=liveComment(c);
     const node=t.content.firstElementChild;
     if(!first)node.classList.add('connect-live-comment-new');
     stack.appendChild(node);
    }
   }
   if(nearBottom)list.scrollTop=list.scrollHeight;
  }
 }
 const hearts=document.getElementById('connectLiveHearts');if(hearts)hearts.textContent='♥ '+liveNumber(interaction.hearts);
 const people=document.getElementById('connectLivePeople');if(people)people.textContent=liveNumber(s.room?1+s.room.remoteParticipants.size:0)+' conectados';
 const clock=document.getElementById('connectLiveClock');if(clock&&s.active?.started_at){const sec=Math.max(0,Math.floor((Date.now()-Date.parse(s.active.started_at))/1000));if(Number.isFinite(sec))clock.textContent=Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0');}
 const form=document.getElementById('connectLiveCommentForm');if(form){const input=form.elements.namedItem('comment');input.disabled=!interaction.comments_enabled;input.placeholder=interaction.comments_enabled?'Comentar…':'Comentários desativados';form.querySelector('[type=submit]').disabled=!interaction.comments_enabled;}
 const moderate=document.querySelector('[data-live-action="comments-toggle"]');if(moderate){const label=interaction.comments_enabled?'Pausar comentários':'Liberar comentários';moderate.setAttribute('aria-label',label);moderate.title=label;moderate.setAttribute('aria-pressed',String(!interaction.comments_enabled));}
}
async function interact(type='read',body=null,id=null){
 const live=s.active?.id;if(!live||interaction.busy)return false;
 interaction.busy=true;
 try{const {data,error}=await db.rpc('connect_live_interact',{_live:live,_action:type,_body:body,_comment:id});if(error)throw error;if(s.active?.id!==live)return false;interaction.comments=Array.isArray(data?.comments)?data.comments:[];interaction.hearts=data?.hearts||0;interaction.comments_enabled=data?.comments_enabled!==false;interaction.ready=true;interaction.error=false;paintInteractions();return true;}
 catch(error){if(s.active?.id===live){interaction.error=true;paintInteractions();if(type!=='read')toast(infoError(error),true);}return false;}
 finally{interaction.busy=false;}
}
function stopInteractions(){clearInterval(interaction.timer);interaction.timer=null;interaction.comments=[];interaction.hearts=0;interaction.comments_enabled=true;interaction.draft='';interaction.ready=false;interaction.error=false;lastMessageList=null;}
function startInteractions(){clearInterval(interaction.timer);void interact();interaction.timer=setInterval(()=>{if(s.active&&!document.hidden){paintInteractions();void interact();}},3000);}
function viewer(){
 if(!s.active)return '';
 const l=s.active,role=s.localRole||'viewer',publisher=role==='host'||role==='guest';
 const source=s.rows.find(x=>x.id===l.id)||l;
 const control=(action,icon,label,extra='')=>'<button type="button" data-live-action="'+action+'" aria-label="'+esc(label)+'" title="'+esc(label)+'" '+extra+'>'+ico(icon,18)+'</button>';
 const tools='<div class="camera-live-tools" aria-label="Controles da transmissão">'+
 (role==='host'&&source.guest_requested_by&&!source.guest_id?'<div class="camera-live-invite"><strong>Pedido de participação</strong><button type="button" data-live-action="approve">Aceitar</button><button type="button" data-live-action="reject">Recusar</button></div>':'')+
 (publisher?control('mic','mic',s.mic?'Desligar microfone':'Ligar microfone','class="'+(s.mic?'':'muted')+'" aria-pressed="'+String(!s.mic)+'"')+control('camera','camera',s.camera?'Desligar câmera':'Ligar câmera','class="'+(s.camera?'':'muted')+'" aria-pressed="'+String(!s.camera)+'"'):'')+
 (role==='viewer'&&!source.guest_id?control('request','users',source.requested?'Pedido enviado':'Pedir para participar',source.requested?'disabled':''):'')+
 (role==='host'?control('comments-toggle','chat',interaction.comments_enabled?'Pausar comentários':'Liberar comentários','aria-pressed="'+String(!interaction.comments_enabled)+'"'):'')+
 (role==='viewer'&&s.rows.some(x=>x.id!==l.id)?control('next','arrow','Próxima live'):'')+
 '</div>';
 return '<section class="camera-live-stage connect-live-overlay" aria-label="Transmissão ao vivo">'+
 '<div class="camera-live-grid" id="cameraLiveVideos"><div class="camera-live-wait"><p>'+(s.joining?'Conectando ao vídeo…':'Aguardando a câmera do apresentador…')+'</p></div></div>'+
 '<header class="camera-live-stage-head"><div class="connect-live-heading"><span class="camera-live-pill">● AO VIVO</span><h3>'+esc(source.title||'Live')+'</h3><p>'+profileName(source.host_id,source.host_name,source.host_username)+(source.guest_name?' · '+profileName(source.guest_id,source.guest_name,source.guest_username):'')+'</p>'+liveMeta()+'</div><button type="button" data-live-action="'+(role==='host'?'end':'leave')+'" class="camera-live-back" aria-label="'+(role==='host'?'Encerrar live':'Sair da live')+'" title="'+(role==='host'?'Encerrar live':'Sair da live')+'">'+ico('close',20)+'</button></header>'+
 liveSocial(tools)+'</section>';
}
function discoveryResults(){
 const rows=filtered();
 if(rows.length)return '<div class="camera-live-list live-visual-grid">'+rows.map(card).join('')+'</div>';
 return '<div class="camera-live-empty live-visual-empty" role="status">'+ico('camera',28)+
 '<strong>'+(s.loading?'Buscando transmissões…':s.error?'Não foi possível carregar as lives':s.rows.length?'Nenhuma live nesse filtro':'Ninguém transmitindo agora')+'</strong>'+
 '<p>'+(s.error?'Confira a conexão e tente novamente.':s.rows.length?'Experimente outra categoria ou região.':'Seja a primeira pessoa a transmitir.')+'</p>'+
 (s.error?'<button type="button" data-live-action="refresh">Tentar novamente</button>':(s.region!=='global'||s.search||s.category!=='all')?'<button type="button" data-live-action="resetFilters">Ver todas</button>':'' )+
 '</div>';
}
function updateDiscovery(){
 const result=document.getElementById('liveDiscoverResults');
 if(result)result.innerHTML=discoveryResults();
 const count=document.getElementById('liveDiscoverCount');
 if(count)count.textContent=String(filtered().length);
 const total=document.getElementById('liveTotalCount');
 if(total)total.textContent=String(s.rows.length);
}
function view(){
 if(s.active)return '<section class="camera-live-shell live-discovery-screen live-active-screen">'+viewer()+'</section>';
 return '<section class="camera-live-shell live-explore-screen" aria-label="Explorar transmissões ao vivo">'+
 '<header class="live-explore-header"><div class="live-explore-heading"><h2>Ao vivo agora</h2>'+
 '<span class="live-explore-count"><i aria-hidden="true"></i><span id="liveTotalCount">'+s.rows.length+'</span> ao vivo</span></div>'+
 '<div class="live-explore-actions"><button type="button" class="live-explore-refresh" data-live-action="refresh" aria-label="Atualizar lives" title="Atualizar">'+ico('refresh',17)+'</button>'+ 
 '<button type="button" class="live-explore-start" data-live-action="create" aria-expanded="'+String(s.showCreate)+'" aria-controls="cameraLiveComposer">'+ico(s.showCreate?'close':'camera',17)+' '+(s.showCreate?'Fechar':'Iniciar live')+'</button></div></header>'+
 '<div class="live-explore-toolbar"><label class="live-explore-search">'+ico('search',19)+
 '<span class="sr-only">Buscar transmissões</span><input data-live-filter="search" type="search" maxlength="90" placeholder="Pesquisar lives ou pessoas" value="'+esc(s.search)+'" autocomplete="off"></label>'+
 '<button type="button" class="live-region-trigger" data-live-action="region" aria-controls="liveRegionFilters" aria-expanded="'+String(s.showRegion)+'">'+ico('compass',18)+' <span>Região</span></button></div>'+
 categoryChips()+filterMarkup()+
 '<div class="live-create-composer camera-live-hero live-visual-composer" id="cameraLiveComposer" '+(s.showCreate?'':'hidden')+'>'+
 '<form id="cameraLiveStartForm" enctype="multipart/form-data">'+
 '<div class="live-compose-head"><strong>Nova transmissão</strong><small>Capa opcional · câmera ativada ao começar</small></div>'+
 '<label for="cameraLiveTitle">Título</label><input id="cameraLiveTitle" name="title" minlength="3" maxlength="90" required placeholder="O que vai rolar na sua live?" value="'+esc(s.title)+'">'+
 '<div class="live-compose-fields"><label>Categoria<select name="category">'+CATEGORIES.filter(c=>c[0]!=='all').map(([key,label])=>'<option value="'+key+'">'+esc(label)+'</option>').join('')+'</select></label>'+
 '<label>Capa (opcional)<input name="cover" id="cameraLiveCover" type="file" accept="image/jpeg,image/png,image/webp"></label></div>'+
 '<div id="liveCoverPreview" class="live-cover-preview" hidden></div>'+
 '<button type="submit">'+ico('check',18)+' Transmitir</button></form></div>'+
 '<div class="live-explore-results-heading"><strong>Transmitindo agora</strong><span id="liveDiscoverCount">'+filtered().length+'</span></div>'+
 '<div id="liveDiscoverResults">'+discoveryResults()+'</div></section>';
}

async function refresh(paint=true){
 if(s.loading||!state.session)return;
 s.loading=true;
 try{
  const {data,error}=await db.rpc('entre_lives_list');if(error)throw error;
  s.rows=Array.isArray(data)?data:[];s.error='';
  await hydrateImages(s.rows);
  if(s.active){
   const found=s.rows.find(x=>x.id===s.active.id);
   if(!found){await leave(false);toast('A transmissão foi encerrada.',false,'end');}
   else{
    const oldRole=s.localRole;
    const updated=found.guest_requested_by!==s.active.guest_requested_by||found.guest_id!==s.active.guest_id||found.requested!==s.active.requested;
    s.active={...s.active,...found};
    if(oldRole==='viewer'&&found.is_guest){await join(found.id);}
    else if(updated&&state.view==='lives'){renderView();attachAll();}
   }
  }
  if(paint&&state.view==='lives'){
   // Preserve the user's typing and keyboard while the live directory polls.
   if(!s.active&&(document.activeElement?.closest?.('.live-explore-toolbar')||document.activeElement?.closest?.('.camera-live-filters')||document.activeElement?.closest?.('.live-create-composer'))){
    updateDiscovery();
    const total=document.getElementById('liveTotalCount');if(total)total.textContent=String(s.rows.length);
   }else{renderView();if(s.active)attachAll();}
  }
 }catch(e){console.warn('Lives indisponíveis',e);s.error=infoError(e);if(paint&&state.view==='lives'&&!s.active)renderView();}
 finally{s.loading=false;}
}
function attach(participant,track,unique){
 const root=document.getElementById('cameraLiveVideos');if(!root||!track)return;
 const id=participant.identity;
 let frame=root.querySelector('[data-live-track="'+id+'"]');
 if(!frame){
  frame=document.createElement('div');frame.className='camera-live-video';frame.dataset.liveTrack=id;
  frame.innerHTML='<span class="camera-live-video-name"></span>';
  root.querySelector('.camera-live-wait')?.remove();
  root.appendChild(frame);
 }
 frame.querySelector('.camera-live-video-name').textContent=participant.identity===s.active?.host_id?(s.active.host_name||'Anfitrião'):participant.identity===s.active?.guest_id?(s.active.guest_name||'Convidado'):(participant.name||'Pessoa');
 const tag=track.kind==='video'?'video':'audio';
 const existing=frame.querySelector(tag);
 // Polling or re-rendering must not attach a second audio element to the same
 // track; duplicated audio causes echo and steadily increases resource use.
 if(existing&&existing.srcObject?.getTracks?.().some(t=>t.id===track.mediaStreamTrack?.id))return;
 if(existing){try{track.detach(existing);}catch(e){}existing.remove();}
 const el=track.attach();
 el.autoplay=true;el.playsInline=true;
 el.muted=participant===s.room?.localParticipant;
 frame.appendChild(el);
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
   const frame=document.querySelector('[data-live-track="'+participant.identity+'"]');if(frame&&!frame.querySelector('video,audio'))frame.remove();
  });
  room.on(lk.RoomEvent.ParticipantDisconnected,participant=>{
   document.querySelectorAll('[data-live-track="'+participant.identity+'"]').forEach(el=>el.remove());paintInteractions();
  });
  room.on(lk.RoomEvent.ParticipantConnected,paintInteractions);
  room.on(lk.RoomEvent.Disconnected,()=>{if(s.room===room){void leave(false);toast('Conexão da live encerrada.',false,'end');}});
  await room.connect(data.url,data.token,{autoSubscribe:true});
  if(data.role==='host'||data.role==='guest')await room.localParticipant.enableCameraAndMicrophone();window.connectSound?.play?.('live');
  if(state.view==='lives'){renderView();attachAll();}startInteractions();
 }catch(e){
  const msg=e?.message||'Falha ao conectar à live.';
  await disconnect();s.active=null;s.localRole=null;
  if(state.view==='lives')renderView();toast(msg,true);
  throw e;
 }finally{s.joining=false;}
}
async function disconnect(){
 stopInteractions();const r=s.room;s.room=null;
 if(r){try{r.removeAllListeners();await r.disconnect();}catch(e){}}
}
async function leave(remote=true){
 const id=s.active?.id,role=s.localRole;
 await disconnect();s.active=null;s.localRole=null;
 if(remote&&id&&(role==='host'||role==='guest')){
  const {error}=await db.rpc('entre_live_exit',{_live:id});if(error)toast(infoError(error),true);else window.connectSound?.play?.('end');
 }else if(remote&&id){window.connectSound?.play?.('end');}
 if(state.view==='lives')renderView();
}
async function start(form){
 const title=String(form.elements.namedItem('title')?.value||'').trim();
 const category=String(form.elements.namedItem('category')?.value||'conversa');
 if(s.joining)return;
 const btn=form.querySelector('[type=submit]');if(btn)btn.disabled=true;
 const uid=state.session?.user?.id;
 let path=null,startedId=null;
 try{
  if(!uid)throw Error('Entre na sua conta para transmitir.');
  const file=form.elements.namedItem('cover')?.files?.[0],blob=await prepareCover(file);
  if(blob){
   path=uid+'/'+crypto.randomUUID()+'.webp';
   const {error:uploadError}=await db.storage.from('entre-live-covers').upload(path,blob,{contentType:'image/webp',upsert:false,cacheControl:'300'});
   if(uploadError)throw uploadError;
  }
  const {data,error}=await db.rpc('entre_live_start_visual',{_title:title,_category:category,_cover_path:path});
  if(error)throw error;startedId=data;
  s.title=title;clearPreview();await refresh(false);
  try{await join(data);}catch(error){
   await db.rpc('entre_live_exit',{_live:data}).catch(()=>{});
   throw error;
  }
 }catch(error){
  if(path&&(startedId===null||!s.active))await db.storage.from('entre-live-covers').remove([path]).catch(()=>{});
  toast(infoError(error),true);
 }finally{if(btn?.isConnected)btn.disabled=false;}
}
async function action(type,button){
 if(type==='heart'){await interact('heart');return;}
 if(type==='comment-delete'){if(confirm('Excluir este comentário?'))await interact('delete',null,button.dataset.id);return;}
 if(type==='comments-toggle'){await interact(interaction.comments_enabled?'close':'open');return;}
 if(type==='next'&&s.localRole==='viewer'){const i=s.rows.findIndex(x=>x.id===s.active?.id);const next=s.rows[(i+1)%s.rows.length];if(next&&next.id!==s.active?.id)await join(next.id);return;}
 if(type==='refresh'){await refresh();return;}
 if(type==='create'){s.showCreate=!s.showCreate;if(!s.showCreate)clearPreview();if(state.view==='lives'){renderView();if(s.showCreate)document.getElementById('cameraLiveTitle')?.focus();}return;}
 if(type==='region'){s.showRegion=!s.showRegion;if(state.view==='lives')renderView();return;}
 if(type==='category'){s.category=CATEGORIES.some(x=>x[0]===button.dataset.category)?button.dataset.category:'all';if(state.view==='lives')renderView();return;}
 if(type==='resetFilters'){s.region='global';s.state='';s.city='';s.search='';s.category='all';s.showRegion=false;if(state.view==='lives')renderView();return;}
 if(type==='join'){try{await join(button.dataset.id);}catch(e){}return;}
 if(type==='leave'){if(s.localRole==='host'&&!confirm('Sair agora encerrará sua transmissão. Encerrar a live?'))return;await leave();await refresh();return;}
 if(type==='end'){if(confirm('Encerrar sua live agora?')){await leave();await refresh();}return;}
 if(type==='request'){
  const {error}=await db.rpc('entre_live_request_guest',{_live:s.active?.id});if(error)throw error;toast('Pedido enviado. Aguarde o apresentador.',false,'success');await refresh();return;
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
document.addEventListener('change',event=>{if(event.target?.id!=='cameraLiveCover')return;try{coverPreview(event.target.files?.[0]);}catch(error){clearPreview();event.target.value='';toast(infoError(error),true);}});
document.addEventListener('submit',event=>{if(event.target?.id!=='cameraLiveStartForm')return;event.preventDefault();void start(event.target);});
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-live-action]');if(!button)return;
 void action(button.dataset.liveAction,button).catch(e=>toast(infoError(e),true));
});
document.addEventListener('input',event=>{if(event.target?.closest?.('#connectLiveCommentForm'))interaction.draft=event.target.value;});
document.addEventListener('submit',async event=>{if(event.target?.id!=='connectLiveCommentForm')return;event.preventDefault();const input=event.target.elements.namedItem('comment'),value=input.value.trim();if(!value||interaction.busy)return;const live=s.active?.id;if(await interact('comment',value)&&live===s.active?.id){if(interaction.draft.trim()===value)interaction.draft='';if(input.isConnected&&input.value.trim()===value)input.value='';}});
function beginPolling(){
 if(s.timer)clearInterval(s.timer);
 s.timer=setInterval(()=>{if(state.view==='lives'&&!document.hidden)void refresh(!s.active);},8000);
}
async function enter(){await refresh();beginPolling();}
function stop(){if(s.timer)clearInterval(s.timer);s.timer=null;}
window.entreLives={view,enter,stop,leave,refresh,isActive:()=>Boolean(s.active)};
// Other app updates can replace the active view; reattach tracks only after a replacement.
let lastGrid=null;new MutationObserver(()=>{const grid=document.getElementById('cameraLiveVideos');if(grid&&grid!==lastGrid){lastGrid=grid;attachAll();paintInteractions();}else if(!grid){lastGrid=null;}}).observe(document.body,{childList:true,subtree:true});
})();