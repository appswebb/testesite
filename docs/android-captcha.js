'use strict';
(()=>{
const state=location.hash.slice(1),status=document.getElementById('status'),button=document.getElementById('return');
let token='',widget=null;
const valid=/^[A-Za-z0-9_-]{43}$/.test(state);
if(!valid){status.textContent='Abra esta verificação pelo aplicativo Android.';return;}
const clear=()=>{token='';button.disabled=true;};
window.connectNativeChallengeReady=()=>{
 if(widget!==null)return;
 widget=window.turnstile.render('#challenge',{sitekey:'0x4AAAAAAGRXhO7YaQ_j10mr',theme:'auto',language:'pt-br',callback:value=>{token=value;button.disabled=false;status.textContent='Verificação concluída.';},'expired-callback':()=>{clear();status.textContent='Repita a verificação.';},'error-callback':()=>{clear();status.textContent='Falha na verificação. Tente novamente.';}});
};
if(window.turnstile?.render)window.connectNativeChallengeReady();
button.addEventListener('click',()=>{if(!token)return;const uri='connect-native://captcha?state='+encodeURIComponent(state)+'&token='+encodeURIComponent(token);clear();location.href=uri;});
})();