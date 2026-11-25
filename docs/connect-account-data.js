/* Account governance: explicit legal acceptance, account-level preferences and minimal error telemetry. */
(()=>{
'use strict';
const version='2026-11-25';
let owner=null,loaded=false,accepted=false,loadingError=false,preferences=null,applying=false,saveTimer=0,saveBusy=false,dirty=false;
const current=()=>typeof state==='undefined'?null:state.session?.user?.id||null;
const defaults=()=>({notify_messages:true,notify_social:true,notify_matches:true});
const readLocal=()=>{try{return localStorage.getItem('connect.device.preferences.'+owner)==='1'}catch(_){return false}};
async function rpc(name,params){const {data,error}=await db.rpc(name,params||{});if(error)throw error;return data;}
function reset(id){if(owner===id)return;clearTimeout(saveTimer);owner=id;loaded=false;accepted=false;loadingError=false;preferences=null;dirty=false;saveBusy=false;}
function apply(p){if(!p)return;applying=true;try{window.entreTheme?.setMode(p.theme);state.motionOff=p.motion==='off';state.motionLevel=p.motion==='off'?'medium':p.motion;localStorage.setItem('entre.motionOff',state.motionOff?'1':'0');localStorage.setItem('entre.motionLevel',state.motionLevel);applyMotion();window.connectSound?.restore?.(p.sound,p.volume);}finally{applying=false}}
function collect(){const s=window.connectSound?.read?.()||{enabled:true,volume:80};return {_theme:window.entreTheme?.read()?.mode||'light',_motion:state.motionOff?'off':state.motionLevel||'medium',_sound:s.enabled,_volume:s.volume,_messages:preferences?.notify_messages!==false,_social:preferences?.notify_social!==false,_matches:preferences?.notify_matches!==false};}
async function prepare(id){reset(id);loaded=false;loadingError=false;
 try{const result=await rpc('connect_account_data');if(current()!==id||owner!==id)return false;accepted=result?.accepted===true;preferences={...defaults(),...(result?.preferences||{})};loaded=true;if(result?.preferences&&!readLocal())apply(preferences);return accepted;}
 catch(e){if(current()===id&&owner===id){loadingError=true;loaded=true;}return false;}
}
function pending(){return Boolean(current()&&(!loaded||owner!==current()||!accepted));}
function gate(){if(loadingError)return '<main class="auth-page"><section class="settings-card"><h2>Não foi possível consultar sua conta</h2><p>Verifique sua conexão e tente novamente.</p><button type="button" data-account-legal="retry" class="ui-btn btn-dark">Tentar novamente</button><button type="button" data-action="logout" class="ui-btn btn-outline">Sair</button></section></main>';
 if(!loaded)return '<main class="auth-page"><section class="settings-card"><h2>Consultando sua conta…</h2></section></main>';
 return '<main class="auth-page"><section class="settings-card connect-legal-card"><h2>Antes de continuar</h2><p>Confirme sua maioridade e a versão atual dos documentos do CONNECT.</p><form id="connectLegalForm"><label class="checkbox-line"><input type="checkbox" name="adult" required><span>Declaro que tenho 18 anos ou mais.</span></label><label class="checkbox-line"><input type="checkbox" name="terms" required><span>Li e aceito os <a href="./termos.html" target="_blank" rel="noopener">Termos de uso</a> e a <a href="./privacidade.html" target="_blank" rel="noopener">Política de privacidade</a> (versão 25/11/2026).</span></label><button type="submit" class="ui-btn btn-dark">Aceitar e continuar</button></form><button type="button" data-action="logout" class="ui-btn btn-outline">Sair</button></section></main>';}
async function save(force=false){if(!loaded||!accepted||applying||!owner||owner!==current()||(!force&&readLocal()))return;if(saveBusy){dirty=true;return;}saveBusy=true;dirty=false;const id=owner;
 try{const result=await rpc('connect_save_preferences',collect());if(current()===id&&owner===id)preferences={...defaults(),...result};}
 catch(e){if(current()===id&&owner===id){toast('Não foi possível sincronizar as preferências. Tente salvar novamente.',true);}}
 finally{if(owner===id){saveBusy=false;if(dirty)schedule();}}
}
function schedule(){if(applying||!loaded||!accepted||owner!==current()||readLocal())return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>void save(),350);}
function markup(){const p=preferences||defaults();return '<div class="settings-card"><h3>Preferências da conta</h3><div class="setting-row"><div><strong>Sincronizar aparência e sons</strong><p>Use as mesmas configurações em outros dispositivos.</p></div><button type="button" class="ui-btn btn-outline btn-sm" role="switch" aria-checked="'+(!readLocal())+'" data-account-sync>'+(!readLocal()?'Ativado':'Desativado')+'</button></div><button type="button" class="ui-btn btn-outline btn-sm" data-account-save>Salvar preferências na conta</button><h3>Notificações</h3>'+[['notify_messages','Mensagens'],['notify_social','Solicitações e seguidores'],['notify_matches','Encontros']].map(([k,label])=>'<div class="setting-row"><div><strong>'+label+'</strong><p>Notificações no aplicativo</p></div><button type="button" role="switch" aria-checked="'+(p[k]!==false)+'" class="ui-btn btn-outline btn-sm" data-account-notify="'+k+'">'+(p[k]!==false?'Ativadas':'Desativadas')+'</button></div>').join('')+'<p class="motion-level-note">Avisos oficiais e alertas de segurança continuam disponíveis.</p></div>'}
document.addEventListener('submit',async e=>{const f=e.target;if(f?.id!=='connectLegalForm')return;e.preventDefault();e.stopImmediatePropagation();const id=current();if(!id||!f.elements.adult.checked||!f.elements.terms.checked)return;const b=f.querySelector('button[type=submit]');b.disabled=true;try{const ok=await rpc('connect_accept_legal',{_terms:version,_privacy:version,_adult:true});if(ok!==true)throw Error('Aceite não confirmado');if(current()!==id)return;accepted=true;await initializeAccount();}catch(err){if(current()===id)toast('Não foi possível registrar o aceite. Tente novamente.',true);}finally{if(b.isConnected)b.disabled=false;}},true);
document.addEventListener('click',e=>{const b=e.target.closest?.('[data-account-legal],[data-account-sync],[data-account-save],[data-account-notify]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(b.dataset.accountLegal==='retry'){void initializeAccount();return;}if(owner!==current()||!accepted)return;
 if(b.hasAttribute('data-account-sync')){try{localStorage.setItem('connect.device.preferences.'+owner,readLocal()?'0':'1')}catch(_){}if(!readLocal()){if(preferences?.theme)apply(preferences);else void save(true);}renderView();return;}
 if(b.hasAttribute('data-account-save')){void save(true);return;}
 const k=b.dataset.accountNotify;if(['notify_messages','notify_social','notify_matches'].includes(k)){preferences={...defaults(),...preferences,[k]:preferences?.[k]===false};b.setAttribute('aria-checked',String(preferences[k]));b.textContent=preferences[k]?'Ativadas':'Desativadas';void save(true);}
},true);
window.addEventListener('entre:themechange',schedule);
window.addEventListener('connect:motionchange',schedule);
window.addEventListener('connect:soundchange',schedule);
const sent=new Map();
function error(category){const id=current();if(!id||id!==owner||!loaded||!accepted||!navigator.onLine)return;const key=id+':'+category;if(Date.now()-(sent.get(key)||0)<60000)return;sent.set(key,Date.now());void rpc('connect_record_error',{_category:category}).catch(()=>{});}
window.addEventListener('error',e=>error(e.target&&e.target!==window?'resource':'script'),true);
window.addEventListener('unhandledrejection',()=>error('promise'));
window.connectAccountData={prepare,pending,gate,markup,recordError:error};
})();
