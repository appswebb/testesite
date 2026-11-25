/* entre. · Official Brazilian public rooms (all real messages live in Supabase). */
(function(){
'use strict';
const UF=[['AC','Acre'],['AL','Alagoas'],['AP','Amapá'],['AM','Amazonas'],['BA','Bahia'],['CE','Ceará'],['DF','Distrito Federal'],['ES','Espírito Santo'],['GO','Goiás'],['MA','Maranhão'],['MT','Mato Grosso'],['MS','Mato Grosso do Sul'],['MG','Minas Gerais'],['PA','Pará'],['PB','Paraíba'],['PR','Paraná'],['PE','Pernambuco'],['PI','Piauí'],['RJ','Rio de Janeiro'],['RN','Rio Grande do Norte'],['RS','Rio Grande do Sul'],['RO','Rondônia'],['RR','Roraima'],['SC','Santa Catarina'],['SP','São Paulo'],['SE','Sergipe'],['TO','Tocantins']];
const s={room:'world',activeCity:'',state:'SP',city:'',cities:[],loading:false,busy:false,rows:[],older:false,loadingMore:false,after:0,expiresCooldown:0,refreshTimer:null,cityLoading:false,cityError:false,filterOpen:false,detecting:false,filterEpoch:0};
const clean=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80);
const flags=uf=>'<img class="uf-flag" loading="lazy" width="33" height="24" alt="Bandeira de '+esc(uf)+'" src="https://strategicprojects.github.io/flags-brasil/flags/uf/'+uf.toLowerCase()+'.svg">';
const world=()=>window.connectWorld?.current?.()||{country:'',scope:'world'};
const national=code=>code==='BR'?'br':'n:'+code.toLowerCase();
const countryKey=()=>world().country?national(world().country):'world';
const title=key=>key==='world'?'Mundo · Sala global':key==='br'?'Brasil · Sala nacional':key.startsWith('n:')?window.connectWorld.codeName(key.slice(2).toUpperCase()):key.startsWith('s:')?UF.find(u=>u[0].toLowerCase()===key.slice(2))?.[1]||'Estado':s.activeCity||'Sala da cidade';
const formatDate=d=>new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const icon=key=>key==='world'?'🌐':key==='br'?'🇧🇷':key.startsWith('n:')?window.connectWorld.flag(key.slice(2).toUpperCase()):flags(key.slice(2,4).toUpperCase());
function chatRows(){
 s.rows=s.rows.filter(r=>!r.deleted_at);
 if(s.loading&&!s.rows.length)return '<div class="rooms-empty">Carregando mensagens…</div>';
 if(!s.rows.length)return '<div class="rooms-empty"><span class="cn-room-empty-icon">'+ico('rooms',32)+'</span><strong>Comece a conversa.</strong><p>Esta sala está tranquila. Seja a primeira pessoa a dar um oi.</p></div>';
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
 const cool=document.getElementById('roomCooldown');
 if(cool)cool.textContent=s.expiresCooldown>Date.now()?'Aguarde '+Math.ceil((s.expiresCooldown-Date.now())/1000)+'s para enviar outra.':'Uma mensagem a cada 5 segundos · apaga em 24h';
}
let roomOwner=null;
function resetAccount(){const uid=state.session?.user?.id||null;if(roomOwner===uid)return;roomOwner=uid;s.rows=[];s.older=false;s.expiresCooldown=0;s.room=world().scope==='country'?countryKey():'world';s.activeCity='';s.city='';s.state='SP';s.cities=[];if(s.refreshTimer)clearInterval(s.refreshTimer);s.refreshTimer=null;}
function shortcut(kind,label,detail,graphic,selected){
 return '<button type="button" class="cr-shortcut'+(selected?' is-current':'')+'" data-room-action="quick-'+kind+'" aria-pressed="'+String(selected)+'"><span class="cr-shortcut-icon">'+graphic+'</span><span class="cr-shortcut-copy"><strong>'+label+'</strong><small>'+esc(detail)+'</small></span>'+(selected?'<span class="cr-selected-dot" aria-hidden="true"></span>':'')+'</button>';
}
function view(){
 resetAccount();const current=title(s.room),label=icon(s.room),uf=UF.find(x=>x[0]===s.state)?.[1]||'Escolher estado';
 return '<section class="room-shell rooms-static-shell cr-rooms" aria-label="Salas públicas">'+
 '<header class="rooms-static-header cr-top"><div class="cr-title"><span class="cr-eyebrow"><span class="cr-tiny-dot"></span> COMUNIDADE</span><h2>Salas</h2><p>Converse com pessoas da sua região ou do mundo.</p></div>'+
 '<button type="button" class="rooms-open-filter" data-room-action="filter" aria-haspopup="dialog" aria-expanded="false" aria-controls="roomsFilterOverlay">'+ico('sliders',18)+'<span>Filtros</span></button></header>'+
 '<nav class="cr-shortcuts" aria-label="Escolher sala">'+(world().scope==='country'?'':shortcut('global','Mundo','Sala global','🌐',s.room==='world'))+shortcut('national','País',world().country?window.connectWorld.codeName(world().country):'Escolher país',world().country?window.connectWorld.flag(world().country):'🌐',s.room===countryKey()&&s.room!=='world')+((!world().country||world().country==='BR')?shortcut('state','Estado',uf,flags(s.state),s.room==='s:'+s.state.toLowerCase())+shortcut('city','Cidade',s.city||'Escolher cidade',ico('compass',20),s.room==='c:'+s.state.toLowerCase()+':'+clean(s.city)):'')+'</nav>'+
 '<section class="cr-chat" aria-label="Conversa atual"><header class="cr-chat-head"><div class="cr-room-symbol">'+label+'</div><div class="cr-chat-name"><small>'+(s.room==='world'?'Internacional':s.room==='br'||s.room.startsWith('n:')?'Nacional':s.room.startsWith('s:')?'Estadual':'Municipal')+' · Sala pública</small><strong>'+esc(current)+'</strong></div><button type="button" class="cr-change-room" data-room-action="filter" aria-label="Trocar sala">'+ico('chevron',16)+'</button></header>'+
 '<div class="cr-retention">'+ico('clock',14)+'<span>Mensagens temporárias · 24 horas</span></div>'+
 '<div class="rooms-discussion" id="roomMessages" aria-live="polite" aria-label="Mensagens da sala">'+chatRows()+'</div>'+
 '<div class="cr-compose"><form id="roomChatForm" class="room-composer"><label class="sr-only" for="roomText">Sua mensagem na sala</label>'+
 '<input autocomplete="off" id="roomText" maxlength="400" placeholder="Escreva uma mensagem…" required>'+
 '<button type="submit" title="Enviar mensagem" aria-label="Enviar mensagem">'+ico('send',19)+'</button></form>'+
 '<p class="rooms-cooldown" id="roomCooldown">Uma mensagem a cada 5 segundos · apaga em 24h</p></div></section></section>';
}
function filterCities(){
 const select=document.getElementById('roomsCitySelect'),button=document.querySelector('#roomsFilterOverlay [data-room-action="city"]'),status=document.getElementById('roomsCityStatus');
 if(!select)return;
 select.disabled=s.cityLoading||!s.state||!s.cities.length;
 select.innerHTML='<option value="">'+(s.cityLoading?'Carregando cidades…':s.cityError?'Cidades indisponíveis':'Selecione a cidade')+'</option>'+
 s.cities.map(city=>'<option value="'+esc(city)+'" '+(city===s.city?'selected':'')+'>'+esc(city)+'</option>').join('');
 if(button)button.disabled=!s.city||!s.cities.includes(s.city)||s.cityLoading;
 if(status)status.textContent=s.cityError?'Não foi possível consultar o IBGE. Tente outro estado.':'';
}
function closeRoomFilter(focus=true){
 document.getElementById('roomsFilterOverlay')?.remove();
 document.body.classList.remove('rooms-filter-open');
 s.filterOpen=false;s.filterEpoch++;document.querySelector('.rooms-open-filter')?.setAttribute('aria-expanded','false');
 if(focus&&state.view==='rooms')document.querySelector('.rooms-open-filter')?.focus();
}
function openRoomFilter(){
 if(state.view!=='rooms')return;
 closeRoomFilter(false);
 const local=world().scope==='country',brazil=!world().country||world().country==='BR';
 const overlay=document.createElement('div');overlay.id='roomsFilterOverlay';overlay.className='rooms-filter-overlay';
 const nationalPicker=local?'<button type="button" class="rooms-filter-global" data-room-action="quick-national">'+window.connectWorld.flag(world().country)+' '+esc(window.connectWorld.codeName(world().country))+' '+ico('arrow',17)+'</button>':'<button type="button" class="rooms-filter-global" data-room-action="choose" data-room="world">🌐 Sala mundial '+ico('arrow',17)+'</button><label for="roomsCountrySelect">País</label><select id="roomsCountrySelect">'+window.connectWorld.countries(world().country)+'</select><button type="button" class="rooms-filter-action" data-room-action="national">Entrar na sala nacional '+ico('arrow',16)+'</button>';
 const regional=brazil?'<button type="button" class="rooms-auto-detect" data-room-action="detect">'+ico('compass',18)+' <span><strong>Detectar localização</strong><small>Preencher estado e cidade no Brasil</small></span>'+ico('chevron',16)+'</button><p id="roomsDetectStatus" class="rooms-city-status" role="status"></p><label for="roomsStateSelect">Estado (Brasil)</label><select id="roomsStateSelect"><option value="">Selecione o estado</option>'+UF.map(([uf,name])=>'<option value="'+uf+'" '+(s.state===uf?'selected':'')+'>'+esc(name)+' ('+uf+')</option>').join('')+'</select><button type="button" class="rooms-filter-action" data-room-action="state" '+(!s.state?'disabled':'')+'>Entrar no chat do estado '+ico('arrow',16)+'</button><label for="roomsCitySelect">Cidade</label><select id="roomsCitySelect" aria-describedby="roomsCityStatus"><option value="">Selecione a cidade</option></select><p id="roomsCityStatus" class="rooms-city-status" role="status"></p><button type="button" class="rooms-filter-action rooms-filter-city" data-room-action="city">Entrar no chat da cidade '+ico('arrow',16)+'</button>':'';
 overlay.innerHTML='<section class="rooms-filter-dialog" role="dialog" aria-modal="true" aria-labelledby="roomsFilterHeading"><header class="rooms-filter-heading"><div><small class="cr-filter-kicker">ESCOLHA SUA REGIÃO</small><h2 id="roomsFilterHeading">Encontre uma sala</h2></div><button type="button" data-room-action="closeFilter" aria-label="Fechar filtro">'+ico('close',20)+'</button></header><div class="rooms-filter-body">'+nationalPicker+regional+'</div></section>';
 document.body.appendChild(overlay);document.body.classList.add('rooms-filter-open');s.filterOpen=true;document.querySelector('.rooms-open-filter')?.setAttribute('aria-expanded','true');
 filterCities();overlay.querySelector('select,button')?.focus();
 if(brazil&&s.state&&!s.cities.length&&!s.cityLoading)void cities(s.state);
}
async function cities(uf){
 if(!UF.some(([code])=>code===uf))return;
 const stamp=uf;s.cityLoading=true;s.cityError=false;filterCities();
 try{
  const response=await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/'+encodeURIComponent(uf)+'/municipios');
  if(!response.ok)throw Error('Falha ao consultar cidades.');
  const rows=await response.json();
  if(!Array.isArray(rows)||!rows.length||rows.length>1500)throw Error('Lista de cidades inválida.');
  if(stamp!==s.state)return;
  s.cities=rows.map(item=>String(item.nome||'')).filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'));
 }catch(error){
  if(stamp===s.state){s.cities=[];s.cityError=true;}
  console.warn('Cidades IBGE indisponíveis',error);
 }finally{
  if(stamp===s.state){s.cityLoading=false;filterCities();}
 }
}
let roomRefreshQueued=false;
async function load(more=false){
 if(s.loading||s.loadingMore){if(!more)roomRefreshQueued=true;return;}if(!state.session)return;
 const room=s.room,user=state.session.user.id;
 if(more)s.loadingMore=true;else s.loading=true;
 try{
  const {data,error}=await db.rpc('entre_room_messages_page',{_room:room,_before:more?s.rows[0]?.id||null:null});
  if(error)throw error;if(room!==s.room||state.session?.user?.id!==user)return;
  const next=(data?.items||[]).filter(r=>!r.deleted_at).slice().reverse();
  if(more)s.rows=next.concat(s.rows).slice(0,100);
  else s.rows=next;
  s.older=data?.has_more===true;
  paint(!more);
 }catch(error){if(room===s.room)toast(infoError(error),true)}
 finally{s.loading=false;s.loadingMore=false;paint(!more);if(roomRefreshQueued){roomRefreshQueued=false;if(state.view==='rooms'&&!document.hidden)void load();}}
}
async function detectRoomRegion(){
 if(s.detecting||!s.filterOpen)return;
 const epoch=s.filterEpoch;const btn=document.querySelector('[data-room-action="detect"]'),status=document.getElementById('roomsDetectStatus');
 s.detecting=true;if(btn)btn.disabled=true;if(status)status.textContent='Detectando sua localização…';
 try{
  const region=await window.entreGeo.detectRegion();
  if(!s.filterOpen||epoch!==s.filterEpoch)return;
  s.state=region.state;s.city='';s.cities=[];
  const select=document.getElementById('roomsStateSelect');if(select)select.value=s.state;
  const stateButton=document.querySelector('[data-room-action="state"]');if(stateButton)stateButton.disabled=false;
  await cities(s.state);
  if(!s.filterOpen||epoch!==s.filterEpoch||s.state!==region.state)return;
  const match=s.cities.find(n=>clean(n)===clean(region.city));
  if(match){s.city=match;roomChange('c:'+s.state.toLowerCase()+':'+clean(match));toast('Sala da sua cidade selecionada.');}
  else if(status)status.textContent='Estado detectado. Selecione sua cidade na lista.';
 }catch(error){if(status?.isConnected)status.textContent=error?.code===1?'Permissão de localização negada. Escolha manualmente.':error?.message||'Não foi possível detectar sua localização.';}
 finally{s.detecting=false;if(btn?.isConnected)btn.disabled=false;}
}
function roomChange(key){
 if(!/^world$|^br$|^n:[a-z]{2}$|^s:[a-z]{2}$|^c:[a-z]{2}:[a-z0-9][a-z0-9_-]{1,79}$/.test(key))return;
 if(world().scope==='country'&&key!==countryKey()&&!(world().country==='BR'&&/^[sc]:/.test(key))){toast('Suas preferências estão limitadas ao seu país.',true);return;}
 if(key===s.room){closeRoomFilter();return;}if(key.startsWith('c:'))s.activeCity=s.city;else s.activeCity='';closeRoomFilter(false);s.room=key;s.rows=[];s.older=false;renderView();void load();startPolling();
}
function startPolling(){
 if(s.refreshTimer)clearInterval(s.refreshTimer);
 s.refreshTimer=setInterval(()=>{if(state.view==='rooms'&&!document.hidden&&!s.loading&&!s.loadingMore)void load();},30000);
}
async function enter(){
 resetAccount();if(state.view!=='rooms')return;
 const mine=window.entreGeo?.details?.().self;
 if(mine?.state&&s.state==='SP')s.state=mine.state;
 if((!world().country||world().country==='BR')&&!s.cities.length)void cities(s.state);
 await load();if(state.view==='rooms')startPolling();
}
async function send(form){
 if(s.busy||!state.session)return;
 const input=form.querySelector('#roomText'),body=String(input?.value||'').trim();
 if(!body)return;
 if(s.expiresCooldown>Date.now()){toast('Aguarde o intervalo de 5 segundos.',true);return;}
 s.busy=true;const btn=form.querySelector('[type="submit"]');if(btn)btn.disabled=true;
 try{
  const owner=state.session?.user?.id,room=s.room;const {error}=await db.rpc('entre_room_send',{_room:room,_body:body});
  if(error)throw error;if(state.session?.user?.id!==owner||s.room!==room)return;
  if(input.value.trim()===body)input.value='';window.connectSound?.play?.('send');s.expiresCooldown=Date.now()+5000;
  await load();
 }catch(e){toast(infoError(e),true);if(/5 segundos/.test(e.message||''))s.expiresCooldown=Date.now()+5000;}
 finally{s.busy=false;if(btn?.isConnected)btn.disabled=false;paint();}
}
document.addEventListener('submit',e=>{if(e.target?.id!=='roomChatForm')return;e.preventDefault();void send(e.target);});
document.addEventListener('change',event=>{
 const el=event.target;
 if(el?.id==='roomsStateSelect'){
  if(!UF.some(([uf])=>uf===el.value))return;
  s.state=el.value;s.city='';s.cities=[];s.cityError=false;
  const stateBtn=document.querySelector('#roomsFilterOverlay [data-room-action="state"]');
  if(stateBtn)stateBtn.disabled=false;
  filterCities();void cities(s.state);
 }else if(el?.id==='roomsCitySelect'){
  s.city=el.value;filterCities();
 }
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&s.filterOpen){event.preventDefault();closeRoomFilter();}
});

