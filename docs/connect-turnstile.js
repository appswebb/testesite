/* Public key only; token verification is enforced by Supabase Auth. */
(()=>{
 'use strict';
 const SITE_KEY='0x4AAAAAAGRXhO7YaQ_j10mr';
 const selector='#authForm[data-form="login"],#authForm[data-form="signup"],#authForm[data-form="forgot"],#admin-login-form';
 let current=null,loading=null;
 const markup=()=>'<div class="connect-turnstile"><div data-connect-turnstile-widget></div><div class="connect-turnstile-status"><span role="status" aria-live="polite" data-connect-turnstile-status>Preparando verificação de segurança…</span><button type="button" data-connect-turnstile-retry hidden>Repetir</button></div></div>';
 function status(c,message,retry=false){if(current!==c||!c.form.isConnected)return;if(c.status.textContent!==message)c.status.textContent=message;c.retry.hidden=!retry;}
 function errorText(code){
  const n=String(code||'');
  const detail=n?' (código '+n+')':'';
  if(n==='110200')return 'Domínio não autorizado: '+window.location.hostname+detail+'.';
  if(n==='110100'||n==='110110'||n==='400020'||n==='400070')return 'Chave Turnstile inválida ou inativa'+detail+'.';
  if(n==='200500')return 'O navegador não carregou a verificação'+detail+'. Confira bloqueadores e conexão.';
  return 'Falha na verificação de segurança'+detail+'. Tente novamente.';
 }
 let loadedAPI=null,attempt=0;
 function load(){
  if(loadedAPI)return Promise.resolve(loadedAPI);
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{
   const name='connectTurnstileReady'+(++attempt);
   let script=null,timer=null,finished=false,downloaded=false;
   const cleanup=()=>{clearTimeout(timer);delete window[name];};
   const fail=(code,message)=>{if(finished)return;finished=true;cleanup();script?.remove();reject(Error(message+' ('+code+').'));};
   const ready=()=>{
    if(finished)return;
    const api=window.turnstile;
    if(typeof api?.render!=='function')return;
    finished=true;cleanup();loadedAPI=api;resolve(api);
   };
   timer=setTimeout(()=>fail(downloaded?'CF-INIT':'CF-TIMEOUT',downloaded?'A Cloudflare foi baixada, mas não inicializou':'A conexão com a Cloudflare demorou demais'),30000);
   if(typeof window.turnstile?.render==='function'&&typeof window.turnstile?.ready==='function'){
    try{window.turnstile.ready(ready);return;}catch(_){}
   }
   // Register the official explicit-render onload callback before inserting the script.
   window[name]=ready;
   script=document.createElement('script');
   script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload='+name;
   script.async=true;
   script.onerror=()=>fail('CF-NET','Não foi possível acessar challenges.cloudflare.com. Confira DNS privado, VPN e bloqueadores');
   script.onload=()=>{downloaded=true;if(typeof window.turnstile?.ready==='function'){try{window.turnstile.ready(ready);}catch(_){/* official callback remains pending */}}};
   document.head.appendChild(script);
  }).catch(error=>{loading=null;throw error;});return loading;
 }
 function notify(c){for(const wake of [...c.waiters])wake();}
 function dispose(){const c=current;current=null;if(!c)return;c.token='';c.error='A tela de autenticação mudou. Tente novamente.';notify(c);if(c.id!==null)try{window.turnstile?.remove(c.id);}catch(_){}}
 function reset(form){
  const c=current;if(!c||c.form!==form)return;c.token='';c.error='';c.used=false;
  if(c.id!==null){status(c,'Verificando segurança…');try{window.turnstile.reset(c.id);}catch(_){c.error='Não foi possível reiniciar a verificação.';status(c,c.error,true);notify(c);}}
 }
 function rejected(c,message){if(current!==c)return;c.token='';c.error=message;status(c,message,true);notify(c);}
 async function mount(form){
  if(!form?.isConnected||current?.form===form)return;
  dispose();const box=form.querySelector('.connect-turnstile');if(!box)return;
  const c={form,box,id:null,token:'',used:false,error:'',waiters:new Set(),status:box.querySelector('[data-connect-turnstile-status]'),retry:box.querySelector('[data-connect-turnstile-retry]')};current=c;
  c.retry.addEventListener('click',()=>{if(current!==c)return;dispose();void mount(form);});
  status(c,'Preparando verificação de segurança…');
  try{
   const api=await load();if(current!==c||!form.isConnected)return;
   // Always show the genuine Cloudflare widget, including its challenge or error.
   c.id=api.render(box.querySelector('[data-connect-turnstile-widget]'),{
    sitekey:SITE_KEY,theme:'auto',size:box.clientWidth<300?'compact':'flexible',appearance:'always',execution:'render',language:'pt-br',
    retry:'auto','retry-interval':8000,'refresh-expired':'auto','refresh-timeout':'auto',
    callback:token=>{if(current!==c)return;c.token=token;c.error='';c.used=false;status(c,'Verificação de segurança concluída.');notify(c);},
    'expired-callback':()=>{if(current!==c)return;c.token='';c.error='';status(c,'Renovando verificação de segurança…',true);notify(c);},
    'timeout-callback':()=>{if(current!==c)return;c.token='';c.error='';status(c,'Renovando verificação de segurança…',true);notify(c);},
    'unsupported-callback':()=>rejected(c,'Este navegador não é compatível com a verificação. Abra o site no Chrome ou Firefox atualizado.'),
    'error-callback':code=>{rejected(c,errorText(code));return true;}
   });
   if(!c.token&&!c.error)status(c,'Verificando segurança…');notify(c);
  }catch(e){rejected(c,e.message||'Verificação indisponível. Confira sua conexão.');}
 }
 function sync(){const form=document.querySelector(selector);if(!form){dispose();return;}if(current?.form!==form)void mount(form);}
 async function consume(form){
  if(current?.form!==form)void mount(form);
  const c=current;if(!c||c.form!==form)throw Error('Não foi possível iniciar a verificação de segurança.');
  if(c.used)throw Error('Uma verificação já está em andamento.');
  if(c.token&&c.id!==null&&window.turnstile?.isExpired?.(c.id))reset(form);
  if(!c.token&&!c.error){
   await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{clean();reject(Error('A verificação ainda não terminou. Conclua o desafio da Cloudflare e tente novamente.'));},35000);
    function clean(){clearTimeout(timer);c.waiters.delete(wake);}
    function wake(){if(c.error||current!==c){clean();reject(Error(c.error||'A tela mudou. Tente novamente.'));}else if(c.token&&c.id!==null){clean();resolve();}}
    c.waiters.add(wake);wake();
   });
  }
  if(current!==c||c.error||!c.token||c.id===null||c.used)throw Error(c.error||'Conclua a verificação de segurança antes de continuar.');
  const token=c.token;c.token='';c.used=true;status(c,'Validando segurança…');return token;
 }
 window.connectTurnstile={markup,consume,reset};
 function start(){new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});sync();if(document.querySelector(selector))void load().catch(()=>{});}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();