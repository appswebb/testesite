(()=>{'use strict';
const supported=()=>window.isSecureContext&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
let owner=null,status='unknown',busy=false,seq=0;
const uid=()=>state.session?.user?.id;
async function rpc(name,args={}){const {data,error}=await db.rpc(name,args);if(error)throw error;return data;}
const waitWorker=()=>Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('Instale ou reabra o CONNECT e tente novamente.')),7000))]);
function renderStatus(){const el=document.getElementById('connectPushDevice');if(el&&!el.contains(document.activeElement))el.outerHTML=settings();else if(el){const b=el.querySelector('button'),p=el.querySelector('[data-push-status]');if(b){b.disabled=busy||status==='unsupported'||status==='blocked'||status==='unknown';b.textContent=status==='active'?'Desativar neste dispositivo':'Ativar neste dispositivo';}if(p)p.textContent=description();}}
function description(){return ({active:'Ativado neste dispositivo. Você pode receber avisos com o aplicativo fechado.',inactive:'Desativado neste dispositivo.',blocked:'Permissão bloqueada. Altere nas configurações do navegador.',unsupported:'Este navegador não oferece notificações push. No iPhone, instale o aplicativo na tela inicial.',unknown:'Verificando disponibilidade…',error:'Não foi possível verificar. Tente ativar novamente.'})[status]||'';}
function settings(){const st=owner===uid()?status:'unknown';return '<section id="connectPushDevice" class="settings-card"><h3>'+ico('bell',18)+' Notificações push</h3><p data-push-status>'+esc(owner===uid()?description():'Verificando disponibilidade…')+'</p><p>Receba um aviso genérico de novas mensagens e solicitações. O conteúdo privado não aparece na tela bloqueada.</p><button type="button" class="ui-btn btn-outline" data-connect-push-toggle '+(busy||['unknown','unsupported','blocked'].includes(st)?'disabled':'')+'>'+(st==='active'?'Desativar neste dispositivo':'Ativar neste dispositivo')+'</button></section>';}
async function refresh(){const account=uid();if(!account)return;if(owner!==account){owner=account;status='unknown';}const ticket=++seq;if(!supported()){status='unsupported';renderStatus();return;}if(Notification.permission==='denied'){status='blocked';renderStatus();return;}try{const reg=await waitWorker(),sub=await reg.pushManager.getSubscription();const active=sub&&await rpc('connect_push_device_active',{_endpoint:sub.endpoint});if(uid()!==account||ticket!==seq)return;status=active?'active':'inactive';}catch(_){if(uid()!==account||ticket!==seq)return;status='error';}renderStatus();}
function decode(s){const raw=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
async function disable(){if(!supported())return;const reg=await navigator.serviceWorker.getRegistration(),sub=await reg?.pushManager.getSubscription();if(!sub)return;try{await rpc('connect_push_remove',{_endpoint:sub.endpoint});}finally{await sub.unsubscribe();}}
async function depart(){if(!supported())return;++seq;try{await Promise.race([disable(),new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),3000))]);}catch(_){}owner=null;status='unknown';}
document.addEventListener('click',async e=>{const btn=e.target.closest?.('[data-connect-push-toggle]');if(!btn||btn.disabled||busy||!supported())return;const account=uid();busy=true;btn.disabled=true;try{if(status==='active'){await disable();status='inactive';toast('Notificações desativadas neste dispositivo.');return;}
 // Ask permission directly from a user gesture.
 const perm=await Notification.requestPermission();if(perm!=='granted'){status=perm==='denied'?'blocked':'inactive';return;}
 const key=await rpc('connect_push_public_key');if(!key)throw Error('Servidor de notificações indisponível.');
 const reg=await waitWorker();let sub=await reg.pushManager.getSubscription();
 if(sub){const old=sub.options?.applicationServerKey;if(old&&Array.from(new Uint8Array(old)).join(',')!==Array.from(decode(key)).join(',')){await sub.unsubscribe();sub=null;}}
 if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(key)});
 if(uid()!==account){await sub.unsubscribe();return;}
 const j=sub.toJSON();try{const ok=await rpc('connect_push_register',{_endpoint:j.endpoint,_p256dh:j.keys.p256dh,_auth:j.keys.auth});if(!ok)throw Error('Não foi possível registrar o dispositivo.');}catch(err){await sub.unsubscribe();throw err;}
 if(uid()!==account){await sub.unsubscribe();return;}
 status='active';toast('Notificações ativadas neste dispositivo.');
 }catch(err){status='error';toast(infoError(err),true);}finally{busy=false;if(uid()===account){renderStatus();void refresh();}}});
window.connectPush={settings,refresh,depart};
})();