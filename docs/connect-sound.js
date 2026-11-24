/* CONNECT — local UI sound feedback. No downloads, tracking or microphone access. */
(()=>{
'use strict';
if(window.connectSound)return;
const KEY='connect.uiSounds';
let enabled=true,context=null,activeVoices=0,gesture=null,dragUntil=0;
try{enabled=localStorage.getItem(KEY)!=='off'}catch(_){}
const selector=[
 'button','a[href]','summary','input:not([type=hidden])','select','textarea',
 '[role=button]','[role=tab]','[role=switch]','[role=menuitem]','[role=checkbox]','[role=radio]',
 '[data-action]','[data-view]','[data-story-action]','[data-room-action]','[data-live-action]',
 '[data-site-search]','[data-theme-mode]','[data-theme-swatch]','[data-feed-crop]',
 '[data-chat-media]','[data-chat-media-action]','[data-admin-password-toggle]','[data-report-status]',
 '[data-cx-theme]','[onclick]','[data-connect-sound-toggle]'
].join(',');
function element(event){
 const t=event.target;
 return t?.closest?.(selector)||null;
}
function disabled(el){return el.matches?.(':disabled')||!!el.closest?.('[aria-disabled="true"],[inert]');}
function synth(){
 if(!enabled)return;
 const Audio=window.AudioContext||window.webkitAudioContext;
 if(!Audio)return;
 try{
  if(!context||context.state==='closed')context=new Audio();
  if(context.state==='suspended'||context.state==='interrupted'){
   context.resume().then(()=>{if(enabled&&context.state==='running')voice()}).catch(()=>{});
  }else if(context.state==='running')voice();
 }catch(_){}
}
function voice(){
 if(activeVoices>=4)return;
 const t=context.currentTime;
 const osc=context.createOscillator(),gain=context.createGain();
 osc.type='sine';
 osc.frequency.setValueAtTime(1120,t);
 osc.frequency.exponentialRampToValueAtTime(520,t+.045);
 gain.gain.setValueAtTime(.0001,t);
 gain.gain.exponentialRampToValueAtTime(.075,t+.005);
 gain.gain.exponentialRampToValueAtTime(.0001,t+.052);
 osc.connect(gain);gain.connect(context.destination);
 activeVoices++;
 osc.onended=()=>{activeVoices=Math.max(0,activeVoices-1);try{osc.disconnect();gain.disconnect()}catch(_){}};
 osc.start(t);osc.stop(t+.055);
}
function sync(){
 document.querySelectorAll('[data-connect-sound-toggle]').forEach(b=>{
  b.setAttribute('aria-checked',String(enabled));b.textContent=enabled?'Ativado':'Desativado';
 });
}
function set(value){
 enabled=Boolean(value);
 try{localStorage.setItem(KEY,enabled?'on':'off')}catch(_){}
 sync();
}
function markup(){
 return '<div class="setting-row"><div><strong>Sons de interação</strong><p>Som curto ao tocar nos botões e controles.</p></div><button type="button" class="ui-btn btn-outline btn-sm" role="switch" aria-label="Sons de interação" aria-checked="'+enabled+'" data-connect-sound-toggle>'+ (enabled?'Ativado':'Desativado')+'</button></div>';
}
document.addEventListener('pointerdown',e=>{
 if(e.isPrimary===false)return;
 gesture={id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};dragUntil=0;
},{capture:true,passive:true});
document.addEventListener('pointermove',e=>{
 if(gesture&&gesture.id===e.pointerId&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>10)gesture.moved=true;
},{capture:true,passive:true});
function endGesture(e){
 if(!gesture||gesture.id!==e.pointerId)return;
 if(gesture.moved||e.type==='pointercancel')dragUntil=Date.now()+450;
 gesture=null;
}
document.addEventListener('pointerup',endGesture,{capture:true,passive:true});
document.addEventListener('pointercancel',endGesture,{capture:true,passive:true});
document.addEventListener('click',e=>{
 if(!e.isTrusted)return;
 const el=element(e);
 if(!el||disabled(el)||(e.detail!==0&&Date.now()<dragUntil))return;
 if(el.hasAttribute('data-connect-sound-toggle')){
  set(!enabled);
  if(enabled)synth();
  return;
 }
 // Capture phase catches dynamically rendered controls even if their handlers stop propagation.
 // Native label activation forwards a click to its form control, avoiding a second tone.
 if(el.tagName==='LABEL'&&el.control)return;
 synth();
},true);
window.addEventListener('storage',e=>{if(e.key===KEY){enabled=e.newValue!=='off';sync();}});
window.connectSound={markup,set,isEnabled:()=>enabled};
})();
