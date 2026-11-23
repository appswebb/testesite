
window.entreSocial=(function(){
'use strict';
const data={presence:{visible:false,allow_requests:false},online:[],offset:0,hasMore:false,loaded:false,busy:false,follows:[],chats:[],prefs:{},notifications:[],unread:0,notiMore:false,notiBusy:false,filter:'all',started:false,hasEarlier:false};
async function rpc(name,params){const r=await db.rpc(name,params||{});if(r.error)throw r.error;return r.data;}
const pref=p=>data.prefs[p.id]||{folder:p.origin==='online'?'online':'live',pinned:false,archived_at:null};
async function loadPrefs(){try{const rows=await rpc('entre_conversation_list');data.prefs={};for(const p of(Array.isArray(rows)?rows:[])){if(p?.pair_id)data.prefs[p.pair_id]=p;}}catch(e){console.warn('Prefs',e);}}
async function loadOnline(reset=false){
 if(data.busy)return;data.busy=true;
 try{
  const offset=reset?0:data.offset+data.online.length;if(offset>240){data.hasMore=false;return;}
  const result=await rpc('entre_online_page',{_offset:offset,_limit:12});
  const people=Array.isArray(result?.rows)?result.rows:[];
  await Promise.all(people.filter(p=>p.avatar_path).map(p=>signAvatar(p).catch(()=>false)));
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
  if(before)data.notifications=data.notifications.concat(rows).slice(-45);else data.notifications=rows;
  data.unread=Math.max(0,Math.min(99,Number(r?.unread)||0));data.notiMore=Boolean(r?.has_more);
  document.querySelectorAll('[data-view="notifications"]').forEach(el=>{el.classList.toggle('has-unread',data.unread>0);const badge=el.querySelector('.social-unread');if(badge)badge.textContent=data.unread?String(data.unread):'';});
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
 await Promise.allSettled([loadPrefs(),refreshInbox(),refreshNotifications()]);
 setInterval(async()=>{if(document.hidden||!state.session?.user||state.suspension||maintenanceIsActive())return;try{await rpc('entre_online_ping');}catch(e){}if(state.view==='online')await loadOnline(true);},45000);
 setInterval(async()=>{if(document.hidden||!state.session?.user||state.suspension||maintenanceIsActive())return;await refreshNotifications();if(state.view==='online')await refreshInbox();},20000);
 document.addEventListener('visibilitychange',async()=>{if(document.hidden||!state.session?.user||state.suspension)return;try{await rpc('entre_online_ping');}catch(e){}await refreshNotifications();});
 document.addEventListener('change',async e=>{const select=e.target.closest('[data-social-folder]');if(!select)return;try{await updateConversation(select.dataset.socialFolder,{_folder:select.value});toast('Conversa movida.');}catch(error){toast(infoError(error),true);}});
}
async function enter(view){if(!state.session?.user||!state.profile)return;if(view==='online')await Promise.allSettled([loadOnline(true),refreshInbox()]);if(view==='notifications')await refreshNotifications();if(view==='conversations')await loadPrefs();renderView();}
return{data,rpc,pref,init,enter,loadOnline,loadPrefs,refreshInbox,refreshNotifications,updateConversation,isArchived:id=>Boolean(data.prefs[id]?.archived_at)};
})();
