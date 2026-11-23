
(function(){
const api=window.entreSocial;
async function action(type,btn){
 const id=btn?.dataset.id,call=api.rpc;
 try{
 if(type.startsWith('bulletin')&&api.bulletinAction)return await api.bulletinAction(type,btn);
 if(type==='onlineVisibility'||type==='onlineDirect'){
  const p=api.data.presence;
  const v=type==='onlineVisibility'?!p.visible:!!p.visible,d=type==='onlineDirect'?!p.allow_requests:!!p.allow_requests;
  const result=await call('entre_online_settings',{_visible:v,_allow_requests:d});
  api.data.presence={...p,...result};renderView();return true;
 }
 if(type==='onlineMore'||type==='onlineRestart'){await api.loadOnline(type==='onlineRestart');renderView();return true;}
 if(type==='profileOpen'){
  const person=[...Object.values(state.pairsProfiles||{}),...api.data.online].find(p=>p?.id===id);
  if(!person){toast('O perfil não está mais disponível.',true);return true;}
  api.data.socialProfile=person;state.modal='socialProfile';render();return true;
 }
 if(type==='socialFollow'){
  const r=await call('entre_follow_request',{_target:id});
  toast(r?.status==='accepted'?'Vocês já se seguem.':'Pedido enviado. Aguarde o aceite.');
  state.modal=null;await api.loadOnline(true);render();return true;
 }
 if(type==='socialChat'){
  const r=await call('entre_chat_request',{_target:id});
  if(r?.status==='blocked'){toast(r.message||'Não aceita solicitações de estranhos.',true);return true;}
  if(r?.status==='open'&&r.pair_id){await loadPairs();await openPair(r.pair_id);}
  else toast(r?.status==='pending'?'Convite enviado. Aguarde o aceite.':'Solicitação indisponível.',r?.status!=='pending');
  return true;
 }
 if(type==='followAccept'||type==='followDecline'){
  const r=await call('entre_follow_respond',{_follower:id,_accept:type==='followAccept'});
  await api.refreshInbox();
  if(r?.pair_id){await loadPairs();toast('Solicitação aceita. Já podem conversar!');}else toast('Solicitação recusada.');
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
  toast('Conversa apagada apenas da sua conta.');
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
  toast('Notificação removida.');return true;
 }
 if(type==='notificationsClear'){
  if(!confirm('Limpar todas as notificações? Elas não poderão ser recuperadas.'))return true;
  await call('entre_notifications_clear');
  await api.refreshNotifications();toast('Notificações limpas.');return true;
 }
 if(type==='notificationsRead'){await call('entre_notifications_read');await api.refreshNotifications();renderView();return true;}
 if(type==='notificationsMore'){await api.refreshNotifications(api.data.notifications.at(-1)?.id||null);renderView();return true;}
 if(type==='notificationOpen'){
  await call('entre_notifications_read',{_until:Number(id)});
  if(btn.dataset.pair){await loadPairs();await openPair(btn.dataset.pair);}else nav('online');
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
