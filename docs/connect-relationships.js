/* Relationship management, per-conversation read cursors and native sharing. */
(()=>{
'use strict';
const api=window.entreSocial;
let sessionId=null, unread={}, running=false, lastMark='', lastSummary=null, modal=null, currentKind='followers', offset=0, generation=0;
const uid=()=>typeof state==='undefined'?null:state.session?.user?.id;
const reset=()=>{if(sessionId!==uid()){sessionId=uid();unread={};lastMark='';lastSummary=null;generation++;if(modal){modal.remove();modal=null;}}};
const rpc=(name,args={})=>api.rpc(name,args);
const total=()=>Object.values(unread).reduce((a,b)=>a+(Number(b)||0),0);
const fmt=n=>n>99?'99+':String(n||'');
function paintUnread(){
 document.querySelectorAll('[data-chat-unread]').forEach(el=>{const n=Number(unread[el.dataset.chatUnread]||0);el.hidden=!n;if(el.textContent!==fmt(n))el.textContent=fmt(n)});
 document.querySelectorAll('[data-chat-unread-total]').forEach(el=>{const n=total();el.hidden=!n;if(el.textContent!==fmt(n))el.textContent=fmt(n)});
}
async function markRead(){
 if(!uid()||document.hidden||state.view!=='chat'||state.pair?.status!=='connected'||state.modal)return;
 const list=document.getElementById('messageList');if(!list||list.scrollHeight-list.scrollTop-list.clientHeight>110)return;
 const id=state.pair.id,last=state.messages.at(-1)?.id;if(!last)return;
 const key=uid()+':'+id+':'+last;if(lastMark===key)return;
 await rpc('entre_chat_mark_read',{_pair:id,_last:last});if(uid()&&state.pair?.id===id)lastMark=key;
}
async function tick(){
 reset();if(!uid()||!state.profile||state.suspension||maintenanceIsActive()||running||document.hidden)return;
 const user=uid();running=true;
 try{await markRead();const result=await rpc('entre_chat_unread');if(uid()!==user)return;unread=result||{};paintUnread();}
 catch(error){console.warn('Unread refresh unavailable',error?.message)}finally{running=false}
}
function followButton(id,status){return '<button type="button" class="ui-btn btn-outline btn-sm" data-cp-follow="'+esc(id)+'" data-cp-follow-status="'+esc(status||'')+'">'+(status==='accepted'?'Seguindo':status==='pending'?'Cancelar pedido':'Seguir')+'</button>'}
function stats(id,own=false){return '<div class="cp-follow-stats" data-cp-stats="'+esc(id)+'">'+(own?'<button type="button" data-cp-list="followers"><strong>–</strong><span>Seguidores</span></button><button type="button" data-cp-list="following"><strong>–</strong><span>Seguindo</span></button><button type="button" data-cp-list="pending_in"><strong>•</strong><span>Solicitações</span></button>':'<div><strong>–</strong><span>Seguidores</span></div><div><strong>–</strong><span>Seguindo</span></div>')+'</div>'}
async function fillStats(el){
 if(el.dataset.loading)return;el.dataset.loading='1';const user=uid(),id=el.dataset.cpStats;
 try{const data=await rpc('entre_relationships',{_target:id});if(uid()!==user||!el.isConnected)return;
  const cells=el.querySelectorAll('strong');cells[0].textContent=String(data.followers);cells[1].textContent=String(data.following);
  const card=el.closest('.cp-visitor');const b=card?.querySelector('[data-cp-follow]');if(b){b.dataset.cpFollowStatus=data.outgoing||'';b.textContent=data.outgoing==='accepted'?'Seguindo':data.outgoing==='pending'?'Cancelar pedido':'Seguir';b.disabled=false;}
 }catch(error){delete el.dataset.loading;console.warn('Relationship summary unavailable',error?.message)}
}
function scan(){reset();if(!uid())return;document.querySelectorAll('[data-cp-stats]').forEach(fillStats);paintUnread();}
const labels={followers:'Seguidores',following:'Seguindo',pending_in:'Recebidas',pending_out:'Enviadas'};
function closeList(){generation++;if(modal){const el=modal;modal=null;el.remove()}}
function listMarkup(){return '<div class="cp-list-head"><strong>Conexões</strong><button type="button" data-cp-list-close aria-label="Fechar">'+ico('close',20)+'</button></div><nav class="cp-list-tabs" aria-label="Conexões">'+Object.entries(labels).map(([k,v])=>'<button type="button" data-cp-list="'+k+'" aria-pressed="'+(k===currentKind)+'">'+v+'</button>').join('')+'</nav><div class="cp-list-body" aria-live="polite"></div><button class="cp-list-more" type="button" data-cp-list-more hidden>Carregar mais</button>'}
async function loadList(kind,more=false){
 if(!uid()||!labels[kind])return;if(!modal){modal=document.createElement('section');modal.className='cp-list-overlay';modal.setAttribute('role','dialog');modal.setAttribute('aria-label','Conexões');document.body.append(modal);}
 const user=uid(),seq=++generation;currentKind=kind;if(!more){offset=0;modal.innerHTML=listMarkup();}
 const body=modal.querySelector('.cp-list-body'),next=modal.querySelector('[data-cp-list-more]');if(!more)body.textContent='Carregando…';next.hidden=true;
 try{const rows=await rpc('entre_relationships',{_target:user,_kind:kind,_offset:offset});if(seq!==generation||uid()!==user||!modal)return;
  const html=rows.map(p=>'<article class="cp-list-row"><button type="button" class="cp-list-person" data-cp-open="'+esc(p.id)+'" data-cp-username="'+esc(p.username)+'"><span class="cp-list-avatar">'+esc(initials(p.display_name))+'</span><span><strong>'+esc(p.display_name)+'</strong><small>@'+esc(p.username)+'</small></span></button><div class="cp-list-actions">'+(kind==='pending_in'?'<button type="button" data-cp-respond="yes" data-cp-id="'+esc(p.id)+'">Aceitar</button><button type="button" data-cp-respond="no" data-cp-id="'+esc(p.id)+'">Recusar</button>':'<button type="button" data-cp-follow-remove="'+esc(p.id)+'" data-cp-direction="'+(kind==='followers'?'incoming':'outgoing')+'">'+(kind==='followers'?'Remover':kind==='following'?'Deixar de seguir':'Cancelar')+'</button>')+'</div></article>').join('');
  if(more)body.insertAdjacentHTML('beforeend',html);else body.innerHTML=html||'<p class="cp-list-empty">Nada por aqui ainda.</p>';offset+=rows.length;next.hidden=rows.length<30;
 }catch(error){if(seq===generation&&modal)body.textContent='Não foi possível carregar. Tente novamente.';}
}
async function refreshRelationships(id,status){
 for(const p of [...api.data.online,...(api.data.peopleResults||[])])if(p.id===id&&status!==null)p.follow_status=status;
 if(api.data.socialProfile?.id===id&&status!==null)api.data.socialProfile.follow_status=status;
 document.querySelectorAll('[data-cp-follow]').forEach(b=>{if(b.dataset.cpFollow===id&&status!==null){b.dataset.cpFollowStatus=status||'';b.textContent=status==='accepted'?'Seguindo':status==='pending'?'Cancelar pedido':'Seguir';b.disabled=false;}});
 document.querySelectorAll('[data-cp-stats]').forEach(el=>{delete el.dataset.loading;void fillStats(el)});
 await api.refreshInbox();if(modal)await loadList(currentKind);void tick();
}
const url='https://appswebb.github.io/testesite/';
function shareView(){return '<section class="cp-app-share"><div class="cp-share-hero"><img src="./connect-glass.svg?v=showcase-v17" alt="" width="96" height="60"><span>CONNECT</span><h2>O próximo oi<br> começa aqui.</h2><p>Convide alguém para conhecer o CONNECT. Converse por texto ou vídeo, faça novas conexões e compartilhe momentos.</p></div><div class="cp-share-card"><strong>Compartilhe o aplicativo</strong><p>Envie o link para seus amigos.</p><div class="cp-share-url">'+url+'</div><button type="button" class="ui-btn btn-dark" data-cp-share="native">'+ico('arrow',18)+' Compartilhar</button><button type="button" class="ui-btn btn-outline" data-cp-share="copy">'+ico('link',18)+' Copiar link</button></div></section>'}
document.addEventListener('click',async e=>{
 const b=e.target.closest?.('[data-cp-follow],[data-cp-list],[data-cp-list-close],[data-cp-list-more],[data-cp-follow-remove],[data-cp-respond],[data-cp-open],[data-cp-share]');if(!b||b.disabled)return;
 e.preventDefault();e.stopImmediatePropagation();if(!uid()||state.suspension||maintenanceIsActive())return;
 if(api.requiredPoll?.()&&!activeEncounter()){toast('Primeiro, registre seu voto na enquete oficial.',true);return;}
 try{
 if(b.hasAttribute('data-cp-list-close'))return closeList();
 if(b.dataset.cpList)return void loadList(b.dataset.cpList);
 if(b.hasAttribute('data-cp-list-more'))return void loadList(currentKind,true);
 if(b.dataset.cpOpen){closeList();return void api.openPerson(b.dataset.cpOpen,b.dataset.cpUsername);}
 b.disabled=true;
 if(b.dataset.cpFollow){const id=b.dataset.cpFollow,status=b.dataset.cpFollowStatus;
 if(['accepted','pending'].includes(status)){await rpc('entre_follow_remove',{_target:id,_direction:'outgoing'});await refreshRelationships(id,'declined');toast(status==='pending'?'Pedido cancelado.':'Você deixou de seguir.');}
 else{const r=await rpc('entre_follow_request',{_target:id});await refreshRelationships(id,r.status);toast(r.status==='accepted'?'Seguindo.':'Solicitação enviada.');}}
 if(b.dataset.cpFollowRemove){await rpc('entre_follow_remove',{_target:b.dataset.cpFollowRemove,_direction:b.dataset.cpDirection});await refreshRelationships(b.dataset.cpFollowRemove,b.dataset.cpDirection==='outgoing'?'declined':null);toast('Conexão atualizada.');}
 if(b.dataset.cpRespond){await rpc('entre_follow_respond',{_follower:b.dataset.cpId,_accept:b.dataset.cpRespond==='yes'});await loadPairs();await refreshRelationships(b.dataset.cpId,null);toast('Solicitação atualizada.');}
 if(b.dataset.cpShare){if(b.dataset.cpShare==='native'&&navigator.share){await navigator.share({title:'CONNECT',text:'O próximo oi começa aqui.',url});}else{await navigator.clipboard.writeText(url);toast('Link copiado!');}}
 }catch(error){if(error?.name!=='AbortError')toast(infoError(error),true);}finally{b.disabled=false;}
},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal)closeList()});
let frame=0;function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;scan()})}
document.addEventListener('DOMContentLoaded',()=>{const root=document.getElementById('app');if(root)new MutationObserver(schedule).observe(root,{childList:true,subtree:true});setInterval(()=>void tick(),5000);document.addEventListener('visibilitychange',()=>void tick());schedule();},{once:true});
window.connectRelationships={stats,followButton,shareView,tick,unread:()=>unread,total};
})();