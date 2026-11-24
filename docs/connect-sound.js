/* CONNECT — local UI sound feedback. No downloads, tracking or microphone access. */
(()=>{
'use strict';
if(window.connectSound)return;
const KEY='connect.uiSounds',VOLUME='connect.uiSoundsVolume';
let enabled=true,context=null,activeVoices=0,gesture=null,dragUntil=0,level=80;
const last=new Map();
try{enabled=localStorage.getItem(KEY)!=='off';const raw=localStorage.getItem(VOLUME);if(raw!==null&&Number.isFinite(Number(raw)))level=Math.max(20,Math.min(100,Number(raw)));}catch(_){}
const selector=[
 'button','a[href]','summary','input:not([type=hidden])','select','textarea',
 '[role=button]','[role=tab]','[role=switch]','[role=menuitem]','[role=checkbox]','[role=radio]',
 '[data-action]','[data-view]','[data-story-action]','[data-room-action]','[data-live-action]',
 '[data-site-search]','[data-theme-mode]','[data-theme-swatch]','[data-feed-crop]',
 '[data-chat-media]','[data-chat-media-action]','[data-admin-password-toggle]','[data-report-status]',
 '[data-cx-theme]','[data-chat-media-record]','[data-chat-media-open]','[data-chat-media-remove]','[onclick]','[data-connect-sound-toggle]'
].join(',');
function element(event){
 const t=event.target;
 return t?.closest?.(selector)||null;
}
function disabled(el){return el.matches?.(':disabled')||!!el.closest?.('[aria-disabled="true"],[inert]');}
// [offset in seconds, start Hz, end Hz, duration, amplitude]
const sounds={
 click:[[0,1120,520,.045,.058]],
 nav:[[0,780,1050,.055,.052]],
 select:[[0,900,1280,.043,.047]],
 open:[[0,500,900,.07,.05]],
 close:[[0,900,460,.07,.05]],
 pending:[[0,600,480,.043,.035]],
 like:[[0,660,880,.06,.055],[.045,990,1320,.08,.048]],
 send:[[0,480,940,.07,.065],[.065,1180,1450,.055,.044]],
 receive:[[0,880,780,.09,.052],[.085,660,590,.08,.046]],
 publish:[[0,523,660,.105,.057],[.08,784,1047,.14,.052]],
 found:[[0,440,660,.09,.056],[.075,660,880,.11,.056],[.16,880,1175,.15,.047]],
 match:[[0,523,659,.12,.062],[.09,659,784,.14,.057],[.18,1047,1175,.19,.052]],
 login:[[0,392,523,.1,.055],[.085,659,784,.14,.056]],
 logout:[[0,784,587,.11,.057],[.1,440,294,.18,.052]],
 end:[[0,587,440,.1,.05],[.09,349,262,.12,.045]],
 success:[[0,659,784,.08,.052],[.075,988,1047,.1,.045]],
 delete:[[0,420,250,.09,.045],[.08,280,160,.09,.035]],
 error:[[0,330,260,.1,.055],[.09,310,220,.12,.048]],
 live:[[0,392,660,.1,.054],[.08,784,988,.11,.05],[.16,988,1318,.1,.041]]
};
function synth(kind='click',gestureStart=false){
 if(!enabled||!sounds[kind]||document.hidden)return;
 const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
 try{
  if(!context||context.state==='closed'){if(!gestureStart)return;context=new Audio();}
  if(context.state==='suspended'||context.state==='interrupted'){
   if(!gestureStart)return;
   context.resume().then(()=>{if(enabled&&context.state==='running')voice(kind)}).catch(()=>{});
  }else if(context.state==='running')voice(kind);
 }catch(_){}
}
function voice(kind){
 if(!enabled||document.hidden)return;
 const now=Date.now(),gap=kind==='error'?1200:kind==='receive'?500:kind==='match'||kind==='found'||kind==='end'?700:kind==='click'||kind==='nav'||kind==='select'?45:170;
 if(now-(last.get(kind)||0)<gap||activeVoices>=12)return;
 last.set(kind,now);
 const t=context.currentTime;
 for(const [offset,start,end,duration,volume] of sounds[kind]){
  const at=t+offset,osc=context.createOscillator(),gain=context.createGain();
  osc.type='sine';
  osc.frequency.setValueAtTime(start,at);
  osc.frequency.exponentialRampToValueAtTime(end,at+duration);
  gain.gain.setValueAtTime(.0001,at);
  gain.gain.exponentialRampToValueAtTime(Math.max(.001,volume*(.5+level/100)),at+.005);
  gain.gain.exponentialRampToValueAtTime(.0001,at+duration);
  osc.connect(gain);gain.connect(context.destination);activeVoices++;
  osc.onended=()=>{activeVoices=Math.max(0,activeVoices-1);try{osc.disconnect();gain.disconnect()}catch(_){}};
  osc.start(at);osc.stop(at+duration+.005);
 }
}
function clickKind(el){
 const d=el.dataset||{},a=d.action||d.liveAction||d.roomAction||d.storyAction||'';
 if(el.type==='submit'||/^(logout|signout|startsearch|cancelsearch|vote|endpair|block|removeAvatar|delete2|postLike|postDelete|postCommentDelete|socialFollow|socialChat|followAccept|followDecline|chatAccept|chatDecline|conversationDeleteConfirm|conversationPin|conversationUnpin|conversationArchive|conversationRestore|join|leave|end|approve|reject|request|delete)$/.test(a))return 'pending';
 if(a==='nav'||d.view||el.tagName==='A')return 'nav';
 if(el.matches?.('select,input[type=checkbox],input[type=radio],[role=switch],[role=tab]')||d.themeMode||d.themeSwatch||d.cxTheme!==undefined||/filter|mode|toggle|category|choose|motionLevel|mic|camera/i.test(a))return 'select';
 if(/close|cancel|back/i.test(a))return 'close';
 if(el.tagName==='SUMMARY'||/open|menu|compose|create|login|signup|delete1|report/i.test(a))return 'open';
 return 'click';
}
function sync(){
 document.querySelectorAll('[data-connect-sound-toggle]').forEach(b=>{
  b.setAttribute('aria-checked',String(enabled));b.textContent=enabled?'Ativado':'Desativado';
 });
 document.querySelectorAll('[data-connect-sound-volume]').forEach(x=>x.value=level);document.querySelectorAll('[data-connect-volume-label]').forEach(x=>x.textContent=level+'%');
}
function set(value){
 enabled=Boolean(value);
 try{localStorage.setItem(KEY,enabled?'on':'off')}catch(_){}
 sync();
}
function markup(){
 return '<div class="setting-row"><div><strong>Sons de interação</strong><p>Sons diferentes para navegação, mensagens, conexões e confirmações.</p></div><button type="button" class="ui-btn btn-outline btn-sm" role="switch" aria-label="Sons de interação" aria-checked="'+enabled+'" data-connect-sound-toggle>'+ (enabled?'Ativado':'Desativado')+'</button></div><div class="setting-row sound-volume-row"><div><strong>Volume dos efeitos</strong><p data-connect-volume-label>'+level+'%</p></div><input type="range" data-connect-sound-volume aria-label="Volume dos sons" min="20" max="100" value="'+level+'"><button type="button" class="ui-btn btn-outline btn-sm" data-connect-sound-test>Testar</button></div>';
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
 if(el.hasAttribute('data-connect-sound-test')){synth('found',true);return;}
 if(el.hasAttribute('data-connect-sound-toggle')){
  set(!enabled);
  if(enabled)synth('select',true);
  return;
 }
 // Capture phase catches dynamically rendered controls even if their handlers stop propagation.
 // Native label activation forwards a click to its form control, avoiding a second tone.
 if(el.tagName==='LABEL'&&el.control)return;
 synth(clickKind(el),true);
},true);
document.addEventListener('input',e=>{if(!e.target.matches?.('[data-connect-sound-volume]'))return;level=Math.max(20,Math.min(100,Number(e.target.value)||80));try{localStorage.setItem(VOLUME,String(level));}catch(_){}sync();});
window.addEventListener('storage',e=>{if(e.key===KEY){enabled=e.newValue!=='off';sync();}if(e.key===VOLUME){level=Math.max(20,Math.min(100,Number(e.newValue)||80));sync();}});
window.connectSound={markup,set,isEnabled:()=>enabled,play:kind=>synth(kind)};
})();
