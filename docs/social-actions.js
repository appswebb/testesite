
(function(){
const api=window.entreSocial;
let profileSequence=0,returnFocus=null;
async function openPerson(id,handle='',name='',preview=false){
 if(!state.session?.user||!state.profile||maintenanceIsActive()||state.suspension)return;
 const uid=state.session.user.id;
 if(!preview&&(id===uid||(!id&&handle&&handle===state.profile.username))){setConnectMenu(false);nav('profile');return;}
 const request=++profileSequence;
 try{
  let person=preview&&id===uid?state.profile:null;
  if(!person&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id||'')){
   person=await api.rpc('entre_profile_for_member',{_target:id});
  }else if(!person&&/^[a-z][a-z0-9_]{2,19}$/i.test(handle)){
   const rows=await api.rpc('entre_user_search',{_query:handle.toLowerCase()});
   person=(Array.isArray(rows)?rows:[]).find(p=>p.username===handle.toLowerCase());
  }
  if(request!==profileSequence||state.session?.user?.id!==uid)return;
  if(!person){toast('O perfil não está disponível.',true);return;}
  await Promise.allSettled([signAvatar(person),window.entreExtras?.loadBadges?.([person])]);
  if(request!==profileSequence||state.session?.user?.id!==uid)return;
  returnFocus=document.activeElement;
  setConnectMenu(false);api.data.socialProfile=person;state.modal='socialProfile';
  document.getElementById('modalBackdrop')?.remove();
  document.getElementById('app').insertAdjacentHTML('beforeend',api.profileModal());
  document.querySelector('#modalBackdrop [data-action="closemodal"]')?.focus({preventScroll:true});
  if(person.id!==uid)void window.connectProfileVisits?.record?.(person.id);
 }catch(error){if(request===profileSequence)toast('Não foi possível abrir esse perfil.',true);}
}
window.connectProfileReturnFocus=()=>{if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;};
function target(event){
 const el=event.target.closest?.('[data-cp-user],[data-avatar-id]');
 if(!el||el.closest('.cp-visitor,.pi-avatar-wrap,.cn-account-trigger,.cn-side-profile,.cn-account-head,.cn-dock,.auth-shell,.avatar-uploader,.crop-dialog'))return null;
 const id=el.dataset.cpUser||el.dataset.avatarId||'',handle=el.dataset.cpHandle||'';
 const name=el.classList.contains('cp-person-link')?el.textContent.trim():el.querySelector('img')?.alt?.replace(/^Foto de /,'')||'';
 return id||handle?{el,id,handle,name}:null;
}
document.addEventListener('click',event=>{
 const p=target(event);if(!p)return;
 event.preventDefault();event.stopImmediatePropagation();void openPerson(p.id,p.handle,p.name);
},true);
document.addEventListener('keydown',event=>{
 if(!['Enter',' '].includes(event.key)||event.repeat)return;
 const p=target(event);if(!p||p.el!==event.target)return;
 event.preventDefault();event.stopImmediatePropagation();void openPerson(p.id,p.handle,p.name);
},true);
function decorate(){
 document.querySelectorAll('#app [data-cp-user],#app [data-avatar-id],#commentsOverlay [data-cp-user]').forEach(el=>{
  if(!target({target:el}))return;
  el.classList.add('cp-profile-target');
  if(!el.closest('button,a,[role=button]')){el.tabIndex=0;el.setAttribute('role','link');el.setAttribute('aria-label','Abrir perfil'+(el.classList.contains('cp-person-link')?' de '+el.textContent.trim():''));}
 });
}
document.addEventListener('DOMContentLoaded',()=>{const app=document.getElementById('app');if(app)new MutationObserver(decorate).observe(app,{childList:true,subtree:true});decorate()},{once:true});
api.openPerson=openPerson;

async function action(type,btn){
 const id=btn?.dataset.id,call=api.rpc;
 try{
 if(type.startsWith('bulletin')&&api.bulletinAction)return await api.bulletinAction(type,btn);
 if(type==='onlineVisibility'||type==='onlineDirect'){
  if(!api.data.presenceReady||btn.disabled)return true;const owner=state.session?.user?.id;btn.disabled=true;
  const p=api.data.presence;
  const v=type==='onlineVisibility'?!p.visible:!!p.visible,d=type==='onlineDirect'?!p.allow_requests:!!p.allow_requests;
  try{const result=await call('entre_online_settings',{_visible:v,_allow_requests:d});if(state.session?.user?.id===owner){api.data.presence={...p,...result};api.data.presenceReady=true;if(state.view==='settings')renderView();void window.connectRealtime?.refreshCount?.(true);}return true;}finally{if(btn.isConnected)btn.disabled=false;}
 }
 if(type==='onlineMore'||type==='onlineRestart'){await api.loadOnline(type==='onlineRestart');renderView();return true;}
 if(type==='profileOpen'){
  await openPerson(id,btn?.dataset.cpHandle||'');return true;
 }
 if(type==='socialFollow'){
  const r=await call('entre_follow_request',{_target:id});
  toast(r?.status==='accepted'?'Vocês já se seguem.':r?.status==='pending'?'Pedido já enviado. Aguarde o aceite.':'Pedido enviado. Aguarde o aceite.');
   for(const person of(api.data.peopleResults||[])){if(person.id===id)person.follow_status=r?.status||'pending';}
  state.modal=null;render();return true;
 }
 if(type==='socialChat'){
  const r=await call('entre_chat_request',{_target:id});
  if(r?.status==='blocked'){toast(r.message||'Não aceita solicitações de estranhos.',true);return true;}
  if(r?.status==='open'&&r.pair_id){state.modal=null;await loadPairs();await openPair(r.pair_id);}
  else toast(r?.status==='pending'?'Convite enviado. Aguarde o aceite.':'Solicitação indisponível.',r?.status!=='pending');
  return true;
 }
 if(type==='followAccept'||type==='followDecline'){
  const r=await call('entre_follow_respond',{_follower:id,_accept:type==='followAccept'});
  await api.refreshInbox();
  if(r?.pair_id){await loadPairs();toast('Solicitação aceita. Já podem conversar!',false,'match');}else toast('Solicitação recusada.',false,'end');
  renderView();return true;
 }
 if(type==='chatAccept'||type==='chatDecline'){
  const r=await call('entre_chat_respond',{_request:Number(id),_accept:type==='chatAccept'});
  await api.refreshInbox();
  if(r?.pair_id){await loadPairs();await openPair(r.pair_id);}else{renderView();toast('Solicitação recusada.');}
  return true;
 }
 if(type==='conversationDeletePrompt'){
  if(!state.pairs.some(p=>p.id===id&&p.status==='connected')){toast('Conversa indisponível.',true);return true;}
  api.data.deleteConversationId=id;state.modal='deleteConversation';render();return true;
 }
 if(type==='conversationDeleteConfirm'){
  const pairId=api.data.deleteConversationId;
  if(!pairId)return true;
  await call('entre_conversation_delete',{_pair:pairId});
  api.data.deleteConversationId=null;state.modal=null;
  await api.loadPrefs();
  if(state.pair?.id===pairId){
   state.pair=null;state.peer=null;state.messages=[];
   if(state.channel){db.removeChannel(state.channel);state.channel=null;}
  }
  nav('conversations');
  toast('Conversa apagada apenas da sua conta.',false,'delete');
  return true;
 }
 if(type==='conversationPin'||type==='conversationUnpin'||type==='conversationArchive'||type==='conversationRestore'){
  if(!state.pairs.some(p=>p.id===id&&p.status==='connected')){toast('Só conversas após um match podem ser organizadas.',true);return true;}
  const p=type.includes('Pin')||type.includes('Unpin')?{_pinned:type==='conversationPin'}:{_archived:type==='conversationArchive'};
  await api.updateConversation(id,p);
  if(type==='conversationArchive')toast('Arquivada. As mensagens vencem após 10 dias sem atividade.');
  renderView();return true;
 }
 if(type==='convoFilter'){api.data.filter=btn.dataset.value||'all';renderView();return true;}
 if(type==='notificationsDismiss'){
  await call('entre_notifications_clear',{_id:Number(id)});
  await api.refreshNotifications();
  toast('Notificação removida.',false,'delete');return true;
 }
 if(type==='notificationsClear'){
  if(!confirm('Limpar todas as notificações? Elas não poderão ser recuperadas.'))return true;
  await call('entre_notifications_clear');
  await api.refreshNotifications();toast('Notificações limpas.',false,'delete');return true;
 }
 if(type==='notificationsRead'){await call('entre_notifications_read');await api.refreshNotifications();renderView();return true;}
 if(type==='notificationsMore'){await api.refreshNotifications(api.data.notifications.at(-1)?.id||null);renderView();return true;}
 if(type==='notificationTab'){api.data.notificationTab=['bulletins','polls'].includes(btn.dataset.value)?btn.dataset.value:'personal';renderView();if(['bulletins','polls'].includes(api.data.notificationTab))await api.refreshBulletins?.();return true;}
 if(type==='notificationOpen'){
  await call('entre_notifications_read',{_until:Number(id)});
  if(Number(btn.dataset.bulletin)>0){api.data.notificationTab=btn.dataset.kind==='poll'?'polls':'bulletins';await api.refreshBulletins?.(true);nav('notifications');}else if(btn.dataset.pair){await loadPairs();await openPair(btn.dataset.pair);}else {api.data.notificationTab='personal';if(state.view!=='notifications')nav('notifications');else renderView();}
  await api.refreshNotifications();return true;
 }
 if(type==='notificationsPermission'){
  if(!('Notification'in window)){toast('Este navegador não oferece notificações.',true);return true;}
  const res=await Notification.requestPermission();toast(res==='granted'?'Avisos do navegador ativados.':'Permissão não concedida.');return true;
 }
 if(type==='messagesOlder'){await api.olderMessages?.();return true;}
 return false;
 }catch(e){toast(infoError(e),true);return true;}
}
Object.assign(api,{action});
})();
