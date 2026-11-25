/* CONNECT · Independent public room channels, with account-scoped saved selections. */
(function(){
'use strict';
const UF=[['AC','Acre'],['AL','Alagoas'],['AP','Amapá'],['AM','Amazonas'],['BA','Bahia'],['CE','Ceará'],['DF','Distrito Federal'],['ES','Espírito Santo'],['GO','Goiás'],['MA','Maranhão'],['MT','Mato Grosso'],['MS','Mato Grosso do Sul'],['MG','Minas Gerais'],['PA','Pará'],['PB','Paraíba'],['PR','Paraná'],['PE','Pernambuco'],['PI','Piauí'],['RJ','Rio de Janeiro'],['RN','Rio Grande do Norte'],['RS','Rio Grande do Sul'],['RO','Rondônia'],['RR','Roraima'],['SC','Santa Catarina'],['SP','São Paulo'],['SE','Sergipe'],['TO','Tocantins']];
const s={room:'world',activeCity:'',state:'SP',city:'',cities:[],loading:false,busy:false,rows:[],older:false,loadingMore:false,after:0,expiresCooldown:0,refreshTimer:null,cityLoading:false,cityError:false,filterOpen:false,detecting:false,filterEpoch:0};
const clean=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80);
const flags=uf=>'<img class="uf-flag" loading="lazy" width="33" height="24" alt="Bandeira de '+esc(uf)+'" src="https://strategicprojects.github.io/flags-brasil/flags/uf/'+uf.toLowerCase()+'.svg">';
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
function resetAccount(){const uid=state.session?.user?.id||null;if(roomOwner===uid)return;closeRoomFilter(false);roomOwner=uid;roomEpoch++;roomRefreshQueued=false;drafts=new Map();s.rows=[];s.older=false;s.expiresCooldown=0;s.activeCity='';s.city='';s.state='';s.cities=[];restoreSlots();if(s.refreshTimer)clearInterval(s.refreshTimer);s.refreshTimer=null;}

function shortcut(kind,label,detail,graphic,selected){
 return '<button type="button" class="cr-shortcut'+(selected?' is-current':'')+'" data-room-action="quick-'+kind+'" aria-pressed="'+String(selected)+'"><span class="cr-shortcut-icon">'+graphic+'</span><span class="cr-shortcut-copy"><strong>'+label+'</strong><small>'+esc(detail)+'</small></span>'+(selected?'<span class="cr-selected-dot" aria-hidden="true"></span>':'')+'</button>';
}
function view(){
 resetAccount();const current=title(s.room),label=icon(s.room),active=kindFor(s.room),n=slots.national,t=slots.state,city=slots.city;
 return '<section class="room-shell rooms-static-shell cr-rooms" aria-label="Salas públicas">'+
 '<header class="rooms-static-header cr-top"><div class="cr-title"><span class="cr-eyebrow"><span class="cr-tiny-dot"></span> COMUNIDADE</span><h2>Salas</h2><p>Alterne entre suas salas públicas.</p></div></header>'+
 '<nav class="cr-shortcuts" aria-label="Escolher sala">'+(world().scope==='country'?'':shortcut('global','Mundo','Sala global','🌐',active==='global'))+shortcut('national','País',n?window.connectWorld.codeName(n.country):'Selecionar',n?window.connectWorld.flag(n.country):ico('compass',20),active==='national')+(regionAllowed()?shortcut('state','Estado',t?stateName(t.uf):'Selecionar',t?flags(t.uf):ico('compass',20),active==='state')+shortcut('city','Cidade',city?city.name:'Selecionar',ico('compass',20),active==='city'):'')+'</nav>'+
 '<section class="cr-chat" aria-label="Conversa atual"><header class="cr-chat-head"><div class="cr-room-symbol">'+label+'</div><div class="cr-chat-name"><small>'+({global:'Internacional',national:'Nacional',state:'Estadual',city:'Municipal'})[active]+' · Sala pública</small><strong>'+esc(current)+'</strong></div>'+(active!=='global'?'<button type="button" class="cr-change-room cr-edit-channel" data-room-action="edit" data-kind="'+active+'" aria-label="Alterar '+({national:'país',state:'estado',city:'cidade'})[active]+'">'+ico('sliders',16)+' <span>Alterar</span></button>':'')+'</header>'+
 '<div class="cr-retention">'+ico('clock',14)+'<span>Mensagens temporárias · 24 horas</span></div>'+
 '<div class="rooms-discussion" id="roomMessages" aria-live="polite" aria-label="Mensagens da sala">'+chatRows()+'</div>'+
 '<div class="cr-compose"><form id="roomChatForm" class="room-composer"><label class="sr-only" for="roomText">Sua mensagem na sala</label>'+
 '<input autocomplete="off" id="roomText" maxlength="400" placeholder="Escreva uma mensagem…" value="'+esc(drafts.get(s.room)||'')+'" required>'+
 '<button type="submit" title="Enviar mensagem" aria-label="Enviar mensagem">'+ico('send',19)+'</button></form>'+
 '<p class="rooms-cooldown" id="roomCooldown">Uma mensagem a cada 5 segundos · apaga em 24h</p></div></section></section>';
}
function filterCities(){
 if(picker?.kind!=='city')return;
 const select=document.getElementById('roomsCitySelect'),button=document.querySelector('#roomsFilterOverlay [data-room-action="confirm-city"]'),status=document.getElementById('roomsCityStatus');if(!select)return;
 select.disabled=picker.loading||!picker.uf||!picker.cities.length;
 select.innerHTML='<option value="">'+(picker.loading?'Carregando cidades…':picker.error?'Cidades indisponíveis':'Selecione a cidade')+'</option>'+picker.cities.map(city=>'<option value="'+esc(city)+'" '+(city===picker.city?'selected':'')+'>'+esc(city)+'</option>').join('');
 if(button)button.disabled=picker.loading||!picker.cities.includes(picker.city);
 if(status)status.textContent=picker.error?'Não foi possível consultar as cidades. Tente novamente.':'';
}
function closeRoomFilter(focus=true){
 document.getElementById('roomsFilterOverlay')?.remove();
 document.body?.classList.remove('rooms-filter-open');
 s.filterOpen=false;s.filterEpoch++;cityRequest++;picker=null;
 if(focus&&state.view==='rooms'&&focusKind)document.querySelector('[data-room-action="quick-'+focusKind+'"]')?.focus({preventScroll:true});
}
const ufOptions=value=>'<option value="">Selecione o estado</option>'+UF.map(([uf,name])=>'<option value="'+uf+'" '+(uf===value?'selected':'')+'>'+esc(name)+' ('+uf+')</option>').join('');
function openRoomFilter(kind){
 if(state.view!=='rooms'||!['national','state','city'].includes(kind)||(kind!=='national'&&!regionAllowed()))return;
 closeRoomFilter(false);focusKind=kind;
 const prev=slots[kind]||{},mine=window.entreGeo?.details?.().self;
 picker={kind,country:world().scope==='country'?world().country:prev.country||world().country||'',uf:prev.uf||mine?.state||'',city:prev.name||'',cities:[],loading:false,error:false};
 const overlay=document.createElement('div');overlay.id='roomsFilterOverlay';overlay.className='rooms-filter-overlay';
 const label={national:'Escolha um país',state:'Escolha um estado',city:'Escolha uma cidade'}[kind];
 let body='';
 if(kind==='national')body='<label for="roomsCountrySelect">País</label><select id="roomsCountrySelect" '+(world().scope==='country'?'disabled':'')+'>'+window.connectWorld.countries(picker.country)+'</select>'+(world().scope==='country'?'<p class="rooms-city-status">Seu alcance está limitado ao seu país. Altere em Configurações para acessar outros países.</p>':'')+'<button type="button" class="rooms-filter-action" data-room-action="confirm-national" '+(!picker.country?'disabled':'')+'>Entrar no chat do país '+ico('arrow',16)+'</button>';
 if(kind==='state')body='<label for="roomsStateSelect">Estado (Brasil)</label><select id="roomsStateSelect">'+ufOptions(picker.uf)+'</select><button type="button" class="rooms-filter-action" data-room-action="confirm-state" '+(!picker.uf?'disabled':'')+'>Entrar no chat do estado '+ico('arrow',16)+'</button>';
 if(kind==='city')body='<label for="roomsStateSelect">Estado de referência (Brasil)</label><select id="roomsStateSelect">'+ufOptions(picker.uf)+'</select><label for="roomsCitySelect">Cidade</label><select id="roomsCitySelect" aria-describedby="roomsCityStatus" disabled><option>Selecione o estado primeiro</option></select><p id="roomsCityStatus" class="rooms-city-status" role="status"></p><button type="button" class="rooms-filter-action" data-room-action="confirm-city" disabled>Entrar no chat da cidade '+ico('arrow',16)+'</button>';
 overlay.innerHTML='<section class="rooms-filter-dialog" role="dialog" aria-modal="true" aria-labelledby="roomsFilterHeading"><header class="rooms-filter-heading"><div><small class="cr-filter-kicker">CANAL '+({national:'NACIONAL',state:'ESTADUAL',city:'MUNICIPAL'})[kind]+'</small><h2 id="roomsFilterHeading">'+label+'</h2></div><button type="button" data-room-action="closeFilter" aria-label="Fechar">'+ico('close',20)+'</button></header><div class="rooms-filter-body">'+body+'</div></section>';
 document.body.appendChild(overlay);document.body.classList.add('rooms-filter-open');s.filterOpen=true;overlay.querySelector('select:not([disabled]),button')?.focus();
 if(kind==='city'&&picker.uf)void cities(picker.uf);
}
async function cities(uf){
 if(picker?.kind!=='city'||!validState(uf))return;
 const selected=picker,stamp=++cityRequest;selected.loading=true;selected.error=false;filterCities();
 try{const response=await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/'+encodeURIComponent(uf)+'/municipios');if(!response.ok)throw Error('Falha ao consultar cidades.');const rows=await response.json();if(!Array.isArray(rows)||!rows.length||rows.length>1500)throw Error('Lista inválida');if(picker!==selected||stamp!==cityRequest)return;selected.cities=rows.map(x=>String(x.nome||'')).filter(Boolean).sort((a,b)=>a.localeCompare(b,'pt-BR'));if(!selected.cities.includes(selected.city))selected.city='';}
 catch(_){if(picker===selected&&stamp===cityRequest){selected.cities=[];selected.error=true;}}
 finally{if(picker===selected&&stamp===cityRequest){selected.loading=false;filterCities();}}
}

let roomRefreshQueued=false;
async function load(more=false){
 if(s.loading||s.loadingMore){if(!more)roomRefreshQueued=true;return;}if(!state.session)return;
 const room=s.room,user=state.session.user.id,epoch=roomEpoch;
 if(more)s.loadingMore=true;else s.loading=true;
 try{
  const {data,error}=await db.rpc('entre_room_messages_page',{_room:room,_before:more?s.rows[0]?.id||null:null});
  if(error)throw error;if(epoch!==roomEpoch||room!==s.room||state.session?.user?.id!==user)return;
  const next=(data?.items||[]).filter(r=>!r.deleted_at).slice().reverse();
  if(more)s.rows=next.concat(s.rows).slice(0,100);
  else s.rows=next;
  s.older=data?.has_more===true;
  paint(!more);
 }catch(error){if(epoch===roomEpoch&&room===s.room&&state.session?.user?.id===user)toast(infoError(error),true)}
 finally{s.loading=false;s.loadingMore=false;if(epoch===roomEpoch&&state.session?.user?.id===user)paint(!more);if(roomRefreshQueued){roomRefreshQueued=false;if(state.view==='rooms'&&!document.hidden)void load();}}
}
function roomChange(key){
 if(!/^(world|br|n:[a-z]{2}|s:[a-z]{2}|c:[a-z]{2}:[a-z0-9][a-z0-9_-]{1,79})$/.test(key)||!permitted(key))return;
 if(key===s.room){closeRoomFilter();persist();return;}
 rememberDraft();closeRoomFilter(false);roomEpoch++;s.room=key;s.activeCity=kindFor(key)==='city'?slots.city?.name||'':'';s.rows=[];s.older=false;persist();renderView();void load();startPolling();
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
document.addEventListener('submit',e=>{if(e.target?.id!=='roomChatForm')return;e.preventDefault();void send(e.target);});
document.addEventListener('change',event=>{
 const el=event.target;if(!picker)return;
 if(el?.id==='roomsCountrySelect'&&picker.kind==='national'){picker.country=el.value;const btn=document.querySelector('[data-room-action="confirm-national"]');if(btn)btn.disabled=!picker.country;}
 if(el?.id==='roomsStateSelect'&&['state','city'].includes(picker.kind)){picker.uf=validState(el.value)?el.value:'';picker.city='';picker.cities=[];picker.error=false;picker.loading=false;cityRequest++;if(picker.kind==='state'){const btn=document.querySelector('[data-room-action="confirm-state"]');if(btn)btn.disabled=!picker.uf;}else{filterCities();if(picker.uf)void cities(picker.uf);}}
 if(el?.id==='roomsCitySelect'&&picker.kind==='city'){picker.city=el.value;filterCities();}
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&s.filterOpen){event.preventDefault();closeRoomFilter();}});
document.addEventListener('click',e=>{
 if(e.target?.id==='roomsFilterOverlay'){closeRoomFilter();return;}
 const b=e.target.closest?.('[data-room-action]');if(!b||b.disabled)return;const a=b.dataset.roomAction;
 if(a.startsWith('quick-')){openSlot(a.slice(6));return;}
 if(a==='edit'){openRoomFilter(b.dataset.kind);return;}
 if(a==='closeFilter'){closeRoomFilter();return;}
 if(a==='confirm-national'&&picker?.kind==='national'&&picker.country&&/^[A-Z]{2}$/.test(picker.country)){const country=picker.country;selectSlot('national',{country,key:national(country)});}
 if(a==='confirm-state'&&picker?.kind==='state'&&validState(picker.uf)){const uf=picker.uf;selectSlot('state',{uf,key:'s:'+uf.toLowerCase()});}
 if(a==='confirm-city'&&picker?.kind==='city'&&picker.cities.includes(picker.city)){const {uf,city}=picker;selectSlot('city',{uf,name:city,key:'c:'+uf.toLowerCase()+':'+clean(city)});}
 if(a==='more')void load(true);
});

window.entreRooms={view,enter,resetAccount,resetWorld:()=>{roomOwner=null;resetAccount();},messageContext:id=>state.view==='rooms'?{room:s.room,message:s.rows.find(r=>String(r.id)===String(id))}:null,applyMutation:(room,row)=>{if(state.view!=='rooms'||room!==s.room)return;const item=s.rows.find(r=>r.id===row.id);if(row.deleted_at)s.rows=s.rows.filter(r=>String(r.id)!==String(row.id));else if(item)Object.assign(item,row);paint();},refresh:()=>state.view==='rooms'&&!document.hidden?load():Promise.resolve(),stop:()=>{rememberDraft();closeRoomFilter(false);if(s.refreshTimer)clearInterval(s.refreshTimer);s.refreshTimer=null;},roomChange,details:()=>({room:s.room,rows:s.rows.length,filterOpen:s.filterOpen,channels:Object.fromEntries(Object.entries(slots).map(([k,v])=>[k,v.key]))})};
})();