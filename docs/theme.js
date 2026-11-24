/* entre. themes: user-controlled appearance, shared by all pages on this origin.
 * Storage is intentionally local to the device; no personal/profile data is transmitted.
 */
(function(){
'use strict';
const KEY='entre.appearance.v1';
const MODES=['light','dark'];
const DEFAULT={mode:'dark',color:'#C33DF0',style:'neon'};
const NEON_COLOR=DEFAULT.color;
const STYLES=['neon','romance','neutral'];
const PRESETS=[
 ['#C33DF0','Neon CONNECT'],
 ['#D16A8A','Rosa antigo'],['#A63B5E','Vinho'],
 ['#7757F4','Violeta'],['#2977D5','Azul'],['#F07C55','Coral'],
 ['#AE63CF','Lavanda'],['#DAA520','Dourado'],['#EA5386','Rosa']
];
const hex=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v.toUpperCase():null;
function read(){
 try{
  const stored=JSON.parse(localStorage.getItem(KEY)||'null');
  if(!stored)return {...DEFAULT};
  // One-time migration of previous factory defaults, without discarding custom choices.
  if((!stored.style||stored.style==='romance')&&stored.mode!=='light'&&['#D16A8A','#7545F7'].includes(hex(stored.color)))return {...DEFAULT};
  return {mode:stored?.mode==='custom'?'light':MODES.includes(stored?.mode)?stored.mode:DEFAULT.mode,
   color:hex(stored?.color)||DEFAULT.color,style:STYLES.includes(stored?.style)?stored.style:DEFAULT.style};
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
 root.dataset.connectStyle=state.style;
 const accent=state.color;
 const accentOn=readable(accent);
 root.style.setProperty('--ui-accent',accent);
 root.style.setProperty('--ui-accent-on',accentOn);
 root.style.setProperty('--ui-accent-soft',`rgb(${rgb(accent).join(' ')} / .13)`);
 root.style.setProperty('--ui-accent-faint',`rgb(${rgb(accent).join(' ')} / .07)`);
 root.style.setProperty('--ui-accent-shadow',`rgb(${rgb(accent).join(' ')} / .24)`);
 const dark=state.mode==='dark';
 const tokens=state.style==='neon'?(dark?{'--ui-bg':'#100A18','--ui-panel':'#1B1227','--ui-panel-alt':'#281B37','--ui-text':'#F8F3FF','--ui-muted':'#C5B8D5','--ui-line':'#4B315C'}:{'--ui-bg':'#F8F5FC','--ui-panel':'#FFFFFF','--ui-panel-alt':'#F0E9F7','--ui-text':'#251634','--ui-muted':'#6E5A80','--ui-line':'#DDD0EA'}):state.style==='romance'?(dark?{'--ui-bg':'#140F14','--ui-panel':'#211820','--ui-panel-alt':'#2C202A','--ui-text':'#F8EDF0','--ui-muted':'#C0AAB5','--ui-line':'#48303E'}:{'--ui-bg':'#FBF4F4','--ui-panel':'#FFFDFD','--ui-panel-alt':'#F4E7EA','--ui-text':'#30202A','--ui-muted':'#76606A','--ui-line':'#E8D8DF'}):dark?{'--ui-bg':'#15171b','--ui-panel':'#20232a','--ui-panel-alt':'#2b2f37','--ui-text':'#f5f6f8','--ui-muted':'#b7bdc8','--ui-line':'#393e49'}:{'--ui-bg':'#f5f6f9','--ui-panel':'#ffffff','--ui-panel-alt':'#eef0f4','--ui-text':'#20232a','--ui-muted':'#606978','--ui-line':'#dfe3eb'};
 for(const [key,value] of Object.entries(tokens))root.style.setProperty(key,value,'important');
 root.style.setProperty('--ui-theme-surface',tokens['--ui-panel']);root.style.setProperty('--ui-theme-text',tokens['--ui-text']);
 const brand=state.style==='neon'&&accent===NEON_COLOR;
 root.dataset.connectGradient=brand?'brand':'custom';
 root.style.setProperty('--cn-grad',brand?'linear-gradient(110deg,#6519D0 0%,#9C22BE 47%,#B92D67 82%,#BD4F32 100%)':'linear-gradient(145deg,color-mix(in srgb,'+accent+' 85%,white),'+accent+')','important');root.style.setProperty('--cn-ink',brand?'#FFFFFF':accentOn,'important');
 document.querySelectorAll('meta[name="theme-color"]').forEach(meta=>meta.setAttribute('content',tokens['--ui-bg']));
 root.style.colorScheme=state.mode;
 if(document.body){document.body.style.removeProperty('background-color');document.body.style.removeProperty('color')}
 document.querySelectorAll('[data-theme-surface-applied]').forEach(el=>{el.style.removeProperty('background-color');el.style.removeProperty('background');el.style.removeProperty('color');delete el.dataset.themeSurfaceApplied});
 window.dispatchEvent(new CustomEvent('entre:themechange',{detail:{mode:state.mode,accent}}));
}
function persist(){
 try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){console.warn('Theme preference not persisted',e);}
}
function setMode(mode){
 if(!MODES.includes(mode))return false;
 state.mode=mode;persist();apply();syncControls();return true;
}
function setStyle(style){if(!STYLES.includes(style))return false;state.style=style;if(style==='neon'){state.mode='dark';state.color=NEON_COLOR;}persist();apply();syncControls();return true;}
function setColor(color){
 const valid=hex(color);
 if(!valid)return false;
 state.color=valid;persist();apply();syncControls();return true;
}
function renderControls(){
 return '<section class="appearance-panel" aria-labelledby="appearanceTitle">'+
 '<div class="appearance-heading"><div><span class="appearance-eyebrow">A SUA EXPERIÊNCIA</span><h3 id="appearanceTitle">Aparência do aplicativo</h3><p>Escolha o modo, o estilo e a cor separadamente.</p></div></div>'+
 '<div class="appearance-mode-grid" role="group" aria-label="Selecionar aparência">'+
 '<button type="button" class="appearance-mode" data-theme-mode="light" aria-pressed="'+(state.mode==='light')+'"><span class="appearance-mini light"><i></i><b></b></span><strong>Claro</strong><small>Limpo e suave</small></button>'+
 '<button type="button" class="appearance-mode" data-theme-mode="dark" aria-pressed="'+(state.mode==='dark')+'"><span class="appearance-mini dark"><i></i><b></b></span><strong>Escuro</strong><small>Conforto à noite</small></button>'+
 '</div><div class="appearance-style-picker" role="group" aria-label="Estilo visual"><button type="button" data-connect-style="neon" aria-pressed="'+(state.style==='neon')+'"><i class="nx-theme-sample"></i><strong>CONNECT Neon</strong><small>Tema padrão</small></button><button type="button" data-connect-style="romance" aria-pressed="'+(state.style==='romance')+'">Dark Romance</button><button type="button" data-connect-style="neutral" aria-pressed="'+(state.style==='neutral')+'">Neutro</button></div><div class="appearance-custom-settings" data-theme-custom-panel>'+ 
 '<label for="appearanceColor">Escolha sua cor</label><div class="appearance-color-line">'+
 '<input id="appearanceColor" data-theme-color type="color" value="'+state.color+'" aria-label="Selecionar cor personalizada">'+
 '<output id="appearanceHex" for="appearanceColor">'+state.color+'</output><span class="appearance-color-hint">Visualização instantânea</span></div>'+
 '<div class="appearance-swatches" role="group" aria-label="Cores sugeridas">'+
 PRESETS.map(([color,label])=>'<button type="button" class="appearance-swatch" data-theme-swatch="'+color+'" style="--swatch:'+color+'" title="'+label+'" aria-label="'+label+'" aria-pressed="'+(state.color===color)+'"><span></span></button>').join('')+
 '</div></div></section>';
}
function syncControls(){
 document.querySelectorAll('button[data-connect-style]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.connectStyle===state.style)));
 document.querySelectorAll('[data-theme-mode]').forEach(btn=>{
  const chosen=btn.dataset.themeMode===state.mode;
  btn.setAttribute('aria-pressed',String(chosen));
  btn.classList.toggle('is-selected',chosen);
 });
 document.querySelectorAll('[data-theme-custom-panel]').forEach(el=>{el.hidden=false;});
 document.querySelectorAll('[data-theme-color]').forEach(el=>{if(el.value.toUpperCase()!==state.color)el.value=state.color;});
 document.querySelectorAll('#appearanceHex').forEach(el=>{el.textContent=state.color;});
 document.querySelectorAll('[data-theme-swatch]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.themeSwatch===state.color)));
}
document.addEventListener('click',event=>{
 const style=event.target.closest('button[data-connect-style]');if(style){setStyle(style.dataset.connectStyle);return;}
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
window.entreTheme={read:()=>({...state}),setMode,setStyle,setColor,renderControls,syncControls,PRESETS};
apply();
})();
