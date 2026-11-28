/* CONNECT · Independent public room channels, with account-scoped saved selections. */
(function(){
'use strict';
const UF=[['AC','Acre'],['AL','Alagoas'],['AP','Amapá'],['AM','Amazonas'],['BA','Bahia'],['CE','Ceará'],['DF','Distrito Federal'],['ES','Espírito Santo'],['GO','Goiás'],['MA','Maranhão'],['MT','Mato Grosso'],['MS','Mato Grosso do Sul'],['MG','Minas Gerais'],['PA','Pará'],['PB','Paraíba'],['PR','Paraná'],['PE','Pernambuco'],['PI','Piauí'],['RJ','Rio de Janeiro'],['RN','Rio Grande do Norte'],['RS','Rio Grande do Sul'],['RO','Rondônia'],['RR','Roraima'],['SC','Santa Catarina'],['SP','São Paulo'],['SE','Sergipe'],['TO','Tocantins']];
const s={room:'world',activeCity:'',state:'SP',city:'',cities:[],loading:false,busy:false,rows:[],older:false,loadingMore:false,after:0,expiresCooldown:0,refreshTimer:null,cityLoading:false,cityError:false,filterOpen:false,detecting:false,filterEpoch:0,loadError:false,loaded:false};
const clean=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80);
// Local, theme-aware regional symbols; cities never reuse a state flag.
const regionGraphic=(kind,size=20)=>{
 const paths=kind==='state'
  ?'<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15m6-12v3m0 7v5"/><path d="M18 11a3 3 0 0 0-6 0c0 2 3 5 3 5s3-3 3-5z"/><circle cx="15" cy="11" r=".65"/>'
  :'<path d="M3 21h18M4 21V11h5v10M9 21V4h7v17M16 21v-9h4v9M12 7h1m-1 4h1m-1 4h1m-7-1h1m11 1h1M12 21v-3h1v3"/>';
 return '<svg class="cr-region-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+paths+'</svg>';
};
const world=()=>window.connectWorld?.current?.()||{country:'',scope:'world'};
const national=code=>code==='BR'?'br':'n:'+code.toLowerCase();
const countryKey=()=>world().country?national(world().country):'world';
const kindFor=key=>key==='world'?'global':key==='br'||key.startsWith('n:')?'national':key.startsWith('s:')?'state':'city';
const regionAllowed=()=>world().scope!=='country'||world().country==='BR';
const permitted=key=>world().scope!=='country'||key===countryKey()||(world().country==='BR'&&/^[sc]:/.test(key));
const validState=uf=>UF.some(([code])=>code===uf);
const stateName=uf=>UF.find(([code])=>code===uf)?.[1]||'Selecionar estado';
let slots={},drafts=new Map(),picker=null,roomEpoch=0,cityRequest=0,focusKind='';
const storageKey=()=> 'connect.rooms.channels.v2.'+roomOwner;
function persist(){if(!roomOwner)return;try{localStorage.setItem(storageKey(),JSON.stringify({slots,active:s.room}));}catch(_){}}
function restoreSlots(){
 let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey())||'{}')||{};}catch(_){}
 const v=saved.slots||{};slots={global:{key:'world'}};
 if(typeof v.national?.country==='string'&&/^[A-Z]{2}$/.test(v.national.country)&&window.connectWorld.codeName(v.national.country)!=='País')slots.national={country:v.national.country,key:national(v.national.country)};
 if(validState(v.state?.uf))slots.state={uf:v.state.uf,key:'s:'+v.state.uf.toLowerCase()};
 if(validState(v.city?.uf)&&typeof v.city?.name==='string'&&v.city.name.length<=100&&clean(v.city.name).length>=2)slots.city={uf:v.city.uf,name:v.city.name,key:'c:'+v.city.uf.toLowerCase()+':'+clean(v.city.name)};
 if(world().scope==='country'&&world().country)slots.national={country:world().country,key:countryKey()};
 const active=Object.values(slots).find(x=>x.key===saved.active&&permitted(x.key));
 s.room=active?.key||(world().scope==='country'?countryKey():'world');s.activeCity=kindFor(s.room)==='city'?slots.city?.name||'':'';
}
function rememberDraft(){const input=document.getElementById('roomText');if(!input)return;if(input.value)drafts.set(s.room,input.value);else drafts.delete(s.room);}
function selectSlot(kind,entry){slots[kind]=entry;roomChange(entry.key);persist();}
function openSlot(kind){if(kind==='global'){roomChange('world');return;}const selected=slots[kind];if(selected&&selected.key!==s.room&&permitted(selected.key)){roomChange(selected.key);return;}openRoomFilter(kind);}