document.addEventListener('click',e=>{
 const b=e.target.closest('[data-room-action]');if(!b)return;
 const a=b.dataset.roomAction;
 if(a==='filter'){openRoomFilter();return;}
 if(a==='quick-global'){roomChange('world');return;}
 if(a==='quick-national'){if(world().country)roomChange(countryKey());else openRoomFilter();return;}
 if(a==='national'){const code=document.getElementById('roomsCountrySelect')?.value;if(code)roomChange(national(code));return;}
 if(a==='quick-state'){if(UF.some(([uf])=>uf===s.state))roomChange('s:'+s.state.toLowerCase());else openRoomFilter();return;}
 if(a==='quick-city'){if(s.city&&s.cities.includes(s.city))roomChange('c:'+s.state.toLowerCase()+':'+clean(s.city));else openRoomFilter();return;}
 if(a==='closeFilter'){closeRoomFilter();return;}
 if(a==='detect'){void detectRoomRegion();return;}
 if(a==='choose')roomChange(b.dataset.room==='world'?'world':'br');
 if(a==='state'&&UF.some(([uf])=>uf===s.state))roomChange('s:'+s.state.toLowerCase());
 if(a==='city'&&s.city&&s.cities.includes(s.city))roomChange('c:'+s.state.toLowerCase()+':'+clean(s.city));
 if(a==='more')void load(true);

});
document.addEventListener('click',event=>{if(event.target?.id==='roomsFilterOverlay')closeRoomFilter();});
window.entreRooms={view,enter,resetAccount,resetWorld:()=>{roomOwner=null;resetAccount();},messageContext:id=>state.view==='rooms'?{room:s.room,message:s.rows.find(r=>String(r.id)===String(id))}:null,applyMutation:(room,row)=>{if(state.view!=='rooms'||room!==s.room)return;const item=s.rows.find(r=>r.id===row.id);if(row.deleted_at)s.rows=s.rows.filter(r=>String(r.id)!==String(row.id));else if(item)Object.assign(item,row);paint();},refresh:()=>state.view==='rooms'&&!document.hidden?load():Promise.resolve(),stop:()=>{closeRoomFilter(false);if(s.refreshTimer)clearInterval(s.refreshTimer);s.refreshTimer=null;},roomChange,details:()=>({room:s.room,rows:s.rows.length,filterOpen:s.filterOpen})};
})();