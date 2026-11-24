/* Realtime presence, account activity, and recovery after a mobile browser pause. */
(()=>{
'use strict';
let onlineSignature=null,feedDirty=false,roomTimer=0;let pairsDirty=false,pairsLoading=false;let publicChannel=null,accountChannel=null,account=null,count=null,countAt=0,started=false,pinging=false,counting=false,onlineBusy=false,onlineQueued=false,activityTimer=0,presenceTimer=0,resuming=false,lastPing=0,lastResume=0;
const ready=()=>typeof db!=='undefined'&&typeof state!=='undefined';
const uid=()=>ready()?state.session?.user?.id:null;
const member=()=>uid()&&state.profile&&!state.suspension&&!maintenanceIsActive();
const api=()=>window.entreSocial;
function paint(){
 const fresh=count!==null&&Date.now()-countAt<45000;
 document.querySelectorAll('[data-connect-online-count]').forEach(el=>{
  const value=fresh?String(count):'—';if(el.textContent!==value)el.textContent=value;
 });
}
async function refreshCount(){
 if(!ready()||counting||!navigator.onLine)return;counting=true;
 try{const {data,error}=await db.rpc('entre_online_count');if(error)throw error;count=Math.max(0,Number(data)||0);countAt=Date.now();}catch(e){console.warn('Online counter unavailable',e?.message)}finally{counting=false;paint()}
}
async function refreshOnline(){
 if(!member()||state.view!=='online'||document.hidden)return;
 if(document.querySelector('.cn-online-filter[open]')||api().data.offset>0||api().data.online.length>12)return;
 if(onlineBusy||api().data.busy){onlineQueued=true;return;}
 onlineBusy=true;const user=uid();
 try{const before=onlineSignature;await api().loadOnline(true);if(uid()!==user)return;
 const after=JSON.stringify(api().data.online.map(({last_seen,...p})=>({...p,recent:Date.now()-new Date(last_seen).getTime()>90000})));
 if(state.view==='online'&&!document.querySelector('.cn-online-filter[open]')&&before!==after){onlineSignature=after;renderView();}
 }finally{onlineBusy=false;if(onlineQueued){onlineQueued=false;setTimeout(refreshOnline,500)}}
}
function presenceEvent(){if(presenceTimer)return;presenceTimer=setTimeout(()=>{presenceTimer=0;void refreshCount();void refreshOnline()},100)}
async function ping(force=false){
 if(!member()||pinging||!navigator.onLine||(!force&&Date.now()-lastPing<15000))return;
 const user=uid();pinging=true;
 try{const r=await api().rpc('entre_online_ping');if(uid()===user){lastPing=Date.now();if(typeof r?.visible==='boolean')api().data.presence=r;}}
 catch(e){console.warn('Presence heartbeat unavailable',e?.message)}finally{pinging=false}
}
async function refreshPairsList(){if(!member()||pairsLoading||!pairsDirty||state.view!=='conversations'||document.querySelector('.cp-conversation-dialog[open]'))return;pairsLoading=true;pairsDirty=false;const user=uid();try{await loadPairs();if(uid()===user&&state.view==='conversations'&&!document.querySelector('.cp-conversation-dialog[open]'))renderView();}catch(e){pairsDirty=true;}finally{pairsLoading=false}}
function refreshFeed(){if(!feedDirty||!member()||state.view!=='posts'||document.hidden||state.modal||document.querySelector('#commentsOverlay,.post-compose textarea:focus,.post-compose input:focus')||document.querySelector('#postCreateForm textarea')?.value.trim()||window.scrollY>180||window.entreExtras?.data?.postLoading)return;feedDirty=false;void window.entreExtras?.loadPosts?.();}
function communityEvent(payload){if(payload.new?.kind==='rooms'){if(roomTimer)return;roomTimer=setTimeout(()=>{roomTimer=0;void window.entreRooms?.refresh?.()},60)}else if(payload.new?.kind==='feed'){feedDirty=true;refreshFeed()}else if(payload.new?.kind==='bulletins'){void refreshOfficial()}}
async function refreshOfficial(){if(!member())return;await Promise.allSettled([api().refreshNotifications(),api().refreshBulletins?.(false,true)]);}
function pairEvent(){pairsDirty=true;activity();void refreshPairsList()}
let privateTimer=0,privateKinds=new Set(),privateRunning=false;
function accountEvent(payload){if(payload.new?.user_id!==uid())return;const kind=payload.new?.kind;if(!['pair','premium'].includes(kind))return;privateKinds.add(kind);schedulePrivate();}
function schedulePrivate(){if(privateTimer||privateRunning)return;privateTimer=setTimeout(()=>{privateTimer=0;void flushPrivate()},40);}
async function flushPrivate(){if(privateRunning||!member())return;privateRunning=true;const user=uid(),kinds=new Set(privateKinds);privateKinds.clear();try{if(kinds.has('pair')){pairEvent();if(state.searching)await pollSearch();else if(state.pair?.id)await refreshPair();}if(uid()===user&&kinds.has('premium'))await refreshEntitlement(user);}catch(e){console.warn('Account sync unavailable',e?.message);}finally{privateRunning=false;if(privateKinds.size)schedulePrivate();}}
async function refreshEntitlement(user){if(!member()||uid()!==user)return;const extras=window.entreExtras,prior=extras?.isPremium?.(user);await extras?.refreshPremium?.();if(uid()!==user)return;const active=extras?.isPremium?.(user);if(!active)state.preference='any';if(active&&onboardingPlanPending()){await finishOnboarding(null);return;}if(prior!==active||state.view==='premium'){if(onboardingPlanPending())render();else if(['premium','connect','profile'].includes(state.view)&&!state.searching&&!activeEncounter())renderView();}if(state.view==='connect')void refreshSearchQuota();}
function activity(){if(activityTimer)return;activityTimer=setTimeout(()=>{activityTimer=0;if(!member())return;void api().refreshNotifications();void window.connectRelationships?.tick?.();if(state.view==='online')void api().refreshInbox();},120)}
function subscribe(){
 if(!ready())return;
 if(!publicChannel)publicChannel=db.channel('connect-public-count').on('postgres_changes',{event:'UPDATE',schema:'public',table:'entre_presence_signal',filter:'id=eq.1'},presenceEvent).on('postgres_changes',{event:'UPDATE',schema:'public',table:'connect_public_signal',filter:'id=eq.1'},()=>void maintenanceCheck(false)).subscribe(status=>{if(status==='SUBSCRIBED'){presenceEvent();void maintenanceCheck(false);}});
 const user=member()?uid():null;
 if(account===user)return;
 if(accountChannel){void db.removeChannel(accountChannel);accountChannel=null;}
 account=user;lastPing=0;pairsDirty=false;onlineSignature=null;privateKinds.clear();
 if(!user)return;
 accountChannel=db.channel('connect-account-'+user)
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'entre_community_signal'},communityEvent)
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'connect_account_signal',filter:'user_id=eq.'+user},accountEvent)
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'connect_account_signal',filter:'user_id=eq.'+user},accountEvent)
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'entre_notifications',filter:'user_id=eq.'+user},activity)
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'entre_notifications',filter:'user_id=eq.'+user},activity)
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'entre_messages'},activity)
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'entre_messages'},activity)
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'entre_pairs',filter:'a=eq.'+user},pairEvent)
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'entre_pairs',filter:'b=eq.'+user},pairEvent)
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'entre_pairs',filter:'a=eq.'+user},pairEvent)
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'entre_pairs',filter:'b=eq.'+user},pairEvent)
 .subscribe(status=>{if(status==='SUBSCRIBED'&&uid()===user){privateKinds.add('pair');privateKinds.add('premium');schedulePrivate();void refreshOfficial();}});
}
async function resume(){
 if(!ready()||resuming||!navigator.onLine)return;
 resuming=true;const user=uid();
 try{subscribe();await Promise.allSettled([ping(true),refreshCount()]);if(!member()||uid()!==user)return;
 await Promise.allSettled([api().refreshNotifications(),api().refreshBulletins?.(false,true),window.connectRelationships?.tick?.(),refreshOnline()]);
 void refreshEntitlement(user);if(state.view==='rooms')void window.entreRooms?.refresh?.();if(state.view==='posts'){feedDirty=true;refreshFeed();}
 if(state.pair?.id&&['chat','connect'].includes(state.view)){await refreshPair();if(state.pair?.id){await loadMessages();refreshEncounterMessages();}}
 }catch(e){console.warn('Reconnect sync',e?.message)}finally{resuming=false}
}
function onResume(){if(document.hidden||Date.now()-lastResume<1000)return;lastResume=Date.now();void resume()}
function start(){if(started)return;started=true;
 const root=document.getElementById('app');if(root)new MutationObserver(paint).observe(root,{childList:true,subtree:true});
 setInterval(()=>{if(!ready())return;subscribe();void ping();if(!document.hidden){void refreshCount();void refreshOnline();void refreshPairsList();refreshFeed()}paint()},15000);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)void ping(true);else onResume()});
 window.addEventListener('focus',onResume);window.addEventListener('pageshow',onResume);window.addEventListener('online',onResume);
 const boot=setInterval(()=>{if(ready()){clearInterval(boot);void resume()}},200);
}
async function depart(){if(!member())return;try{await api().rpc('entre_online_depart')}catch(e){console.warn('Presence departure unavailable',e?.message)}}
window.connectRealtime={resume,depart,paint,refreshCount};
document.addEventListener('DOMContentLoaded',start,{once:true});
})();