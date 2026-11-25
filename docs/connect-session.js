/* Durable navigation and real-activity signup retention. Never store passwords or tokens here. */
(()=>{
'use strict';
const prefix='connect.session.v1.',ttl=1800000;
const views=new Set(['posts','discover','connect','rooms','lives','conversations','search','premium','settings','profile','chat','notifications','support','protocols','soon','shareapp','checkout','partnerships']);
const uid=()=>typeof state==='undefined'?null:state.session?.user?.id||null;
const get=(store,key)=>{try{return JSON.parse(store.getItem(prefix+key)||'null')}catch(_){return null}};
const put=(store,key,value)=>{try{store.setItem(prefix+key,JSON.stringify(value))}catch(_){}};
const remove=(store,key)=>{try{store.removeItem(prefix+key)}catch(_){}};
function rememberPage(){
 const id=uid();if(!id||!state.profile||state.profile.onboarding_plan_selected===false||state.resumeNavigation||state.mode==='reset'||state.suspension||maintenanceIsActive()||window.connectAccountData?.pending?.()||!views.has(state.view))return;
 const page={view:state.view,pair:state.view==='chat'?state.pair?.id||null:null,notificationTab:state.view==='notifications'?(window.entreSocial?.data?.notificationTab==='bulletins'?'bulletins':'personal'):null};
 const key='page.'+id;const previous=get(sessionStorage,key);if(JSON.stringify(previous)===JSON.stringify(page))return;
 put(sessionStorage,key,page);put(localStorage,key,page);
}
function readPage(id){const p=get(sessionStorage,'page.'+id)||get(localStorage,'page.'+id);return ['online','moments'].includes(p?.view)?{...p,view:'discover'}:p&&views.has(p.view)?p:null}
function clearDraft(id){if(id)remove(localStorage,'draft.'+id);}
function readDraft(id){const p=get(localStorage,'draft.'+id);if(!p||!Number.isFinite(p.at)||Date.now()-p.at>=ttl){clearDraft(id);return null}return p.fields||null}
function saveDraft(form){const id=uid();if(!id||state.profile||form?.dataset.form!=='profileSetup')return;const fields={};for(const name of ['username','display_name','age','gender'])fields[name]=String(form.elements.namedItem(name)?.value||'').slice(0,100);fields.interests=[...form.querySelectorAll('input[name=interest]:checked')].map(x=>x.value).slice(0,8);fields.goal=String(form.elements.namedItem('discovery_goal')?.value||'conversar');fields.visible=form.elements.namedItem('discovery_visible')?.checked===true;state.signup=fields;put(localStorage,'draft.'+id,{at:Date.now(),fields});}
function markEmailPending(){put(localStorage,'emailPending',{at:Date.now()});}
function emailPending(){const p=get(localStorage,'emailPending');if(p&&Date.now()-p.at<ttl)return true;remove(localStorage,'emailPending');return false}
function clearEmailPending(){remove(localStorage,'emailPending')}
function rememberPublic(){if(!uid()&&['signup','login','forgot'].includes(state.mode))put(sessionStorage,'public',state.mode);else remove(sessionStorage,'public')}
function publicMode(){const v=get(sessionStorage,'public');return ['signup','login','forgot'].includes(v)?v:null}
let last=0,lastOwner=null,pending=null,trailing=0,expired=false;
const unfinished=()=>!!uid()&&(!state.profile||state.profile.onboarding_plan_selected===false);
async function expire(id){if(uid()!==id||expired)return;expired=true;clearTimeout(trailing);clearDraft(id);clearEmailPending();try{await db.auth.signOut({scope:'local'})}catch(_){}if(uid()&&uid()!==id)return;state.session=null;state.profile=null;state.isAdmin=false;state.signup=null;state.signupConsent=false;state.resumeNavigation=false;state.mode='signup';render();showFormMessage('Seu cadastro expirou após 30 minutos sem atividade. Crie uma nova conta para continuar.',true);}
async function touch(force=false){
 if(!unfinished())return true;
 const id=uid();if(lastOwner!==id){lastOwner=id;last=0;pending=null;expired=false;clearTimeout(trailing);}
 if(expired)return false;
 if(pending)return pending;
 if(!force&&Date.now()-last<15000){clearTimeout(trailing);trailing=setTimeout(()=>{if(!document.hidden&&unfinished()&&uid()===id)void touch(true).catch(()=>{});},Math.max(10,15000-(Date.now()-last)));return true;}
 clearTimeout(trailing);
 const task=(async()=>{const {data,error}=await db.rpc('connect_resume_registration');if(error)throw error;if(uid()!==id)return false;if(data?.status==='expired'){await expire(id);return false;}if(!['pending','complete','untracked'].includes(data?.status))throw Error('Não foi possível confirmar o cadastro.');last=Date.now();return true;})();
 pending=task;try{return await task}finally{if(pending===task)pending=null;}
}
function actualActivity(ev){if(!ev.isTrusted||document.hidden||!unfinished())return;if(!ev.target.closest?.('.cx-onboard,.onboarding-plans,.connect-legal-card'))return;if(ev.type==='input'||ev.type==='change')saveDraft(ev.target.closest('form'));void touch().catch(()=>{});}
document.addEventListener('pointerdown',actualActivity,true);
document.addEventListener('input',actualActivity,true);
document.addEventListener('change',actualActivity,true);
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(trailing);return;}if(unfinished())void touch(true).catch(()=>{});});
function clearAccount(id){clearTimeout(trailing);if(id){remove(localStorage,'page.'+id);remove(sessionStorage,'page.'+id);clearDraft(id);}clearEmailPending();}
function invalidSession(error){const code=String(error?.code||'');return ['session_not_found','refresh_token_not_found','refresh_token_already_used','user_not_found','bad_jwt','invalid_jwt','session_expired','user_banned'].includes(code)||error?.status===401||error?.status===403;}
function retryScreen(){return '<main class="auth-page"><section class="settings-card connect-legal-card"><h2>Não foi possível reconectar</h2><p>Sua sessão foi preservada. Verifique a conexão e tente novamente.</p><button type="button" class="ui-btn btn-dark" data-action="retryArea">Tentar novamente</button></section></main>';}
try{for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.startsWith(prefix+'draft.')){const p=JSON.parse(localStorage.getItem(k)||'null');if(!p||Date.now()-p.at>=ttl)localStorage.removeItem(k);}}}catch(_){}
window.connectSession={rememberPage,readPage,saveDraft,readDraft,clearDraft,markEmailPending,emailPending,clearEmailPending,rememberPublic,publicMode,touch,clearAccount,invalidSession,retryScreen};
})();