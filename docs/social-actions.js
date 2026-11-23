
(function(){
const api=window.entreSocial;
async function action(type,btn){
 const id=btn?.dataset.id,call=api.rpc;
 try{
 if(type==='onlineVisibility'||type==='onlineDirect'){
  const p=api.data.presence;
  const v=type==='onlineVisibility'?!p.visible:!!p.visible,d=type==='onlineDirect'?!p.allow_requests:!!p.allow_requests;
  const result=await call('entre_online_settings',{_visible:v,_allow_requests:d});
  api.data.presence={...p,...result};renderView();return true;
 }
 if(type==='onlineMore'||type==='onlineRestart'){await api.loadOnline(type==='onlineRestart');renderView();return true;}
 if(type==='socialFollow'){
  const r=await call('entre_follow_request',{_target:id});
  toast(r?.status==='accepted'?'Vocês já se seguem.':'Pedido enviado. Aguarde o aceite.');
  await api.loadOnline(true);renderView();return true;
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
 if(type==='conversationPin'||type==='conversationUnpin'||type==='conversationArchive'||type==='conversationRestore'){
  const p=type.includes('Pin')||type.includes('Unpin')?{_pinned:type==='conversationPin'}:{_archived:type==='conversationArchive'};
  await api.updateConversation(id,p);
  if(type==='conversationArchive')toast('Arquivada. As mensagens vencem após 10 dias sem atividade.');
  renderView();return true;
 }
 if(type==='convoFilter'){api.data.filter=btn.dataset.value||'all';renderView();return true;}
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
