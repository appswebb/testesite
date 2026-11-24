'use strict';
const db=window.supabase?.createClient('https://trrakyybnvxpdhxwgjrz.supabase.co','sb_publishable_OJ4wBPPNVBBcrcNl12yonw_hRSlMKsZ',{auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
const state={view:'checkout',session:null};
const app=document.getElementById('app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={check:'<path d="m5 12 4 4L19 6"/>',lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',shield:'<path d="M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7z"/><path d="m8 12 3 3 5-5"/>',bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',card:'<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M3 10h18m-14 5h4"/>',arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',back:'<path d="M20 12H5m6-6-6 6 6 6"/>',chevron:'<path d="m9 5 7 7-7 7"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',refresh:'<path d="M20 11a8 8 0 1 0-2 6m2-12v6h-6"/>',crown:'<path d="m3 6 5 5 4-7 4 7 5-5-2 13H5z"/>'};
const ico=(name,size=20)=>'<svg viewBox="0 0 24 24" width="'+Number(size)+'" height="'+Number(size)+'" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.check)+'</svg>';
let toastTimer;
function toast(message){const el=document.getElementById('toast');el.textContent=String(message);el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4500);}
function nav(view){location.assign(view==='support'?'./?premium=return&checkoutSupport=1':'./?premium=return');}
function renderView(){if(!state.session?.user||!window.entreExtras)return;app.innerHTML=window.entreExtras.checkoutView();app.setAttribute('aria-busy','false');}
function unavailable(message,login=false){app.setAttribute('aria-busy','false');app.innerHTML='<div class="pc-start"><h1>'+esc(message)+'</h1><p>'+ (login?'Entre na sua conta do CONNECT para continuar.':'Verifique a conexão e tente novamente.')+'</p><a class="cc-pay-button" href="'+(login?'./?auth=login':'./checkout.html')+'">'+(login?'Entrar no CONNECT':'Tentar novamente')+'</a><a class="pc-text-link" href="./?premium=return">Voltar aos planos</a></div>';}
document.addEventListener('click',e=>{const btn=e.target.closest('[data-action]');if(!btn)return;switch(btn.dataset.action){case 'premiumCheckout':void window.entreExtras.checkout();break;case 'premiumVerify':void window.entreExtras.verifyPremium();break;case 'premiumCopyPix':void window.entreExtras.copyPix();break;case 'nav':nav(btn.dataset.view);break;}});
document.addEventListener('DOMContentLoaded',async()=>{
 if(!db||!window.entreExtras){unavailable('Não foi possível carregar o checkout.');return;}
 try{const {data,error}=await db.auth.getUser();if(error||!data?.user){unavailable('Sua sessão não está disponível.',true);return;}
 state.session={user:data.user};db.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'||(session?.user&&session.user.id!==state.session?.user?.id)){state.session=null;unavailable('Sua sessão foi alterada.',true);}});
 await window.entreExtras.refreshPremium();if(!state.session)return;await window.entreExtras.checkout();
 }catch(_){unavailable('Não foi possível iniciar a assinatura.');}
});
window.addEventListener('pageshow',e=>{if(e.persisted&&state.session?.user)location.reload();});
