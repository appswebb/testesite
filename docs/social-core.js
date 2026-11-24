
window.entreSocial=(function(){
'use strict';
const data={presence:{visible:false,allow_requests:false},online:[],offset:0,hasMore:false,loaded:false,busy:false,follows:[],chats:[],prefs:{},notifications:[],unread:0,notiMore:false,notiBusy:false,filter:'all',started:false,hasEarlier:false};
async function rpc(name,params){const r=await db.rpc(name,params||{});if(r.error)throw r.error;return r.data;}
const pref=p=>data.prefs[p.id]||{folder:p.origin==='online'?'online':'live',pinned:false,archived_at:null};
const isHidden=id=>Boolean(data.prefs[id]?.hidden_at);
async function loadPrefs(){try{const rows=await rpc('entre_conversation_list');data.prefs={};for(const p of(Array.isArray(rows)?rows:[])){if(p?.pair_id)data.prefs[p.pair_id]=p;}}catch(e){console.warn('Prefs',e);}}
async function loadOnline(reset=false){
 if(data.busy)return;data.busy=true;
 try{
  const offset=reset?0:data.offset+data.online.length;if(offset>240){data.hasMore=false;return;}
  const result=await rpc('entre_online_page',{_offset:offset,_limit:12});
  const people=Array.isArray(result?.rows)?result.rows:[];
  await Promise.all(people.filter(p=>p.avatar_path).map(p=>signAvatar(p).catch(()=>false)));
  await window.entreExtras?.loadBadges?.(people);
  if(reset){data.online=people;data.offset=0;}else{
   data.online=data.online.concat(people);
   if(data.online.length>36){data.online=data.online.slice(-36);data.offset=offset+people.length-data.online.length;}
  }
  data.hasMore=Boolean(result?.has_more);data.loaded=true;
 }catch(e){data.loaded=true;console.warn('Online page',e);}finally{data.busy=false;}
}
async function refreshInbox(){try{const r=await rpc('entre_social_inbox');data.follows=Array.isArray(r?.follows)?r.follows:[];data.chats=Array.isArray(r?.chats)?r.chats:[];if(state.view==='online')renderView();}catch(e){console.warn('Inbox',e);}}
async function refreshNotifications(before=null){
 if(data.notiBusy)return;data.notiBusy=true;
 try{
  const r=await rpc('entre_notifications_page',{_before:before});
  const rows=Array.isArray(r?.rows)?r.rows:[];
  const previous=data.notifications[0]?.id||0;if(before)data.notifications=data.notifications.concat(rows).slice(-45);else data.notifications=rows;
  if(!before&&previous>0&&rows[0]?.id>previous&&document.hidden&&'Notification' in window&&Notification.permission==='granted'){try{new Notification(rows[0]?.kind==='poll'?'entre. • Enquete obrigatória':rows[0]?.kind==='bulletin'?'entre. • Novo aviso oficial':'entre. • Nova atividade',{body:rows[0]?.kind==='poll'?'Uma enquete oficial está aguardando seu voto.':rows[0]?.kind==='bulletin'?'A administração publicou um novo comunicado.':'Você tem uma nova mensagem ou solicitação.',tag:'entre-social'});}catch(e){}}
  data.unread=Math.max(0,Math.min(99,Number(r?.unread)||0));data.notiMore=Boolean(r?.has_more);
  document.querySelectorAll('.toolbar-bell .social-unread').forEach(badge=>{badge.textContent=data.unread?String(data.unread):'';});
  if(state.view==='notifications')renderView();
 }catch(e){console.warn('Notifications',e);}finally{data.notiBusy=false;}
}
async function updateConversation(pairId,change){
 const r=await rpc('entre_conversation_update',{_pair:pairId,...change});
 if(r?.pair_id)data.prefs[r.pair_id]=r;return r;
}
async function init(){
 if(data.started||!state.session?.user||!state.profile)return;
 data.started=true;
 try{const r=await rpc('entre_online_ping');if(typeof r?.visible==='boolean')data.presence=r;}catch(e){console.warn(e);}
 await Promise.allSettled([loadPrefs(),refreshInbox(),refreshNotifications(),window.entreSocial?.refreshBulletins?.(true),loadOnline(true)]);if(state.view==='home')renderView();
 setInterval(async()=>{if(document.hidden||!state.session?.user||state.suspension||maintenanceIsActive())return;if(data.presence.visible){try{await rpc('entre_online_ping');}catch(e){}}if(['home','online'].includes(state.view)&&data.offset===0&&data.online.length<=12){await loadOnline(true);if(state.view==='home')renderView();}},45000);
 setInterval(async()=>{if(!state.session?.user||state.suspension||maintenanceIsActive())return;await refreshNotifications();if(state.view==='online'&&!document.hidden)await refreshInbox();if(!document.hidden)await window.entreSocial?.refreshBulletins?.(!['avisos','notifications'].includes(state.view));},20000);
 document.addEventListener('visibilitychange',async()=>{if(document.hidden||!state.session?.user||state.suspension)return;if(data.presence.visible){try{await rpc('entre_online_ping');}catch(e){}}await refreshNotifications();await window.entreSocial?.refreshBulletins?.(state.view!=='avisos');});
 document.addEventListener('change',async e=>{const select=e.target.closest('[data-social-folder]');if(!select)return;try{await updateConversation(select.dataset.socialFolder,{_folder:select.value});toast('Conversa movida.');renderView();}catch(error){toast(infoError(error),true);}});
}
async function enter(view){if(!state.session?.user||!state.profile)return;if(view==='online')await Promise.allSettled([loadOnline(true),refreshInbox()]);if(view==='home')await loadOnline(true);if(view==='notifications')await Promise.allSettled([refreshNotifications(),window.entreSocial?.refreshBulletins?.(true)]);if(view==='conversations')await loadPrefs();if(view==='avisos')await window.entreSocial?.refreshBulletins?.(true);renderView();}
return{data,rpc,pref,isHidden,init,enter,loadOnline,loadPrefs,refreshInbox,refreshNotifications,updateConversation,isArchived:id=>Boolean(data.prefs[id]?.archived_at)};
})();