const title=key=>key==='world'?'Sala global':key==='br'?'Brasil':key.startsWith('n:')?window.connectWorld.codeName(key.slice(2).toUpperCase()):key.startsWith('s:')?UF.find(u=>u[0].toLowerCase()===key.slice(2))?.[1]||'Estado':s.activeCity||'Sala da cidade';
const formatDate=d=>new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const globe=(size=22)=>'<svg viewBox="0 0 24 24" width="'+size+'" height="'+size+'" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18M5 7.5h14M5 16.5h14"/></svg>';
const icon=key=>key==='world'?globe(24):key==='br'?'🇧🇷':key.startsWith('n:')?window.connectWorld.flag(key.slice(2).toUpperCase()):regionGraphic(kindFor(key),22);
function chatRows(){
 s.rows=s.rows.filter(r=>!r.deleted_at);
 if(s.loadError&&!s.rows.length)return '<div class="rooms-empty"><span class="cn-room-empty-icon">'+ico('info',26)+'</span><strong>Não foi possível carregar.</strong><p>Confira sua conexão e tente novamente.</p><button type="button" class="cr-empty-action" data-room-action="retry">'+ico('refresh',16)+' Tentar novamente</button></div>';if(!s.loaded&&!s.rows.length)return '<div class="rooms-empty" role="status"><span class="cr-loading-ring"></span><strong>Carregando mensagens…</strong></div>';
 if(!s.rows.length)return '<div class="rooms-empty"><span class="cn-room-empty-icon cr-empty-art"><span class="cr-empty-orbit">'+ico('chat',30)+'</span><span class="cr-empty-spark">'+ico('spark',15)+'</span></span><strong>Comece com um oi.</strong><p>Uma conversa pode conectar pessoas de qualquer lugar.</p><button type="button" class="cr-empty-action" data-room-action="say-hi">'+ico('chat',16)+' Dizer oi</button></div>';
 return (s.older?'<button class="rooms-load-more" type="button" data-room-action="more">Mensagens anteriores</button>':'')+
 s.rows.map(r=>'<article class="room-message '+(r.sender===state.session?.user?.id?'is-mine':'')+'"><span class="room-message-avatar"'+profileTarget(r.sender,r.username)+'>'+esc(String(r.display_name||'?').slice(0,1).toUpperCase())+'</span><div class="room-message-content"><header><strong>'+profileName(r.sender,r.display_name,r.username)+'</strong><span>'+profileName(r.sender,'@'+(r.username||'pessoa'),r.username)+'</span><time>'+formatDate(r.created_at)+'</time></header><p class="'+(r.deleted_at?'cp-room-deleted':'')+'">'+esc(r.body)+'</p>'+(r.sender!==state.session?.user?.id&&r.body?window.connectTranslate?.markup?.(r.body)||'':'')+(r.edited_at&&!r.deleted_at?'<small class="cp-room-edited">Editada</small>':'')+(r.sender===state.session?.user?.id&&!r.deleted_at?'<button type="button" class="cp-message-menu cp-room-message-menu" data-room-message-menu="'+Number(r.id)+'" aria-label="Opções da mensagem">'+ico('more',16)+'</button>':'')+'</div></article>').join('');
}
function paint(scrollToEnd=false){
 const el=document.getElementById('roomMessages');if(!el)return;
 const keepBottom=scrollToEnd||el.scrollHeight-el.scrollTop-el.clientHeight<140;
 const oldTop=el.scrollTop,oldHeight=el.scrollHeight;
 const markup=chatRows();if(el.dataset.roomMarkup!==markup){el.innerHTML=markup;el.dataset.roomMarkup=markup;}
 if(keepBottom)el.scrollTop=el.scrollHeight;
 else el.scrollTop=oldTop+(el.scrollHeight-oldHeight);
 updateComposer();
}
let roomOwner=null;
function updateComposer(){const input=document.getElementById('roomText'),btn=document.querySelector('#roomChatForm [type=submit]'),cool=document.getElementById('roomCooldown'),chars=document.getElementById('crRoomChars');const wait=Math.max(0,Math.ceil((s.expiresCooldown-Date.now())/1000));if(btn)btn.disabled=s.busy||wait>0||!input?.value.trim();if(cool)cool.textContent=wait?'Próximo envio em '+wait+'s':'Envio a cada 5s';if(chars)chars.textContent=(input?.value.length||0)+'/400';}
function resetAccount(){const uid=state.session?.user?.id||null;if(roomOwner===uid)return;closeRoomFilter(false);roomOwner=uid;roomEpoch++;roomRefreshQueued=false;drafts=new Map();s.rows=[];s.older=false;s.loaded=false;s.loadError=false;s.expiresCooldown=0;s.activeCity='';s.city='';s.state='';s.cities=[];restoreSlots();if(s.refreshTimer)clearInterval(s.refreshTimer);s.refreshTimer=null;}

