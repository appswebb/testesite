/* entre. · Official Brazilian public rooms (all real messages live in Supabase). */
(function(){
'use strict';
const UF=[['AC','Acre'],['AL','Alagoas'],['AP','Amapá'],['AM','Amazonas'],['BA','Bahia'],['CE','Ceará'],['DF','Distrito Federal'],['ES','Espírito Santo'],['GO','Goiás'],['MA','Maranhão'],['MT','Mato Grosso'],['MS','Mato Grosso do Sul'],['MG','Minas Gerais'],['PA','Pará'],['PB','Paraíba'],['PR','Paraná'],['PE','Pernambuco'],['PI','Piauí'],['RJ','Rio de Janeiro'],['RN','Rio Grande do Norte'],['RS','Rio Grande do Sul'],['RO','Rondônia'],['RR','Roraima'],['SC','Santa Catarina'],['SP','São Paulo'],['SE','Sergipe'],['TO','Tocantins']];
const s={room:'br',state:'SP',city:'',cities:[],loading:false,busy:false,rows:[],older:false,loadingMore:false,after:0,expiresCooldown:0,refreshTimer:null,cityLoading:false};
const clean=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9_-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,80);
const flags=uf=>'<img class="uf-flag" loading="lazy" width="33" height="24" alt="Bandeira de '+esc(uf)+'" src="https://strategicprojects.github.io/flags-brasil/flags/uf/'+uf.toLowerCase()+'.svg">';
const title=key=>key==='br'?'Brasil · Sala global':key.startsWith('s:')?UF.find(u=>u[0].toLowerCase()===key.slice(2))?.[1]||'Estado':s.city||'Sala da cidade';
const formatDate=d=>new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const icon=key=>key==='br'?'🇧🇷':flags(key.slice(2,4).toUpperCase());
function chatRows(){
 if(s.loading&&!s.rows.length)return '<div class="rooms-empty">Carregando mensagens…</div>';
 if(!s.rows.length)return '<div class="rooms-empty"><span>✳</span><strong>Comece a conversa.</strong><p>Esta sala está tranquila. Seja a primeira pessoa a dar um oi.</p></div>';
 return (s.older?'<button class="rooms-load-more" type="button" data-room-action="more">Mensagens anteriores</button>':'')+
 s.rows.map(r=>'<article class="room-message '+(r.sender===state.session?.user?.id?'is-mine':'')+'"><span class="room-message-avatar">'+esc(String(r.display_name||'?').slice(0,1).toUpperCase())+'</span><div class="room-message-content"><header><strong>'+esc(r.display_name)+'</strong><span>@'+esc(r.username||'pessoa')+'</span><time>'+formatDate(r.created_at)+'</time></header><p>'+esc(r.body)+'</p>'+(r.sender===state.session?.user?.id?'<button type="button" data-room-action="delete" data-id="'+Number(r.id)+'" aria-label="Apagar minha mensagem">Apagar</button>':'')+'</div></article>').join('');
}
function paint(scrollToEnd=false){
 const el=document.getElementById('roomMessages');if(!el)return;
 const keepBottom=scrollToEnd||el.scrollHeight-el.scrollTop-el.clientHeight<140;
 const oldTop=el.scrollTop,oldHeight=el.scrollHeight;
 el.innerHTML=chatRows();
 if(keepBottom)el.scrollTop=el.scrollHeight;
 else el.scrollTop=oldTop+(el.scrollHeight-oldHeight);
 const cool=document.getElementById('roomCooldown');
 if(cool)cool.textContent=s.expiresCooldown>Date.now()?'Aguarde '+Math.ceil((s.expiresCooldown-Date.now())/1000)+'s para enviar outra.':'Uma mensagem a cada 5 segundos · apaga em 24h';
}
function view(){
 const mine=window.entreGeo?.details?.().self;
 if(mine?.state&&s.room==='br'&&s.state==='SP')s.state=mine.state;
 const current=title(s.room);
 const label=s.room==='br'?'🇧🇷':icon(s.room);
 return heading('SALAS OFICIAIS','Converse com o <em>Brasil.</em>','Salas públicas por país, estado e cidade. Cada mensagem é removida do banco após 24 horas.')+
 '<section class="room-shell"><header class="rooms-head"><div class="rooms-head-title"><span>✳ CHAT PÚBLICO</span><h3>'+label+' '+esc(current)+'</h3></div><span class="rooms-retention">24h · mensagens temporárias</span></header>'+
 '<div class="room-picks"><button type="button" class="room-pill '+(s.room==='br'?'active':'')+'" data-room-action="choose" data-room="br">🇧🇷 Brasil · Global</button>'+
 '<label class="rooms-state-choice"><span>Estado</span><select id="roomsStateSelect" aria-label="Selecionar estado"><option value="">Escolher estado</option>'+
 UF.map(([uf,n])=>'<option value="'+uf+'" '+(s.state===uf?'selected':'')+'>'+esc(n)+' · '+uf+'</option>').join('')+'</select></label>'+
 '<button type="button" class="room-pill '+(s.room==='s:'+s.state.toLowerCase()?'active':'')+'" data-room-action="state" '+(!s.state?'disabled':'')+'>'+flags(s.state||'SP')+' Sala do estado</button></div>'+
 '<div class="room-city-row"><label for="roomsCitySelect">Cidade</label><select id="roomsCitySelect" aria-label="Selecionar cidade" '+(s.cityLoading?'disabled':'')+'>'+
 '<option value="">'+(s.cityLoading?'Carregando cidades…':'Selecionar cidade')+'</option>'+s.cities.map(c=>'<option value="'+esc(c)+'" '+(s.city===c?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select>'+
 '<button type="button" data-room-action="city" '+(!s.city?'disabled':'')+'>Entrar na sala da cidade</button></div>'+
 '<div class="rooms-discussion" id="roomMessages" aria-live="polite" aria-label="Mensagens da sala">'+chatRows()+'</div>'+
 '<form id="roomChatForm" class="room-composer"><label class="sr-only" for="roomText">Sua mensagem na sala</label><input autocomplete="off" id="roomText" maxlength="400" placeholder="Escreva para '+esc(current)+'…" required><button type="submit" title="Enviar mensagem" aria-label="Enviar mensagem">'+ico('send',19)+'</button></form>'+
 '<p class="rooms-cooldown" id="roomCooldown">Uma mensagem a cada 5 segundos · apaga em 24h</p>'+
 '<p class="rooms-guideline">Respeite outras pessoas. Não publique números de telefone, endereços nem dados sensíveis. As salas são oficiais: ninguém pode criar salas próprias.</p></section>';
}
async function cities(uf){
 if(!UF.some(([code])=>code===uf))return;
 const stamp=uf;s.cityLoading=true;
 const select=document.getElementById('roomsCitySelect');
 if(select){select.disabled=true;select.innerHTML='<option>Carregando cidades…</option>';}
 try{
  const r=await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/'+uf+'/municipios');
  if(!r.ok)throw Error('Falha ao consultar cidades.');
  const rows=await r.json();
  if(stamp!==s.state)return;
  s.cities=rows.map(c=>c.nome).sort((a,b)=>a.localeCompare(b,'pt-BR'));
 }catch(e){s.cities=[];console.warn('Cidade IBGE não disponível',e)}
 finally{if(stamp===s.state){s.cityLoading=false;if(state.view==='rooms')renderView();}}
}
async function load(more=false){
 if(s.loading||s.loadingMore||!state.session)return;
 const room=s.room;
 if(more)s.loadingMore=true;else s.loading=true;
 try{
  const {data,error}=await db.rpc('entre_room_messages_page',{_room:room,_before:more?s.rows[0]?.id||null:null});
  if(error)throw error;if(room!==s.room)return;
  const next=(data?.items||[]).slice().reverse();
  if(more)s.rows=next.concat(s.rows);
  else s.rows=next;
  s.older=data?.has_more===true;
  paint(!more);
 }catch(error){if(room===s.room)toast(infoError(error),true)}
 finally{s.loading=false;s.loadingMore=false;paint(!more);}
}
function roomChange(key){
 if(!/^br$|^s:[a-z]{2}$|^c:[a-z]{2}:[a-z0-9][a-z0-9_-]{1,79}$/.test(key))return;
 s.room=key;s.rows=[];s.older=false;renderView();void load();startPolling();
}
function startPolling(){
 if(s.refreshTimer)clearInterval(s.refreshTimer);
 s.refreshTimer=setInterval(()=>{if(state.view==='rooms'&&!document.hidden&&!s.loading&&!s.loadingMore)void load();},7000);
}
async function enter(){
 if(state.view!=='rooms')return;
 const mine=window.entreGeo?.details?.().self;
 if(mine?.state&&s.state==='SP')s.state=mine.state;
 if(!s.cities.length)void cities(s.state);
 await load();startPolling();
}
async function send(form){
 if(s.busy||!state.session)return;
 const input=form.querySelector('#roomText'),body=String(input?.value||'').trim();
 if(!body)return;
 if(s.expiresCooldown>Date.now()){toast('Aguarde o intervalo de 5 segundos.',true);return;}
 s.busy=true;const btn=form.querySelector('[type="submit"]');if(btn)btn.disabled=true;
 try{
  const {error}=await db.rpc('entre_room_send',{_room:s.room,_body:body});
  if(error)throw error;
  input.value='';s.expiresCooldown=Date.now()+5000;
  await load();
 }catch(e){toast(infoError(e),true);if(/5 segundos/.test(e.message||''))s.expiresCooldown=Date.now()+5000;}
 finally{s.busy=false;if(btn?.isConnected)btn.disabled=false;paint();}
}
document.addEventListener('submit',e=>{if(e.target?.id!=='roomChatForm')return;e.preventDefault();void send(e.target);});
document.addEventListener('change',e=>{
 if(e.target?.id==='roomsStateSelect'){s.state=e.target.value;s.city='';s.cities=[];void cities(s.state);return;}
 if(e.target?.id==='roomsCitySelect'){s.city=e.target.value;const btn=document.querySelector('[data-room-action="city"]');if(btn)btn.disabled=!s.city;}
});
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-room-action]');if(!b)return;
 const a=b.dataset.roomAction;
 if(a==='choose')roomChange('br');
 if(a==='state'&&UF.some(([uf])=>uf===s.state))roomChange('s:'+s.state.toLowerCase());
 if(a==='city'&&s.city&&s.cities.includes(s.city))roomChange('c:'+s.state.toLowerCase()+':'+clean(s.city));
 if(a==='more')void load(true);
 if(a==='delete'&&confirm('Apagar sua mensagem desta sala?')){
  void (async()=>{const {error}=await db.rpc('entre_room_delete_my_message',{_id:Number(b.dataset.id)});if(error)toast(infoError(error),true);else await load();})();
 }
});
window.entreRooms={view,enter,stop:()=>{if(s.refreshTimer)clearInterval(s.refreshTimer);s.refreshTimer=null;},roomChange,details:()=>({room:s.room,rows:s.rows.length})};
})();