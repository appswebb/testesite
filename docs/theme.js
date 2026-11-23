/* entre. themes: user-controlled appearance, shared by all pages on this origin.
 * Storage is intentionally local to the device; no personal/profile data is transmitted.
 */
(function(){
'use strict';
const KEY='entre.appearance.v1';
const MODES=['light','dark','custom'];
const DEFAULT={mode:'light',color:'#2977D5'};
const PRESETS=[
 ['#17191D','Grafite'],['#2977D5','Azul'],['#F07C55','Coral'],
 ['#AE63CF','Lavanda'],['#DAA520','Dourado'],['#EA5386','Rosa']
];
const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v.toUpperCase():null;
function read(){
 try{
  const stored=JSON.parse(localStorage.getItem(KEY)||'null');
  return {mode:MODES.includes(stored?.mode)?stored.mode:DEFAULT.mode,
   color:hex(stored?.color)||DEFAULT.color};
 }catch{return {...DEFAULT};}
}
let state=read();
function rgb(h){return [1,3,5].map(n=>parseInt(h.slice(n,n+2),16));}
function readable(h){
 const c=rgb(h).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);});
 const luminance=c[0]*.2126+c[1]*.7152+c[2]*.0722;
 // WCAG relative-luminance threshold where black/white have equal contrast.
 return luminance>.179?'#111111':'#FFFFFF';
}
function apply(){
 const root=document.documentElement;
 root.dataset.theme=state.mode;
 const accent=state.mode==='custom'?state.color:state.mode==='dark'?'#F5F6F8':'#111111';
 const accentOn=readable(accent);
 root.style.setProperty('--ui-accent',accent);
 root.style.setProperty('--ui-accent-on',accentOn);
 root.style.setProperty('--ui-accent-soft',`rgb(${rgb(accent).join(' ')} / .13)`);
 root.style.setProperty('--ui-accent-faint',`rgb(${rgb(accent).join(' ')} / .07)`);
 root.style.setProperty('--ui-accent-shadow',`rgb(${rgb(accent).join(' ')} / .24)`);
 root.style.setProperty('--ui-theme-surface',state.mode==='dark'?'#17191D':'#FFFFFF');
 root.style.setProperty('--ui-theme-text',state.mode==='dark'?'#F5F6F8':'#151719');
 const metaColor=state.mode==='dark'?'#101114':state.mode==='custom'?accent:'#F6F7F7';
 document.querySelectorAll('meta[name="theme-color"]').forEach(meta=>meta.setAttribute('content',metaColor));
 root.style.colorScheme=state.mode==='dark'?'dark':'light';
 // Explicit inline fallback is necessary because legacy pages include fixed
 // !important surface rules which sometimes defeat the token stylesheet.
 // Apply on every mode change and on DOMContentLoaded, even before auth.
 if(document.body){
  document.body.style.setProperty('background-color',state.mode==='dark'?'#101114':'#FFFFFF','important');
  document.body.style.setProperty('color',state.mode==='dark'?'#F7F8FA':'#15191A','important');
 }
 // Immediate background sync for mounted legacy cards. Several old stylesheets
 // define a white !important shorthand and otherwise flash white on theme switch.
 const surfaces=document.querySelectorAll('.post-card,.post-compose,.settings-card,.form-panel,.profile-preview,.online-person,.conversation-entry,.comments-dialog,.room-shell,.camera-live-stage,.global-search-section,.support-card,.support-history,.premium-checkout-card');
 for(const el of surfaces){
  if(state.mode==='dark'){
   el.style.setProperty('background-color','#191c21','important');
   el.style.setProperty('color','#f7f8fa','important');
   el.dataset.themeSurfaceApplied='dark';
  }else if(el.dataset.themeSurfaceApplied==='dark'){
   el.style.removeProperty('background-color');el.style.removeProperty('background');el.style.removeProperty('color');
   delete el.dataset.themeSurfaceApplied;
  }
 }
 window.dispatchEvent(new CustomEvent('entre:themechange',{detail:{mode:state.mode,accent}}));
}
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){console.warn('Theme preference not persisted',e);}
}
function setMode(mode){
 if(!MODES.includes(mode))return false;
 state.mode=mode;persist();apply();syncControls();return true;
}
function setColor(color){
 const valid=hex(color);
 if(!valid)return false;
 state.color=valid;state.mode='custom';persist();apply();syncControls();return true;
}
function renderControls(){
 return '<section class="appearance-panel" aria-labelledby="appearanceTitle">'+
 '<div class="appearance-heading"><div><span class="appearance-eyebrow">A SUA EXPERIÊNCIA</span><h3 id="appearanceTitle">Aparência do aplicativo</h3><p>Escolha um tema ou defina sua própria cor. A preferência também vale para o painel e as páginas públicas neste aparelho.</p></div><span class="appearance-illustration" aria-hidden="true">✳</span></div>'+
 '<div class="appearance-mode-grid" role="group" aria-label="Selecionar aparência">'+
 '<button type="button" class="appearance-mode" data-theme-mode="light" aria-pressed="'+(state.mode==='light')+'"><span class="appearance-mini light"><i></i><b></b></span><strong>Claro</strong><small>Limpo e suave</small></button>'+
 '<button type="button" class="appearance-mode" data-theme-mode="dark" aria-pressed="'+(state.mode==='dark')+'"><span class="appearance-mini dark"><i></i><b></b></span><strong>Escuro</strong><small>Conforto à noite</small></button>'+
 '<button type="button" class="appearance-mode" data-theme-mode="custom" aria-pressed="'+(state.mode==='custom')+'"><span class="appearance-mini custom"><i></i><b></b></span><strong>Personalizado</strong><small>Sua identidade</small></button></div>'+
 '<div class="appearance-custom-settings" data-theme-custom-panel '+(state.mode==='custom'?'':'hidden')+'>'+
 '<label for="appearanceColor">Escolha sua cor</label><div class="appearance-color-line">'+
 '<input id="appearanceColor" data-theme-color type="color" value="'+state.color+'" aria-label="Selecionar cor personalizada">'+
 '<output id="appearanceHex" for="appearanceColor">'+state.color+'</output><span class="appearance-color-hint">Visualização instantânea</span></div>'+
 '<div class="appearance-swatches" role="group" aria-label="Cores sugeridas">'+
 PRESETS.map(([color,label])=>'<button type="button" class="appearance-swatch" data-theme-swatch="'+color+'" style="--swatch:'+color+'" title="'+label+'" aria-label="'+label+'" aria-pressed="'+(state.color===color)+'"><span></span></button>').join('')+
 '</div></div></section>';
}
function syncControls(){
 document.querySelectorAll('[data-theme-mode]').forEach(btn=>{
  const chosen=btn.dataset.themeMode===state.mode;
  btn.setAttribute('aria-pressed',String(chosen));
  btn.classList.toggle('is-selected',chosen);
 });
 document.querySelectorAll('[data-theme-custom-panel]').forEach(el=>{el.hidden=state.mode!=='custom';});
 document.querySelectorAll('[data-theme-color]').forEach(el=>{if(el.value.toUpperCase()!==state.color)el.value=state.color;});
 document.querySelectorAll('#appearanceHex').forEach(el=>{el.textContent=state.color;});
 document.querySelectorAll('[data-theme-swatch]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.themeSwatch===state.color)));
}
document.addEventListener('click',event=>{
 const mode=event.target.closest('[data-theme-mode]');
 if(mode){setMode(mode.dataset.themeMode);return;}
 const swatch=event.target.closest('[data-theme-swatch]');
 if(swatch)setColor(swatch.dataset.themeSwatch);
},true);
document.addEventListener('input',event=>{if(event.target.matches?.('[data-theme-color]'))setColor(event.target.value);},true);
window.addEventListener('storage',event=>{if(event.key===KEY){state=read();apply();syncControls();}});
document.addEventListener('DOMContentLoaded',()=>{
 // Apply a previously chosen motion mode without waiting for async login.
 try{
  document.body.classList.toggle('motion-off',localStorage.getItem('entre.motionOff')==='1');
  document.body.classList.toggle('motion-force',localStorage.getItem('entre.motionForce')==='1'&&localStorage.getItem('entre.motionOff')!=='1');
 }catch(e){}
 apply();syncControls();
},{once:true});
window.entreTheme={read:()=>({...state}),setMode,setColor,renderControls,syncControls,PRESETS};
apply();
})();