function view(){
 resetAccount();const current=title(s.room),label=icon(s.room),active=kindFor(s.room);
 return '<section class="room-shell rooms-static-shell cr-rooms" aria-label="Salas públicas">'+
 '<section class="cr-chat" aria-label="Conversa atual"><header class="cr-chat-head"><div class="cr-room-symbol">'+label+'</div><div class="cr-chat-name"><strong>'+esc(current)+'</strong><small><span class="cr-channel-dot" aria-hidden="true"></span>'+({global:'Comunidade internacional',national:'Comunidade nacional',state:'Comunidade estadual',city:'Comunidade municipal'})[active]+'</small></div>'+'<button type="button" class="cr-change-room cr-edit-channel" data-room-action="filter" aria-label="Filtrar salas" aria-haspopup="dialog">'+ico('sliders',16)+' <span>Filtro</span></button></header>'+
 '<div class="cr-retention">'+ico('clock',14)+'<span>Mensagens desaparecem em 24h</span></div>'+
 '<div class="rooms-discussion" id="roomMessages" aria-live="polite" aria-label="Mensagens da sala">'+chatRows()+'</div>'+
 '<div class="cr-compose"><form id="roomChatForm" class="room-composer"><label class="sr-only" for="roomText">Sua mensagem na sala</label>'+
 '<input autocomplete="off" id="roomText" maxlength="400" placeholder="Escreva aqui…" value="'+esc(drafts.get(s.room)||'')+'" required>'+
 '<button type="submit" title="Enviar mensagem" aria-label="Enviar mensagem" '+(s.busy||s.expiresCooldown>Date.now()||!drafts.get(s.room)?.trim()?'disabled':'')+'>'+ico('send',19)+'</button></form>'+
 '<div class="cr-compose-meta"><p class="rooms-cooldown" id="roomCooldown">'+(s.expiresCooldown>Date.now()?'Próximo envio em '+Math.ceil((s.expiresCooldown-Date.now())/1000)+'s':'Envio a cada 5s')+'</p><span id="crRoomChars">'+(drafts.get(s.room)?.length||0)+'/400</span></div></div></section></section>';
}
let cityCatalog=null,cityCatalogRequest=null;
const cityKey=c=>c.uf+':'+clean(c.name);
function filterCities(){
 if(picker?.kind!=='city')return;
 const select=document.getElementById('roomsCitySelect'),button=document.querySelector('#roomsFilterOverlay [data-room-action="confirm-city"]'),status=document.getElementById('roomsCityStatus');if(!select)return;
 const selected=picker.cities.find(c=>c.uf===picker.uf&&c.name===picker.city);
 const query=clean(picker.query||'');
 const matches=query?picker.cities.filter(c=>clean(c.name).includes(query)||clean(c.name+' '+c.uf).includes(query)):picker.cities;
 const shown=matches.slice(0,100);if(selected&&!shown.some(c=>cityKey(c)===cityKey(selected)))shown.unshift(selected);
 select.disabled=picker.loading||!shown.length;
 select.innerHTML='<option value="">'+(picker.loading?'Carregando cidades…':picker.error?'Cidades indisponíveis':'Selecione a cidade')+'</option>'+shown.map(c=>'<option value="'+esc(cityKey(c))+'" '+(selected&&cityKey(c)===cityKey(selected)?'selected':'')+'>'+esc(c.name+' · '+c.uf)+'</option>').join('');
 if(button)button.disabled=picker.loading||!selected;
 if(status)status.textContent=picker.error?'Não foi possível carregar as cidades. Tente novamente.':picker.loading?'':!matches.length?'Nenhuma cidade encontrada.':matches.length>100?'Digite o nome da cidade para encontrar mais resultados.':'';
 const retry=document.querySelector('[data-room-action="retry-cities"]');if(retry)retry.hidden=!picker.error;
}
function closeRoomFilter(focus=true){
 document.getElementById('roomsFilterOverlay')?.remove();
 document.body?.classList.remove('rooms-filter-open');
 s.filterOpen=false;s.filterEpoch++;cityRequest++;picker=null;
 if(focus&&state.view==='rooms')document.querySelector('[data-room-action="filter"]')?.focus({preventScroll:true});
}
const ufOptions=value=>'<option value="">Selecione o estado</option>'+UF.map(([uf,name])=>'<option value="'+uf+'" '+(uf===value?'selected':'')+'>'+esc(name)+' ('+uf+')</option>').join('');
function openRoomFilter(kind=''){
 if(state.view!=='rooms')return;
 const choices=[...(world().scope==='country'?[]:[['global','Mundo',globe(19)]]),['national','País',ico('flag',19)],...(regionAllowed()?[['state','Estado',regionGraphic('state',19)],['city','Cidade',regionGraphic('city',19)]]:[])];
 if(kind&&!choices.some(([key])=>key===kind))return;
 const choosing=!kind;
 closeRoomFilter(false);focusKind=kind;
 const prev=slots[kind]||{},mine=window.entreGeo?.details?.().self;
 picker={kind,country:world().scope==='country'?world().country:prev.country||world().country||'',uf:prev.uf||mine?.state||'',city:prev.name||'',cities:[],query:'',loading:false,error:false};
 const overlay=document.createElement('div');overlay.id='roomsFilterOverlay';overlay.className='rooms-filter-overlay';
 const label={global:'Sala global',national:'Escolha um país',state:'Escolha um estado',city:'Escolha uma cidade'}[kind]||'Filtrar salas';
 let body='';
 if(kind==='global')body='<p class="cr-filter-description">Converse com pessoas de qualquer parte do mundo.</p><button type="button" class="rooms-filter-action" data-room-action="confirm-global">Entrar na sala global '+ico('arrow',16)+'</button>';
 if(kind==='national')body='<label for="roomsCountrySelect">País</label><select id="roomsCountrySelect" '+(world().scope==='country'?'disabled':'')+'>'+window.connectWorld.countries(picker.country)+'</select>'+(world().scope==='country'?'<p class="rooms-city-status">Seu alcance está limitado ao seu país. Altere em Configurações para acessar outros países.</p>':'')+'<button type="button" class="rooms-filter-action" data-room-action="confirm-national" '+(!picker.country?'disabled':'')+'>Entrar no chat do país '+ico('arrow',16)+'</button>';
 if(kind==='state')body='<label for="roomsStateSelect">Estado (Brasil)</label><select id="roomsStateSelect">'+ufOptions(picker.uf)+'</select><button type="button" class="rooms-filter-action" data-room-action="confirm-state" '+(!picker.uf?'disabled':'')+'>Entrar no chat do estado '+ico('arrow',16)+'</button>';
 if(kind==='city')body='<label for="roomsCitySearch">Buscar cidade</label><input type="search" id="roomsCitySearch" maxlength="100" autocomplete="off" placeholder="Digite o nome da cidade"><label for="roomsCitySelect">Cidade</label><select id="roomsCitySelect" aria-describedby="roomsCityStatus" disabled><option>Carregando cidades…</option></select><p id="roomsCityStatus" class="rooms-city-status" role="status"></p><button type="button" class="rooms-filter-action cr-city-retry" data-room-action="retry-cities" hidden>Tentar novamente</button><button type="button" class="rooms-filter-action" data-room-action="confirm-city" disabled>Entrar no chat da cidade '+ico('arrow',16)+'</button>';
 if(['state','city'].includes(kind)&&window.entreGeo?.detectRegion)body='<button type="button" class="rooms-auto-detect" data-room-action="detect-slot">'+ico('compass',18)+' <span><strong>Detectar '+(kind==='state'?'meu estado':'minha cidade')+'</strong><small>Usar localização do dispositivo</small></span></button><p id="roomsDetectStatus" class="rooms-city-status" role="status"></p>'+body;
 const options='<div class="cr-filter-options" aria-label="Abrangência da sala">'+choices.map(([key,name,graphic])=>'<button type="button" class="cr-filter-option'+(key===kindFor(s.room)?' is-selected':'')+'" data-room-action="filter-kind" data-kind="'+key+'">'+graphic+'<span>'+name+'</span>'+ico('arrow',15)+'</button>').join('')+'</div>';
 overlay.innerHTML='<section class="rooms-filter-dialog cr-unified-filter" role="dialog" aria-modal="true" aria-labelledby="roomsFilterHeading"><header class="rooms-filter-heading"><div class="cr-filter-heading-copy">'+(choosing?'':'<button type="button" class="cr-filter-back" data-room-action="filter-back" aria-label="Voltar aos tipos de sala">'+ico('back',18)+'</button>')+'<div><small class="cr-filter-kicker">SALAS PÚBLICAS</small><h2 id="roomsFilterHeading">'+label+'</h2></div></div><button type="button" data-room-action="closeFilter" aria-label="Fechar">'+ico('close',20)+'</button></header><div class="rooms-filter-body">'+(choosing?options:'<div class="cr-filter-fields">'+body+'</div>')+'</div></section>';
 document.body.appendChild(overlay);document.body.classList.add('rooms-filter-open');s.filterOpen=true;overlay.querySelector('select:not([disabled]),button')?.focus();
 if(kind==='city')void cities();
}
async function cities(){
 if(picker?.kind!=='city')return;
 const selected=picker,stamp=++cityRequest;selected.loading=true;selected.error=false;filterCities();
 try{
  if(!cityCatalog){
   if(!cityCatalogRequest)cityCatalogRequest=(async()=>{const response=await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/municipios');if(!response.ok)throw Error('Falha ao consultar cidades.');const rows=await response.json();if(!Array.isArray(rows)||!rows.length||rows.length>10000)throw Error('Lista inválida');const unique=new Map();for(const row of rows){const name=String(row.nome||'');const uf=row.microrregiao?.mesorregiao?.UF?.sigla||row['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla;if(name&&validState(uf))unique.set(uf+':'+clean(name),{name,uf});}if(unique.size<5000)throw Error('Lista incompleta');cityCatalog=[...unique.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')||a.uf.localeCompare(b.uf));return cityCatalog;})().finally(()=>{cityCatalogRequest=null;});
   await cityCatalogRequest;
  }
  if(picker!==selected||stamp!==cityRequest)return;selected.cities=cityCatalog;
  if(!selected.cities.some(c=>c.uf===selected.uf&&c.name===selected.city))selected.city='';
 }catch(_){if(picker===selected&&stamp===cityRequest){selected.cities=[];selected.error=true;}}
 finally{if(picker===selected&&stamp===cityRequest){selected.loading=false;filterCities();}}
}

async function detectSlot(btn){
 const selected=picker,status=document.getElementById('roomsDetectStatus');
 if(!selected||selected.kind==='national'||btn.disabled)return;
 btn.disabled=true;if(status)status.textContent='Detectando localização…';
 try{
  const region=await window.entreGeo.detectRegion();
  if(picker!==selected)return;
  if(!validState(region.state))throw Error('Estado indisponível.');
  selected.uf=region.state;selected.city='';selected.cities=[];const uf=document.getElementById('roomsStateSelect');if(uf)uf.value=selected.uf;
  if(selected.kind==='state'){const confirm=document.querySelector('[data-room-action="confirm-state"]');if(confirm)confirm.disabled=false;if(status)status.textContent='Estado encontrado. Confirme para entrar.';return;}
  const stamp=selected.uf;await cities();if(picker!==selected||selected.uf!==stamp)return;
  selected.city=selected.cities.find(c=>c.uf===stamp&&clean(c.name)===clean(region.city))?.name||'';selected.query=selected.city;const search=document.getElementById('roomsCitySearch');if(search)search.value=selected.query;filterCities();
  if(status)status.textContent=selected.city?'Cidade encontrada. Confirme para entrar.':'Selecione sua cidade na lista.';
 }catch(error){if(picker===selected&&status)status.textContent=error?.message||'Localização indisponível. Escolha manualmente.';}
 finally{if(btn.isConnected)btn.disabled=false;}
}
let roomRefreshQueued=false;
async function load(more=false){
 if(s.loading||s.loadingMore){if(!more)roomRefreshQueued=true;return;}if(!state.session)return;
 const room=s.room,user=state.session.user.id,epoch=roomEpoch;
 if(more)s.loadingMore=true;else s.loading=true;s.loadError=false;
 try{
  const {data,error}=await db.rpc('entre_room_messages_page',{_room:room,_before:more?s.rows[0]?.id||null:null});
  if(error)throw error;if(epoch!==roomEpoch||room!==s.room||state.session?.user?.id!==user)return;
  const next=(data?.items||[]).filter(r=>!r.deleted_at).slice().reverse();
  if(more)s.rows=next.concat(s.rows).slice(0,100);
  else s.rows=next;
  s.older=data?.has_more===true;s.loaded=true;
  paint();
 }catch(error){if(epoch===roomEpoch&&room===s.room&&state.session?.user?.id===user){s.loadError=true;toast(infoError(error),true)}}
 finally{s.loading=false;s.loadingMore=false;if(epoch===roomEpoch&&state.session?.user?.id===user)paint();if(roomRefreshQueued){roomRefreshQueued=false;if(state.view==='rooms'&&!document.hidden)void load();}}
}
function roomChange(key){
 if(!/^(world|br|n:[a-z]{2}|s:[a-z]{2}|c:[a-z]{2}:[a-z0-9][a-z0-9_-]{1,79})$/.test(key)||!permitted(key))return;
 if(key===s.room){closeRoomFilter();persist();return;}
 rememberDraft();closeRoomFilter(false);roomEpoch++;s.room=key;s.activeCity=kindFor(key)==='city'?slots.city?.name||'':'';s.rows=[];s.older=false;s.loaded=false;s.loadError=false;persist();renderView();void load();startPolling();
}
function startPolling(){
 if(s.refreshTimer)clearInterval(s.refreshTimer);
 s.refreshTimer=setInterval(()=>{if(state.view==='rooms'&&!document.hidden&&!s.loading&&!s.loadingMore)void load();},30000);
}
async function enter(){resetAccount();if(state.view!=='rooms')return;await load();if(state.view==='rooms')startPolling();}
async function send(form){
 if(s.busy||!state.session)return;
 const input=form.querySelector('#roomText'),body=String(input?.value||'').trim();
 if(!body)return;
 if(s.expiresCooldown>Date.now()){toast('Aguarde o intervalo de 5 segundos.',true);return;}
 s.busy=true;const btn=form.querySelector('[type="submit"]');if(btn)btn.disabled=true;
 try{
  const owner=state.session?.user?.id,room=s.room;const {error}=await db.rpc('entre_room_send',{_room:room,_body:body});
  if(error)throw error;if(state.session?.user?.id!==owner)return;
  s.expiresCooldown=Date.now()+5000;if(drafts.get(room)?.trim()===body)drafts.delete(room);if(input.value.trim()===body)input.value='';if(s.room!==room)return;window.connectSound?.play?.('send');
  await load();
 }catch(e){toast(infoError(e),true);if(/5 segundos/.test(e.message||''))s.expiresCooldown=Date.now()+5000;}
 finally{s.busy=false;if(btn?.isConnected)btn.disabled=false;paint();}
}
document.addEventListener('input',e=>{if(e.target?.id==='roomText'){rememberDraft();updateComposer();}else if(e.target?.id==='roomsCitySearch'&&picker?.kind==='city'){picker.query=e.target.value;picker.city='';filterCities();}});
setInterval(()=>{if(typeof state!=='undefined'&&state.view==='rooms'&&!document.hidden)updateComposer();},500);
document.addEventListener('submit',e=>{if(e.target?.id!=='roomChatForm')return;e.preventDefault();void send(e.target);});
document.addEventListener('change',event=>{
 const el=event.target;if(!picker)return;
 if(el?.id==='roomsCountrySelect'&&picker.kind==='national'){picker.country=el.value;const btn=document.querySelector('[data-room-action="confirm-national"]');if(btn)btn.disabled=!picker.country;}
 if(el?.id==='roomsStateSelect'&&picker.kind==='state'){picker.uf=validState(el.value)?el.value:'';const btn=document.querySelector('[data-room-action="confirm-state"]');if(btn)btn.disabled=!picker.uf;}
 if(el?.id==='roomsCitySelect'&&picker.kind==='city'){const chosen=picker.cities.find(c=>cityKey(c)===el.value);picker.city=chosen?.name||'';picker.uf=chosen?.uf||'';filterCities();}
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&s.filterOpen){event.preventDefault();closeRoomFilter();}});
document.addEventListener('click',e=>{
 if(e.target?.id==='roomsFilterOverlay'){closeRoomFilter();return;}
 const b=e.target.closest?.('[data-room-action]');if(!b||b.disabled)return;const a=b.dataset.roomAction;
 if(a.startsWith('quick-')){openSlot(a.slice(6));return;}
 if(a==='filter'){openRoomFilter();return;}
 if(a==='filter-kind'){openRoomFilter(b.dataset.kind);return;}
 if(a==='filter-back'){openRoomFilter();return;}
 if(a==='retry-cities'){void cities();return;}
 if(a==='confirm-global'&&picker?.kind==='global'){roomChange('world');return;}
 if(a==='closeFilter'){closeRoomFilter();return;}
 if(a==='detect-slot'){void detectSlot(b);return;}
 if(a==='confirm-national'&&picker?.kind==='national'&&picker.country&&/^[A-Z]{2}$/.test(picker.country)){const country=picker.country;selectSlot('national',{country,key:national(country)});}
 if(a==='confirm-state'&&picker?.kind==='state'&&validState(picker.uf)){const uf=picker.uf;selectSlot('state',{uf,key:'s:'+uf.toLowerCase()});}
 if(a==='confirm-city'&&picker?.kind==='city'&&picker.cities.some(c=>c.uf===picker.uf&&c.name===picker.city)){const {uf,city}=picker;selectSlot('city',{uf,name:city,key:'c:'+uf.toLowerCase()+':'+clean(city)});}
 if(a==='more')void load(true);
 if(a==='retry')void load();
 if(a==='say-hi'){const input=document.getElementById('roomText');if(input){if(!input.value)input.value='Oi!';rememberDraft();updateComposer();input.focus();}}
});

window.entreRooms={view,enter,resetAccount,resetWorld:()=>{roomOwner=null;resetAccount();},messageContext:id=>state.view==='rooms'?{room:s.room,message:s.rows.find(r=>String(r.id)===String(id))}:null,applyMutation:(room,row)=>{if(state.view!=='rooms'||room!==s.room)return;const item=s.rows.find(r=>r.id===row.id);if(row.deleted_at)s.rows=s.rows.filter(r=>String(r.id)!==String(row.id));else if(item)Object.assign(item,row);paint();},refresh:()=>state.view==='rooms'&&!document.hidden?load():Promise.resolve(),stop:()=>{rememberDraft();closeRoomFilter(false);if(s.refreshTimer)clearInterval(s.refreshTimer);s.refreshTimer=null;},roomChange,details:()=>({room:s.room,rows:s.rows.length,filterOpen:s.filterOpen,channels:Object.fromEntries(Object.entries(slots).map(([k,v])=>[k,v.key]))})};
})();