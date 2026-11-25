/* Realtime presence, account activity, and recovery after a mobile browser pause. */
(()=>{
'use strict';
let onlineSignature=null,feedDirty=false,roomTimer=0,accountTotal=null,accountTotalAt=0,accountTotalBusy=false;let pairsDirty=false,pairsLoading=false;let publicChannel=null,accountChannel=null,account=null,count=null,countAt=0,started=false,pinging=false,counting=false,onlineBusy=false,onlineQueued=false,activityTimer=0,presenceTimer=0,resuming=false,lastPing=0,lastResume=0,lastOnline=0,lastEntitlement=0,countDirty=false,onlineDirty=false,counterFrame=0,lastPairsRefresh=0,pairsTimer=0,inboxDirty=false;
const ready=()=>typeof db!=='undefined'&&typeof state!=='undefined';
const uid=()=>ready()?state.session?.user?.id:null;
const member=()=>uid()&&state.profile&&!state.suspension&&!maintenanceIsActive()&&!window.connectAccountData?.pending?.();
const visible=()=>!document.hidden;
const hasCounters=()=>Boolean(document.querySelector('[data-connect-online-count],[data-connect-account-count]'));
const essential=()=>ready()&&(state.searching||Boolean(state.pair?.status==='active')||Boolean(window.entreLives?.isActive?.()));
const api=()=>window.entreSocial;
function paint(){
 const fresh=count!==null&&Date.now()-countAt<90000;
 document.querySelectorAll('[data-connect-account-count]').forEach(el=>{const value=accountTotal===null?'—':accountTotal.toLocaleString('pt-BR');if(el.textContent!==value)el.textContent=value;});
 document.querySelectorAll('[data-connect-online-count]').forEach(el=>{
  const value=fresh?count.toLocaleString('pt-BR'):'—';if(el.textContent!==value)el.textContent=value;
 });
}
async function refreshAccounts(force=false){if(!ready()||!visible()||!hasCounters()||!navigator.onLine||accountTotalBusy||(!force&&Date.now()-accountTotalAt<119000))return;accountTotalBusy=true;try{const {data,error}=await db.rpc('connect_public_account_count');if(error)throw error;if(data===null||!Number.isFinite(Number(data)))throw Error('Invalid account count');accountTotal=Math.max(0,Number(data));accountTotalAt=Date.now();}catch(e){console.warn('Account counter unavailable',e?.message)}finally{accountTotalBusy=false;paint();}}
async function refreshCount(force=false){
 if(!ready()||!visible()||!hasCounters()||!navigator.onLine)return;
 void refreshAccounts();
 if(counting||(!force&&Date.now()-countAt<29000))return;counting=true;countDirty=false;
 try{const {data,error}=await db.rpc('entre_online_count');if(error)throw error;count=Math.max(0,Number(data)||0);countAt=Date.now();}catch(e){console.warn('Online counter unavailable',e?.message)}finally{counting=false;paint()}
}
async function refreshOnline(force=false){
 if(!member()||state.view!=='online'||!visible()||(!force&&Date.now()-lastOnline<30000))return;
 if(document.querySelector('.cn-online-filter[open]')||api().data.offset>0||api().data.online.length>12)return;
 if(onlineBusy||api().data.busy){onlineQueued=true;return;}
 onlineBusy=true;onlineDirty=false;lastOnline=Date.now();const user=uid();
 try{const before=onlineSignature;await api().loadOnline(true);if(uid()!==user)return;
 const after=JSON.stringify(api().data.online.map(({last_seen,...p})=>({...p,recent:Date.now()-new Date(last_seen).getTime()>90000})));
 if(state.view==='online'&&!document.querySelector('.cn-online-filter[open]')&&before!==after){onlineSignature=after;renderView();}
 }finally{onlineBusy=false;if(onlineQueued){onlineQueued=false;setTimeout(()=>void refreshOnline(),500)}}
}
function presenceEvent(){countDirty=true;onlineDirty=true;if(!visible()||presenceTimer)return;const delay=Math.max(750,3000-(Date.now()-Math.max(hasCounters()?countAt:0,state.view==='online'?lastOnline:0)));presenceTimer=setTimeout(()=>{presenceTimer=0;if(!visible())return;if(countDirty&&Date.now()-countAt>=3000)void refreshCount(true);if(onlineDirty&&Date.now()-lastOnline>=3000)void refreshOnline(true)},delay)}
async function ping(force=false){
 if(!member()||(!visible()&&!essential())||pinging||!navigator.onLine||(!force&&Date.now()-lastPing<29000))return;
 const user=uid();pinging=true;
 try{const r=await api().rpc('entre_online_ping');if(uid()===user){lastPing=Date.now();if(typeof r?.visible==='boolean')api().data.presence=r;}}
 catch(e){console.warn('Presence heartbeat unavailable',e?.message)}finally{pinging=false}
}
async function refreshPairsList(){if(!member()||!visible()||pairsLoading||!pairsDirty||state.view!=='conversations'||document.querySelector('.cp-conversation-dialog[open]'))return;if(Date.now()-lastPairsRefresh<1500){if(!pairsTimer)pairsTimer=setTimeout(()=>{pairsTimer=0;void refreshPairsList()},1500-(Date.now()-lastPairsRefresh));return;}lastPairsRefresh=Date.now();pairsLoading=true;pairsDirty=false;const user=uid();try{await loadPairs();if(uid()===user&&state.view==='conversations'&&!document.querySelector('.cp-conversation-dialog[open]'))renderView();}catch(e){pairsDirty=true;}finally{pairsLoading=false;if(pairsDirty&&member()&&visible()&&state.view==='conversations'&&!pairsTimer)pairsTimer=setTimeout(()=>{pairsTimer=0;void refreshPairsList()},1500);}}
function refreshFeed(){if(!feedDirty||!member()||state.view!=='posts'||document.hidden||state.modal||document.querySelector('#commentsOverlay,.post-compose textarea:focus,.post-compose input:focus')||document.querySelector('#postCreateForm textarea')?.value.trim()||window.scrollY>180||window.entreExtras?.data?.postLoading)return;feedDirty=false;void window.entreExtras?.loadPosts?.();}
function communityEvent(payload){if(payload.new?.kind==='rooms'){if(!visible()||state.view!=='rooms'||roomTimer)return;roomTimer=setTimeout(()=>{roomTimer=0;if(visible())void window.entreRooms?.refresh?.()},350)}else if(payload.new?.kind==='feed'){feedDirty=true;refreshFeed()}else if(payload.new?.kind==='bulletins'&&visible()){void refreshOfficial()}}
async function refreshOfficial(){if(!member()||!visible())return;await Promise.allSettled([api().refreshNotifications(),api().refreshBulletins?.(false,true)]);}
function pairEvent(){pairsDirty=true;if(visible()){void window.connectRelationships?.tick?.();void refreshPairsList()}}
let privateTimer=0,privateKinds=new Set(),privateRunning=false;
function accountEvent(payload){if(payload.new?.user_id!==uid())return;const kind=payload.new?.kind;if(!['pair','premium','message'].includes(kind))return;privateKinds.add(kind);schedulePrivate();}
function schedulePrivate(){if(privateTimer||privateRunning)return;privateTimer=setTimeout(()=>{privateTimer=0;void flushPrivate()},40);}
async function flushPrivate(){if(privateRunning||!member())return;privateRunning=true;const user=uid(),kinds=new Set(privateKinds);privateKinds.clear();try{if(kinds.has('pair')){pairEvent();if(state.searching)await pollSearch();else if(state.pair?.id)await refreshPair();}if(uid()===user&&kinds.has('premium'))await refreshEntitlement(user,true);if(uid()===user&&kinds.has('message')){pairsDirty=true;if(visible()){void window.connectRelationships?.tick?.();void refreshPairsList();}}}catch(e){console.warn('Account sync unavailable',e?.message);}finally{privateRunning=false;if(privateKinds.size)schedulePrivate();}}
async function refreshEntitlement(user,force=false){if(!member()||uid()!==user||(!force&&Date.now()-lastEntitlement<60000))return;lastEntitlement=Date.now();const extras=window.entreExtras,prior=extras?.isPremium?.(user);await extras?.refreshPremium?.();if(uid()!==user)return;const active=extras?.isPremium?.(user);if(!active)state.preference='any';if(active&&onboardingPlanPending()){await finishOnboarding(null);return;}if(prior!==active||state.view==='premium'){if(onboardingPlanPending())render();else if(['premium','connect','profile'].includes(state.view)&&!state.searching&&!activeEncounter())renderView();}if(state.view==='connect')void refreshSearchQuota();}
function activity(payload){if(!visible())return;if(['follow','follow_accepted','chat_request','chat_accepted'].includes(payload?.new?.kind))inboxDirty=true;if(activityTimer)return;activityTimer=setTimeout(()=>{activityTimer=0;if(!member()||!visible())return;const refreshInbox=inboxDirty;inboxDirty=false;void api().refreshNotifications();if(refreshInbox&&state.view==='online')void api().refreshInbox();},250)}
function subscribe(){
 if(!ready())return;
 if(!publicChannel)publicChannel=db.channel('connect-public-count').on('postgres_changes',{event:'UPDATE',schema:'public',table:'entre_presence_signal',filter:'id=eq.1'},presenceEvent).on('postgres_changes',{event:'UPDATE',schema:'public',table:'connect_public_signal',filter:'id=eq.1'},()=>void maintenanceCheck(false)).subscribe(status=>{if(status==='SUBSCRIBED'){presenceEvent();void maintenanceCheck(false);}});
 const user=member()?uid():null;
 if(account===user)return;
 if(accountChannel){void db.removeChannel(accountChannel);accountChannel=null;}
 account=user;lastPing=0;lastOnline=0;lastEntitlement=0;lastPairsRefresh=0;clearTimeout(pairsTimer);pairsTimer=0;inboxDirty=false;pairsDirty=false;onlineSignature=null;privateKinds.clear();
 if(!user)return;
 accountChannel=db.channel('connect-account-'+user)
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'entre_community_signal'},communityEvent)
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'connect_account_signal',filter:'user_id=eq.'+user},accountEvent)
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'connect_account_signal',filter:'user_id=eq.'+user},accountEvent)
 .on('postgres_changes',{event:'INSERT',schema:'public',table:'entre_notifications',filter:'user_id=eq.'+user},activity)
 .on('postgres_changes',{event:'UPDATE',schema:'public',table:'entre_notifications',filter:'user_id=eq.'+user},activity)
 .subscribe(status=>{if(status==='SUBSCRIBED'&&uid()===user){privateKinds.add('pair');privateKinds.add('premium');privateKinds.add('message');schedulePrivate();void refreshOfficial();}});
}
async function resume(){
 if(!ready()||resuming||!navigator.onLine||(!visible()&&!essential()))return;
 resuming=true;const user=uid();
 try{subscribe();await Promise.allSettled([ping(),refreshCount()]);if(!member()||uid()!==user)return;
 if(visible()){pairsDirty=true;await Promise.allSettled([api().refreshNotifications(),api().refreshBulletins?.(false,true),window.connectRelationships?.tick?.(),refreshOnline(),refreshPairsList()]);}
 void refreshEntitlement(user);if(state.view==='rooms')void window.entreRooms?.refresh?.();if(state.view==='posts'){feedDirty=true;refreshFeed();}
 if(state.pair?.id&&['chat','connect'].includes(state.view)){await refreshPair();if(state.pair?.id){await loadMessages();refreshEncounterMessages();}}
 }catch(e){console.warn('Reconnect sync',e?.message)}finally{resuming=false}
}
function onResume(){if(document.hidden||Date.now()-lastResume<3000)return;lastResume=Date.now();void resume()}
function start(){if(started)return;started=true;
 const root=document.getElementById('app');if(root)new MutationObserver(()=>{paint();if(!counterFrame&&ready()&&visible()&&hasCounters()&&(!countAt||Date.now()-countAt>=30000)){counterFrame=requestAnimationFrame(()=>{counterFrame=0;void refreshCount();});}}).observe(root,{childList:true,subtree:true});
 setInterval(()=>{if(!ready())return;subscribe();if(!visible()&&!essential())return;void ping();if(visible()){void refreshCount();void refreshOnline();void refreshPairsList();refreshFeed();if(member()&&['premium','connect'].includes(state.view)&&Date.now()-lastEntitlement>=120000)void refreshEntitlement(uid());paint()}},30000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)onResume()});
 window.addEventListener('focus',onResume);window.addEventListener('pageshow',onResume);window.addEventListener('online',onResume);
 const boot=setInterval(()=>{if(ready()){clearInterval(boot);void resume()}},200);
}
async function depart(){if(!member())return;try{await api().rpc('entre_online_depart')}catch(e){console.warn('Presence departure unavailable',e?.message)}}
window.connectRealtime={resume,depart,paint,refreshCount,refreshOnline};
document.addEventListener('DOMContentLoaded',start,{once:true});
})();