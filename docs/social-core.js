
window.entreSocial=(function(){
'use strict';
const data={presence:{visible:false,allow_requests:false},online:[],offset:0,hasMore:false,loaded:false,onlineError:false,busy:false,follows:[],chats:[],prefs:{},notifications:[],unread:0,notiMore:false,notiBusy:false,filter:'all',started:false,hasEarlier:false};
async function rpc(name,params){const r=await db.rpc(name,params||{});if(r.error){if(r.status===0||r.status>=500||/^(08|53|XX)/.test(r.error.code||''))window.connectAccountData?.recordError?.(r.status===0?'network':'database');throw r.error;}return r.data;}
const pref=p=>data.prefs[p.id]||{folder:p.origin==='online'?'online':'live',pinned:false,archived_at:null};
const isHidden=id=>Boolean(data.prefs[id]?.hidden_at);
async function loadPrefs(){const owner=state.session?.user?.id;if(!owner)return;try{const rows=await rpc('entre_conversation_list');if(state.session?.user?.id!==owner)return;data.prefs={};for(const p of(Array.isArray(rows)?rows:[])){if(p?.pair_id)data.prefs[p.pair_id]=p;}}catch(e){console.warn('Prefs',e);}}
async function loadOnline(reset=false){
 if(data.busy)return;data.busy=true;data.onlineError=false;
 try{
  const offset=reset?0:data.offset+data.online.length;const account=state.session?.user?.id;if(!account)return;if(offset>240){data.hasMore=false;return;}
  const result=await rpc('entre_online_page',{_offset:offset,_limit:12});
  if(state.session?.user?.id!==account)return;const people=Array.isArray(result?.rows)?result.rows:[];
  await Promise.all(people.filter(p=>p.avatar_path).map(p=>signAvatar(p).catch(()=>false)));
  await window.entreExtras?.loadBadges?.(people);
  if(state.session?.user?.id!==account)return;
  if(reset){data.online=people;data.offset=0;}else{
   data.online=data.online.concat(people);
   if(data.online.length>36){data.online=data.online.slice(-36);data.offset=offset+people.length-data.online.length;}
  }
  data.hasMore=Boolean(result?.has_more);data.loaded=true;
 }catch(e){data.loaded=true;data.onlineError=true;console.warn('Online page',e);}finally{data.busy=false;}
}
async function refreshInbox(){const owner=state.session?.user?.id;if(!owner)return;try{const r=await rpc('entre_social_inbox');if(state.session?.user?.id!==owner)return;data.follows=Array.isArray(r?.follows)?r.follows:[];data.chats=Array.isArray(r?.chats)?r.chats:[];if(state.view==='online'&&!document.querySelector('.cn-online-filter[open]'))renderView();}catch(e){console.warn('Inbox',e);}}
// Foreground-only banners: never replay the offline backlog.
let foregroundSince=Date.now(),bannerUser=null,bannerReady=false,bannerTimer=0,bannerQueue=[],bannerSeen=new Set();
const importantKinds=new Set(['poll','bulletin','follow','follow_accepted','chat_request','chat_accepted','message','matched','account_restored','account_suspended','retention','system']);
function foreground(){return !document.hidden&&navigator.onLine&&Boolean(state.session?.user&&state.profile&&!state.suspension&&!maintenanceIsActive()&&document.querySelector('.cn-shell'));}
function resetForeground(){foregroundSince=Date.now();bannerQueue=[];clearTimeout(bannerTimer);bannerTimer=0;document.getElementById('connectForegroundNotice')?.remove();}
document.addEventListener('visibilitychange',resetForeground);
window.addEventListener('offline',resetForeground);window.addEventListener('online',resetForeground);
function showForegroundNotice(){
 if(!foreground()){bannerQueue=[];return;}
 if(bannerTimer||!bannerQueue.length)return;
 const n=bannerQueue.shift(),el=document.createElement('aside');el.id='connectForegroundNotice';el.className='connect-foreground-notice';el.setAttribute('role','status');
 const official=n.kind==='poll'||n.kind==='bulletin';el.dataset.official=String(official);el.dataset.notificationId=String(n.id);
 el.innerHTML='<span class="connect-fg-icon">'+ico(official?'megaphone':'bell',19)+'</span><button type="button" class="connect-fg-copy"><strong>'+esc(n.kind==='poll'?'Nova enquete':n.kind==='bulletin'?'Novo aviso':'Notificação')+'</strong><small>'+esc(window.entreSocial?.summary?.(n)||'Você tem uma novidade.')+'</small></button><button type="button" class="connect-fg-close" aria-label="Fechar aviso">'+ico('close',16)+'</button>';
 const done=()=>{clearTimeout(bannerTimer);bannerTimer=0;el.remove();showForegroundNotice();};
 el.querySelector('.connect-fg-close').onclick=done;
 el.querySelector('.connect-fg-copy').onclick=()=>{data.notificationTab=n.kind==='poll'?'polls':n.kind==='bulletin'?'bulletins':'personal';nav('notifications');done();};
 document.body.appendChild(el);bannerTimer=setTimeout(done,5000);
}
function foregroundNotifications(rows,user){
 if(user!==bannerUser){resetForeground();bannerUser=user;bannerReady=false;bannerSeen.clear();}
 if(!bannerReady){rows.forEach(n=>bannerSeen.add(n.id));bannerReady=true;return;}
 const fresh=rows.filter(n=>!bannerSeen.has(n.id)&&!n.read_at&&importantKinds.has(n.kind)&&Date.parse(n.created_at)>=foregroundSince);
 rows.forEach(n=>bannerSeen.add(n.id));if(bannerSeen.size>300)bannerSeen=new Set(rows.map(n=>n.id));
 if(!foreground())return;
 if(fresh.some(n=>n.kind==='poll'||n.kind==='bulletin'))void window.entreSocial?.refreshBulletins?.();
 bannerQueue.push(...fresh.reverse().slice(-5));bannerQueue=bannerQueue.slice(-5);showForegroundNotice();
}
let notificationsQueued=false;
async function refreshNotifications(before=null){
 if(data.notiBusy){if(!before)notificationsQueued=true;return;}if(!state.session?.user)return;data.notiBusy=true;const user=state.session.user.id;
 try{
  const r=await rpc('entre_notifications_page',{_before:before});
  if(state.session?.user?.id!==user)return;
  const rows=Array.isArray(r?.rows)?r.rows:[];
  const previous=data.notifications[0]?.id||0;if(before)data.notifications=data.notifications.concat(rows).slice(-45);else data.notifications=rows;
  if(!before){const ids=new Set(rows.map(n=>n.id));bannerQueue=bannerQueue.filter(n=>!['bulletin','poll'].includes(n.kind)||ids.has(n.id));const banner=document.getElementById('connectForegroundNotice');if(banner?.dataset.official==='true'&&!ids.has(Number(banner.dataset.notificationId))){clearTimeout(bannerTimer);bannerTimer=0;banner.remove();showForegroundNotice();}foregroundNotifications(rows,user);}
  data.unread=Math.max(0,Math.min(99,Number(r?.unread)||0));data.notiMore=Boolean(r?.has_more);
  document.querySelectorAll('.toolbar-bell .social-unread').forEach(badge=>{badge.textContent=data.unread?String(data.unread):'';});
  if(state.view==='notifications'&&!['bulletins','polls'].includes(data.notificationTab))renderView();
 }catch(e){console.warn('Notifications',e);}finally{data.notiBusy=false;if(notificationsQueued){notificationsQueued=false;void refreshNotifications();}}
}
async function updateConversation(pairId,change){
 const r=await rpc('entre_conversation_update',{_pair:pairId,...change});
 if(r?.pair_id)data.prefs[r.pair_id]=r;return r;
}
let socialOwner=null,initializedOwner=null;
function resetAccount(){const owner=state.session?.user?.id||null;if(socialOwner===owner)return;socialOwner=owner;initializedOwner=null;Object.assign(data,{presence:{visible:false,allow_requests:false},online:[],offset:0,hasMore:false,loaded:false,onlineError:false,follows:[],chats:[],prefs:{},notifications:[],unread:0,notiMore:false,hasEarlier:false,bulletins:[],pendingPoll:null,bulletinLoaded:false,bulletinError:'',bulletinSignature:'',notificationTab:'personal'});resetForeground();}
async function init(){
 resetAccount();const owner=state.session?.user?.id;if(!owner||!state.profile||initializedOwner===owner)return;initializedOwner=owner;
 await window.connectRealtime?.resume?.();
 await Promise.allSettled([loadPrefs(),refreshInbox(),refreshNotifications(),...(!window.connectRealtime?[window.entreSocial?.refreshBulletins?.(true)]:[])]);
 if(data.started)return;data.started=true;
 setInterval(async()=>{if(document.hidden||!state.session?.user||state.suspension||maintenanceIsActive()||window.connectAccountData?.pending?.())return;await refreshNotifications();if(state.view==='online'&&!document.hidden)await refreshInbox();if(!document.hidden)await window.entreSocial?.refreshBulletins?.(!['avisos','notifications'].includes(state.view));},60000);
 document.addEventListener('change',async e=>{const select=e.target.closest('[data-social-folder]');if(!select)return;try{await updateConversation(select.dataset.socialFolder,{_folder:select.value});toast('Conversa movida.');renderView();}catch(error){toast(infoError(error),true);}});
}
async function enter(view){if(!state.session?.user||!state.profile)return;if(view==='online')await Promise.allSettled([loadOnline(true),refreshInbox()]);if(view==='notifications')await Promise.allSettled([refreshNotifications(),window.entreSocial?.refreshBulletins?.(true)]);if(view==='conversations')await loadPrefs();if(view==='avisos')await window.entreSocial?.refreshBulletins?.(true);renderView();}
return{data,rpc,pref,isHidden,init,resetAccount,enter,loadOnline,loadPrefs,refreshInbox,refreshNotifications,resetForeground,updateConversation,isArchived:id=>Boolean(data.prefs[id]?.archived_at)};
})();
