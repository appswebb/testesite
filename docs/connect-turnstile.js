/* Public site key only. Supabase verifies every submitted token server-side. */
(()=>{
 'use strict';
 const SITE_KEY='0x4AAAAAAGRXhO7YaQ_j10mr';
 const selector='#authForm[data-form="login"],#authForm[data-form="signup"],#authForm[data-form="forgot"],#admin-login-form';
 let current=null,loading=null;
 const markup=()=>'<div class="connect-turnstile"><div data-connect-turnstile-widget></div><div class="connect-turnstile-status"><span role="status" aria-live="polite" data-connect-turnstile-status>Preparando verificação de segurança…</span><button type="button" data-connect-turnstile-retry hidden>Repetir</button></div></div>';
 function status(c,message,retry=false){if(current!==c||!c.form.isConnected)return;c.status.textContent=message;c.retry.hidden=!retry;}
 function load(){
  if(window.turnstile?.render)return Promise.resolve(window.turnstile);
  if(loading)return loading;
  loading=new Promise((resolve,reject)=>{
   const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;
   let timer=setTimeout(()=>fail(),20000);
   function fail(){clearTimeout(timer);script.remove();reject(Error('Não foi possível carregar a verificação de segurança.'));}
   script.onerror=fail;script.onload=()=>{if(!window.turnstile?.ready)return fail();window.turnstile.ready(()=>{clearTimeout(timer);resolve(window.turnstile);});};
   document.head.append(script);
  }).catch(e=>{loading=null;throw e;});return loading;
 }
 function dispose(){
  const c=current;current=null;if(!c)return;c.token='';
  if(c.id!==null)try{window.turnstile?.remove(c.id);}catch(_){}
 }
 function reset(form){const c=current;if(!c||c.form!==form)return;c.token='';if(c.id!==null){status(c,'Verificando segurança…');try{window.turnstile.reset(c.id);}catch(_){status(c,'Verificação indisponível. Tente novamente.',true);}}}
 async function mount(form){
  if(!form||!form.isConnected||current?.form===form)return;
  dispose();const box=form.querySelector('.connect-turnstile');if(!box)return;
  const c={form,box,id:null,token:'',status:box.querySelector('[data-connect-turnstile-status]'),retry:box.querySelector('[data-connect-turnstile-retry]')};current=c;
  c.retry.addEventListener('click',()=>{if(current!==c)return;dispose();void mount(form);});
  try{
   const api=await load();if(current!==c||!form.isConnected)return;
   c.id=api.render(box.querySelector('[data-connect-turnstile-widget]'),{
    sitekey:SITE_KEY,theme:'auto',size:box.clientWidth<300?'compact':'flexible',appearance:'interaction-only',language:'pt-br',
    callback:token=>{if(current!==c)return;c.token=token;status(c,'Verificação de segurança concluída.');},
    'expired-callback':()=>{if(current!==c)return;c.token='';status(c,'Verificação expirada. Tente novamente.',true);},
    'timeout-callback':()=>{if(current!==c)return;c.token='';status(c,'Verificação demorou demais. Tente novamente.',true);},
    'error-callback':()=>{if(current!==c)return;c.token='';status(c,'Não foi possível verificar. Tente novamente.',true);}
   });
   if(!c.token)status(c,'Verificando segurança…');
  }catch(e){status(c,'Verificação indisponível. Confira sua conexão.',true);}
 }
 function sync(){const form=document.querySelector(selector);if(!form){dispose();return;}if(current?.form!==form)void mount(form);}
 function consume(form){
  const c=current;
  if(!c||c.form!==form||!c.token||c.id===null||window.turnstile?.isExpired?.(c.id))throw Error('Aguarde ou conclua a verificação de segurança antes de continuar.');
  const token=c.token;c.token='';status(c,'Validando segurança…');return token;
 }
 window.connectTurnstile={markup,consume,reset};
 function start(){new MutationObserver(sync).observe(document.body,{childList:true,subtree:true});sync();}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();